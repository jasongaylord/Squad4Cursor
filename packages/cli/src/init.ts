import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  copyFileSafe,
  copyTreeIfMissing,
  ensureDir,
  pathExists,
  syncCursorAdapters,
} from "./fs-utils.js";
import { resolveTemplatesRoot, squadDir } from "./paths.js";

export type InitOptions = {
  projectRoot: string;
  preset?: "default" | null;
  withOpenspec?: boolean;
  withSpeckit?: boolean;
  forceCursor?: boolean;
};

export type InitResult = {
  createdSquad: boolean;
  attachedCursor: boolean;
  presetApplied: boolean;
  messages: string[];
  warnings: string[];
};

function copySquadBase(templatesRoot: string, projectRoot: string): boolean {
  const dest = squadDir(projectRoot);
  const existed = pathExists(dest);
  const src = join(templatesRoot, "squad");

  // Top-level squad files/dirs excluding presets
  const entries = [
    "config.json",
    "team.md",
    "routing.md",
    "decisions.md",
    "ceremonies.md",
    "identity",
    "agents",
    "casting",
    "skills",
    "decisions",
    "log",
    "orchestration-log",
  ];

  ensureDir(dest);

  for (const entry of entries) {
    const from = join(src, entry);
    const to = join(dest, entry);
    if (!existsSync(from)) continue;
    if (entry === "agents") {
      // Only ensure scribe; never wipe other agents
      const scribeSrc = join(from, "scribe");
      const scribeDest = join(to, "scribe");
      if (existsSync(scribeSrc)) {
        copyTreeIfMissing(scribeSrc, scribeDest);
        // Ensure charter exists; skip non-empty history
        copyFileSafe(join(scribeSrc, "charter.md"), join(scribeDest, "charter.md"), {
          overwrite: false,
        });
        copyFileSafe(join(scribeSrc, "history.md"), join(scribeDest, "history.md"), {
          overwrite: false,
          skipIfDestNonEmpty: true,
        });
      }
      continue;
    }
    if (entry === "config.json" || entry.endsWith(".md")) {
      copyFileSafe(from, to, { overwrite: false });
      continue;
    }
    // directories
    copyTreeIfMissing(from, to);
  }

  // Marker for Squad4Cursor without breaking Brady Squad
  const marker = join(dest, "squad4cursor.json");
  if (!existsSync(marker)) {
    writeFileSync(
      marker,
      JSON.stringify(
        {
          version: "0.1.0",
          attachedAt: new Date().toISOString(),
        },
        null,
        2,
      ) + "\n",
      "utf8",
    );
  }

  return !existed;
}

function applyDefaultPreset(templatesRoot: string, projectRoot: string): void {
  const presetRoot = join(templatesRoot, "squad", "presets", "default");
  const dest = squadDir(projectRoot);

  copyFileSafe(join(presetRoot, "team.md"), join(dest, "team.md"), { overwrite: true });
  copyFileSafe(join(presetRoot, "routing.md"), join(dest, "routing.md"), { overwrite: true });

  const agentsSrc = join(presetRoot, "agents");
  const agentsDest = join(dest, "agents");
  ensureDir(agentsDest);

  for (const agent of ["lead", "frontend", "backend", "tester"]) {
    const from = join(agentsSrc, agent);
    const to = join(agentsDest, agent);
    ensureDir(to);
    copyFileSafe(join(from, "charter.md"), join(to, "charter.md"), { overwrite: false });
    copyFileSafe(join(from, "history.md"), join(to, "history.md"), {
      overwrite: false,
      skipIfDestNonEmpty: true,
    });
  }
}

function tryRun(command: string, args: string[], cwd: string): { ok: boolean; detail: string } {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (result.error) {
    return { ok: false, detail: result.error.message };
  }
  if (result.status !== 0) {
    return {
      ok: false,
      detail: (result.stderr || result.stdout || `exit ${result.status}`).trim(),
    };
  }
  return { ok: true, detail: (result.stdout || "").trim() };
}

export function initProject(options: InitOptions): InitResult {
  const messages: string[] = [];
  const warnings: string[] = [];
  const templatesRoot = resolveTemplatesRoot();
  const projectRoot = options.projectRoot;

  mkdirSync(projectRoot, { recursive: true });

  const createdSquad = copySquadBase(templatesRoot, projectRoot);
  messages.push(
    createdSquad
      ? "Created .squad/ (Scribe-only bootstrap)."
      : "Found existing .squad/ — preserved team state; ensured missing base files.",
  );

  let presetApplied = false;
  if (options.preset === "default") {
    applyDefaultPreset(templatesRoot, projectRoot);
    presetApplied = true;
    messages.push("Applied default preset (Lead, Frontend, Backend, Tester + Scribe).");
  }

  const cursorTouched = syncCursorAdapters(join(templatesRoot, "cursor"), projectRoot);
  messages.push(
    cursorTouched.length > 0
      ? `Installed/refreshed Cursor adapters (${cursorTouched.length} files).`
      : "Cursor adapters already up to date.",
  );

  // Never remove Copilot agent definition
  if (pathExists(join(projectRoot, ".github", "agents", "squad.agent.md"))) {
    messages.push("Detected Copilot squad.agent.md — left untouched for dual-runtime use.");
  }

  if (options.withOpenspec) {
    const probe = tryRun("openspec", ["--version"], projectRoot);
    if (!probe.ok) {
      warnings.push(
        "OpenSpec CLI not found. Install with: npm i -g @fission-ai/openspec@latest then run openspec init --tools cursor",
      );
    } else {
      const run = tryRun("openspec", ["init", "--tools", "cursor"], projectRoot);
      if (run.ok) {
        messages.push("Ran openspec init --tools cursor.");
      } else {
        warnings.push(`openspec init failed: ${run.detail}`);
      }
    }
  }

  if (options.withSpeckit) {
    const probe = tryRun("specify", ["version"], projectRoot);
    if (!probe.ok) {
      warnings.push(
        "Spec Kit CLI (specify) not found. Install specify-cli, then: specify integration install cursor-agent",
      );
    } else {
      const run = tryRun("specify", ["integration", "install", "cursor-agent"], projectRoot);
      if (run.ok) {
        messages.push("Ran specify integration install cursor-agent.");
      } else {
        warnings.push(`specify integration install failed: ${run.detail}`);
      }
    }
  }

  return {
    createdSquad,
    attachedCursor: true,
    presetApplied,
    messages,
    warnings,
  };
}
