import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readConfig } from "./config.js";
import { ensureDir } from "./fs-utils.js";
import { triageIssues, type TriageResult } from "./github.js";
import { squadDir } from "./paths.js";

export type WatchOptions = {
  intervalMinutes?: number;
  execute?: boolean;
  agentCmd?: string;
  dryRun?: boolean;
  once?: boolean;
};

type WatchState = {
  pid?: number;
  startedAt?: string;
  lastPoll?: string;
  round: number;
  lastTriage?: TriageResult;
};

function statePath(projectRoot: string): string {
  return join(squadDir(projectRoot), "watch-state.json");
}

function stopSentinel(projectRoot: string): string {
  return join(squadDir(projectRoot), "ralph-stop");
}

function pidPath(projectRoot: string): string {
  return join(squadDir(projectRoot), "watch.pid");
}

export function readWatchState(projectRoot: string): WatchState {
  const path = statePath(projectRoot);
  if (!existsSync(path)) return { round: 0 };
  return JSON.parse(readFileSync(path, "utf8")) as WatchState;
}

function writeWatchState(projectRoot: string, state: WatchState): void {
  ensureDir(squadDir(projectRoot));
  writeFileSync(statePath(projectRoot), JSON.stringify(state, null, 2) + "\n", "utf8");
}

function buildPrompt(projectRoot: string, triage: TriageResult): string {
  const decisions = join(squadDir(projectRoot), "decisions.md");
  const decisionSlice = existsSync(decisions)
    ? readFileSync(decisions, "utf8").slice(0, 4000)
    : "(no decisions yet)";
  return `# Ralph / Watch work context

Project: ${projectRoot}

## Available issues
${triage.issues.map((i) => `- #${i.number} ${i.title} (${i.labels.join(", ") || "no labels"})`).join("\n") || "(none)"}

## Recent decisions (slice)
${decisionSlice}

## Instructions
Pick the highest-priority actionable issue. Implement with Squad team protocols (.squad/).
Open a PR when ready. Escalate blockers to humans.
`;
}

function dispatchAgent(projectRoot: string, prompt: string, agentCmd?: string): void {
  const scratch = join(squadDir(projectRoot), "watch-scratch");
  mkdirSync(scratch, { recursive: true });
  const promptFile = join(scratch, `prompt-${Date.now()}.md`);
  writeFileSync(promptFile, prompt, "utf8");

  if (agentCmd) {
    const cmd = agentCmd.includes("{prompt}")
      ? agentCmd.replace("{prompt}", promptFile)
      : `${agentCmd} ${promptFile}`;
    spawn(cmd, { shell: true, cwd: projectRoot, stdio: "inherit", detached: true }).unref();
    return;
  }

  // Prefer cursor-agent if present, else print path for human
  const cursor = spawn(
    "cursor-agent",
    ["-p", promptFile, "--trust", "--approve-mcps", "--force"],
    { cwd: projectRoot, stdio: "ignore", detached: true, shell: true },
  );
  cursor.on("error", () => {
    writeFileSync(
      join(scratch, "LAST_PROMPT.txt"),
      `cursor-agent not found. Prompt written to ${promptFile}\n`,
      "utf8",
    );
  });
  cursor.unref();
}

export async function runWatchRound(
  projectRoot: string,
  options: WatchOptions,
): Promise<WatchState> {
  const state = readWatchState(projectRoot);
  state.round += 1;
  state.lastPoll = new Date().toISOString();
  const triage = await triageIssues(projectRoot);
  state.lastTriage = triage;

  const prompt = buildPrompt(projectRoot, triage);
  const logDir = join(squadDir(projectRoot), "orchestration-log");
  mkdirSync(logDir, { recursive: true });
  writeFileSync(
    join(logDir, `${new Date().toISOString().replace(/[:.]/g, "-")}-watch-round.md`),
    prompt,
    "utf8",
  );

  if (options.execute && triage.issues.length > 0 && !options.dryRun) {
    dispatchAgent(projectRoot, prompt, options.agentCmd);
  }

  writeWatchState(projectRoot, state);
  return state;
}

export function requestWatchStop(projectRoot: string): void {
  writeFileSync(stopSentinel(projectRoot), "stop\n", "utf8");
}

export function watchHealth(projectRoot: string): string {
  const state = readWatchState(projectRoot);
  const pidFile = pidPath(projectRoot);
  const pid = existsSync(pidFile) ? readFileSync(pidFile, "utf8").trim() : "(not running)";
  return [
    "Ralph Watch Status",
    "",
    `PID: ${pid}`,
    `Round: ${state.round}`,
    `Last poll: ${state.lastPoll ?? "(never)"}`,
    `Last issues: ${state.lastTriage?.issues.length ?? 0}`,
    `Stop sentinel: ${existsSync(stopSentinel(projectRoot)) ? "SET" : "clear"}`,
  ].join("\n");
}

/** Blocking poll loop (CLI). Use --once for a single round. */
export async function startWatch(projectRoot: string, options: WatchOptions): Promise<void> {
  const config = readConfig(projectRoot);
  const intervalMs = (options.intervalMinutes ?? config.watch?.intervalMinutes ?? 10) * 60 * 1000;

  writeFileSync(pidPath(projectRoot), String(process.pid), "utf8");
  const state = readWatchState(projectRoot);
  state.pid = process.pid;
  state.startedAt = new Date().toISOString();
  writeWatchState(projectRoot, state);

  const cleanup = (): void => {
    try {
      unlinkSync(pidPath(projectRoot));
    } catch {
      /* ignore */
    }
  };
  process.on("exit", cleanup);
  process.on("SIGINT", () => {
    requestWatchStop(projectRoot);
    cleanup();
    process.exit(0);
  });

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (existsSync(stopSentinel(projectRoot))) {
      try {
        unlinkSync(stopSentinel(projectRoot));
      } catch {
        /* ignore */
      }
      console.log("Stop sentinel detected — exiting watch.");
      cleanup();
      return;
    }

    const round = await runWatchRound(projectRoot, options);
    console.log(
      `Round ${round.round}: ${round.lastTriage?.issues.length ?? 0} issue(s)` +
        (options.execute ? " (execute enabled)" : " (triage only)"),
    );

    if (options.once) {
      cleanup();
      return;
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }
}
