import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { readConfig } from "./config.js";
import { ensureDir } from "./fs-utils.js";
import { squadDir } from "./paths.js";

export type InboxItem = {
  file: string;
  title: string;
  body: string;
};

export function listInbox(projectRoot: string): InboxItem[] {
  const inbox = join(squadDir(projectRoot), "decisions", "inbox");
  if (!existsSync(inbox)) return [];
  return readdirSync(inbox)
    .filter((n) => n.endsWith(".md"))
    .sort()
    .map((name) => {
      const body = readFileSync(join(inbox, name), "utf8");
      const title = body.split(/\r?\n/).find((l) => l.trim())?.replace(/^#\s*/, "") ?? name;
      return { file: name, title, body };
    });
}

export type ProcessInboxResult = {
  processed: string[];
  messages: string[];
};

/** Move inbox markdown into decisions.md as proposed entries, archive inbox files. */
export function processInbox(projectRoot: string, options: { dryRun?: boolean } = {}): ProcessInboxResult {
  const items = listInbox(projectRoot);
  const messages: string[] = [];
  const processed: string[] = [];
  if (items.length === 0) {
    return { processed, messages: ["Decision inbox is empty."] };
  }

  const decisionsPath = join(squadDir(projectRoot), "decisions.md");
  let decisions = existsSync(decisionsPath) ? readFileSync(decisionsPath, "utf8") : "# Decisions\n\n";
  const archive = join(squadDir(projectRoot), "decisions", "inbox", "_processed");
  const date = new Date().toISOString().slice(0, 10);

  for (const item of items) {
    const entry = [
      "",
      `### ${date} — ${item.title} (from inbox)`,
      "- **Status**: proposed",
      "- **Owners**: inbox",
      "- **Context**: promoted from `.squad/decisions/inbox/`",
      "- **Decision**:",
      "",
      item.body.trim(),
      "",
    ].join("\n");
    decisions += entry;
    processed.push(item.file);
    messages.push(`${options.dryRun ? "[dry-run] Would process" : "Processed"} ${item.file}`);
    if (!options.dryRun) {
      ensureDir(archive);
      renameSync(
        join(squadDir(projectRoot), "decisions", "inbox", item.file),
        join(archive, item.file),
      );
    }
  }

  if (!options.dryRun) {
    writeFileSync(decisionsPath, decisions, "utf8");
  }

  return { processed, messages };
}

export type LockoutRecord = {
  at: string;
  rejectedAgent: string;
  reviewer: string;
  reason: string;
  assignedTo?: string;
};

export function recordLockout(projectRoot: string, record: LockoutRecord): string {
  const dir = join(squadDir(projectRoot), "orchestration-log");
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = join(dir, `${stamp}-lockout.md`);
  const body = `# Reviewer lockout

- **At**: ${record.at}
- **Rejected agent**: ${record.rejectedAgent}
- **Reviewer**: ${record.reviewer}
- **Assigned fix to**: ${record.assignedTo ?? "(unassigned)"}
- **Reason**: ${record.reason}

Coordinator must not assign \`${record.rejectedAgent}\` to revise this rejection.
`;
  writeFileSync(file, body, "utf8");
  return file;
}

export function isPathProtected(projectRoot: string, relativePath: string): boolean {
  const config = readConfig(projectRoot);
  const protectedPaths = config.governance?.protectedPaths ?? [];
  const normalized = relativePath.replace(/\\/g, "/");
  return protectedPaths.some(
    (p) => normalized === p || normalized.startsWith(p.replace(/\/?$/, "/")) || normalized.startsWith(p),
  );
}

export function writeGovernanceReadme(projectRoot: string): string {
  const path = join(squadDir(projectRoot), "governance.md");
  const config = readConfig(projectRoot);
  const body = `# Governance

Enforced by Squad4Cursor coordinator skills and CLI helpers.

## Reviewer lockout

${config.governance?.reviewerLockout === false ? "Disabled" : "Enabled"} — when Tester or Lead rejects work, a *different* agent must fix it. Use \`s4c lockout\` to record.

## Protected paths

${(config.governance?.protectedPaths ?? []).map((p) => `- \`${p}\``).join("\n") || "(none)"}

Agents should not rewrite protected team-memory paths except via Scribe/coordinator protocols.

## Decision inbox

Drop proposed decisions in \`.squad/decisions/inbox/*.md\`, then run:

\`\`\`bash
s4c inbox process
\`\`\`
`;
  writeFileSync(path, body, "utf8");
  return path;
}
