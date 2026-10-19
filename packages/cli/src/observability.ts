import { appendFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ensureDir } from "./fs-utils.js";
import { squadDir } from "./paths.js";

export type ObsEvent = {
  at: string;
  type: string;
  message: string;
  meta?: Record<string, unknown>;
};

function eventsPath(projectRoot: string): string {
  return join(squadDir(projectRoot), "observability", "events.jsonl");
}

export function logEvent(projectRoot: string, type: string, message: string, meta?: Record<string, unknown>): void {
  const dir = join(squadDir(projectRoot), "observability");
  ensureDir(dir);
  const event: ObsEvent = { at: new Date().toISOString(), type, message, meta };
  appendFileSync(eventsPath(projectRoot), JSON.stringify(event) + "\n", "utf8");
}

export function initObservability(projectRoot: string): string {
  const dir = join(squadDir(projectRoot), "observability");
  mkdirSync(dir, { recursive: true });
  const readme = join(dir, "README.md");
  if (!existsSync(readme)) {
    writeFileSync(
      readme,
      `# Observability

Squad4Cursor records lightweight JSONL events in \`events.jsonl\` for local inspection.

Cursor does not require Aspire; use this folder + \`.squad/orchestration-log/\` for session trails.

\`\`\`bash
s4c observe ping
\`\`\`
`,
      "utf8",
    );
  }
  logEvent(projectRoot, "observability.init", "Observability folder ready");
  return dir;
}
