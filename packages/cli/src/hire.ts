import { existsSync, mkdirSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ensureDir, pathExists } from "./fs-utils.js";
import { squadDir } from "./paths.js";
import {
  readRoster,
  removeRosterAgent,
  upsertRosterRow,
  writeRoster,
} from "./team-md.js";

function agentDir(projectRoot: string, id: string): string {
  return join(squadDir(projectRoot), "agents", id);
}

function alumniDir(projectRoot: string): string {
  return join(squadDir(projectRoot), "agents", "_alumni");
}

function defaultCharter(role: string, id: string): string {
  return `# ${role}

## Role

${role} specialist for this project (id: \`${id}\`).

## Responsibilities

- Own work matching this role per \`.squad/routing.md\`
- Write durable learnings to \`history.md\`
- Defer outside-role work to the appropriate teammate

## Voice

Clear and concise.

## Isolation

Load only this charter, this history, and relevant slices of \`decisions.md\`.
`;
}

function defaultHistory(role: string): string {
  return `# ${role} History

## Project knowledge

(none yet)

## Recent sessions

(none yet)
`;
}

export type HireOptions = {
  id: string;
  role: string;
  charter?: string;
};

export type HireResult = { messages: string[] };

export function hireAgent(projectRoot: string, options: HireOptions): HireResult {
  const id = options.id.toLowerCase().replace(/[^a-z0-9-_]/g, "-");
  const dir = agentDir(projectRoot, id);
  ensureDir(dir);

  const charterPath = join(dir, "charter.md");
  const historyPath = join(dir, "history.md");
  if (!existsSync(charterPath)) {
    writeFileSync(charterPath, options.charter ?? defaultCharter(options.role, id), "utf8");
  }
  if (!existsSync(historyPath)) {
    writeFileSync(historyPath, defaultHistory(options.role), "utf8");
  }

  // Restore from alumni if present
  const alumniPath = join(alumniDir(projectRoot), id);
  if (pathExists(alumniPath) && !pathExists(join(dir, "history.md"))) {
    // already ensured history; skip
  }

  const roster = upsertRosterRow(readRoster(projectRoot), {
    role: options.role,
    agent: id,
    status: "active",
  });
  writeRoster(projectRoot, roster);

  // Ensure routing mentions role lightly
  const routingPath = join(squadDir(projectRoot), "routing.md");
  if (existsSync(routingPath)) {
    // leave routing to humans/coordinator; hire only guarantees roster + files
  }

  return { messages: [`Hired ${options.role} as \`${id}\` under .squad/agents/${id}/`] };
}

export type RetireResult = { messages: string[] };

export function retireAgent(projectRoot: string, agentId: string): RetireResult {
  const id = agentId.toLowerCase();
  if (id === "scribe") {
    throw new Error("Cannot retire the Scribe — it is required for team memory.");
  }
  const from = agentDir(projectRoot, id);
  if (!pathExists(from)) {
    throw new Error(`Agent not found: ${id}`);
  }
  const destRoot = alumniDir(projectRoot);
  ensureDir(destRoot);
  const dest = join(destRoot, id);
  if (pathExists(dest)) {
    const stamped = join(destRoot, `${id}-${Date.now()}`);
    renameSync(from, stamped);
  } else {
    renameSync(from, dest);
  }

  const roster = removeRosterAgent(readRoster(projectRoot), id);
  writeRoster(
    projectRoot,
    roster,
    `- Retired \`${id}\` moved to \`.squad/agents/_alumni/\` (knowledge preserved).\n- Re-hire with \`s4c hire\` if needed.`,
  );

  return {
    messages: [
      `Retired \`${id}\` → .squad/agents/_alumni/${id}/`,
      "Charter and history preserved.",
    ],
  };
}

export function restoreAlumni(projectRoot: string, agentId: string, role?: string): HireResult {
  const id = agentId.toLowerCase();
  const from = join(alumniDir(projectRoot), id);
  if (!pathExists(from)) {
    throw new Error(`No alumni agent named ${id}`);
  }
  const to = agentDir(projectRoot, id);
  if (pathExists(to)) {
    throw new Error(`Active agent ${id} already exists`);
  }
  mkdirSync(join(squadDir(projectRoot), "agents"), { recursive: true });
  renameSync(from, to);
  return hireAgent(projectRoot, { id, role: role ?? id });
}
