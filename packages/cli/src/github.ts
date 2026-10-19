import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ensureDir } from "./fs-utils.js";
import { squadDir } from "./paths.js";

export type GhIssue = {
  number: number;
  title: string;
  body: string;
  labels: string[];
  url: string;
};

export type TriageResult = {
  ok: boolean;
  issues: GhIssue[];
  detail: string;
};

function gh(args: string[], cwd: string): { ok: boolean; stdout: string; stderr: string } {
  const result = spawnSync("gh", args, {
    cwd,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (result.error) {
    return { ok: false, stdout: "", stderr: result.error.message };
  }
  return {
    ok: result.status === 0,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

export function ghAvailable(cwd: string): boolean {
  const r = gh(["auth", "status"], cwd);
  const text = `${r.stdout}\n${r.stderr}`;
  return text.includes("Logged in") || r.ok;
}

export async function triageIssues(projectRoot: string): Promise<TriageResult> {
  if (!ghAvailable(projectRoot)) {
    return {
      ok: false,
      issues: [],
      detail: "gh not authenticated. Run: gh auth login",
    };
  }

  const listed = gh(
    [
      "issue",
      "list",
      "--limit",
      "20",
      "--json",
      "number,title,body,labels,url",
      "--state",
      "open",
    ],
    projectRoot,
  );
  if (!listed.ok) {
    return { ok: false, issues: [], detail: listed.stderr || listed.stdout };
  }

  type Raw = {
    number: number;
    title: string;
    body: string;
    labels: Array<{ name: string }>;
    url: string;
  };
  const raw = JSON.parse(listed.stdout || "[]") as Raw[];
  const issues: GhIssue[] = raw.map((i) => ({
    number: i.number,
    title: i.title,
    body: i.body ?? "",
    labels: (i.labels ?? []).map((l) => l.name),
    url: i.url,
  }));

  const logDir = join(squadDir(projectRoot), "orchestration-log");
  mkdirSync(logDir, { recursive: true });
  writeFileSync(
    join(logDir, `${new Date().toISOString().replace(/[:.]/g, "-")}-triage.json`),
    JSON.stringify(issues, null, 2),
    "utf8",
  );

  return { ok: true, issues, detail: `${issues.length} open issue(s)` };
}

export type WorkIssueResult = {
  ok: boolean;
  message: string;
  promptFile?: string;
};

/** Materialize a work prompt for issue N for the coordinator / cursor-agent. */
export function workOnIssue(projectRoot: string, issueNumber: number): WorkIssueResult {
  if (!ghAvailable(projectRoot)) {
    return { ok: false, message: "gh not authenticated. Run: gh auth login" };
  }
  const viewed = gh(
    ["issue", "view", String(issueNumber), "--json", "number,title,body,labels,url"],
    projectRoot,
  );
  if (!viewed.ok) {
    return { ok: false, message: viewed.stderr || viewed.stdout };
  }
  const issue = JSON.parse(viewed.stdout) as {
    number: number;
    title: string;
    body: string;
    labels: Array<{ name: string }>;
    url: string;
  };

  const scratch = join(squadDir(projectRoot), "watch-scratch");
  ensureDir(scratch);
  const promptFile = join(scratch, `issue-${issue.number}.md`);
  const prompt = `# Work on GitHub issue #${issue.number}

URL: ${issue.url}
Title: ${issue.title}
Labels: ${(issue.labels ?? []).map((l) => l.name).join(", ") || "(none)"}

## Body
${issue.body || "(empty)"}

## Squad instructions
1. Lead clarifies acceptance criteria against .squad/decisions.md
2. Spawn Frontend/Backend/Tester as needed (parallel when independent)
3. Enforce reviewer lockout
4. Open a PR with gh that references #${issue.number}
5. Scribe logs decisions
`;
  writeFileSync(promptFile, prompt, "utf8");
  return {
    ok: true,
    message: `Prepared work prompt for #${issue.number}`,
    promptFile,
  };
}

export function createIssueFromItem(
  projectRoot: string,
  title: string,
  body: string,
  labels: string[] = ["squad"],
): { ok: boolean; url?: string; detail: string } {
  if (!ghAvailable(projectRoot)) {
    return { ok: false, detail: "gh not authenticated" };
  }
  const args = ["issue", "create", "--title", title, "--body", body];
  for (const label of labels) {
    args.push("--label", label);
  }
  const result = gh(args, projectRoot);
  if (!result.ok) {
    // retry without labels if label missing
    const retry = gh(["issue", "create", "--title", title, "--body", body], projectRoot);
    return {
      ok: retry.ok,
      url: retry.ok ? retry.stdout.trim() : undefined,
      detail: retry.ok ? retry.stdout.trim() : retry.stderr || result.stderr,
    };
  }
  return { ok: true, url: result.stdout.trim(), detail: result.stdout.trim() };
}

export function ensureGh(projectRoot: string): boolean {
  return existsSync(projectRoot) && ghAvailable(projectRoot);
}
