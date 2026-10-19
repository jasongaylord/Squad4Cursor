import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ensureDir } from "./fs-utils.js";
import { squadDir } from "./paths.js";

export type RosterRow = {
  role: string;
  agent: string;
  status: string;
};

const ROW_RE = /^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$/;

export function parseTeamMd(contents: string): RosterRow[] {
  const rows: RosterRow[] = [];
  for (const line of contents.split(/\r?\n/)) {
    const m = line.match(ROW_RE);
    if (!m) continue;
    const role = m[1].trim();
    const agent = m[2].trim();
    const status = m[3].trim();
    if (/^role$/i.test(role)) continue;
    if (/^[-:]+$/.test(role.replace(/\s/g, ""))) continue;
    if (role.includes("---")) continue;
    rows.push({ role, agent, status });
  }
  return rows;
}

export function renderTeamMd(rows: RosterRow[], notes?: string): string {
  const body = rows
    .map((r) => `| ${r.role} | ${r.agent} | ${r.status} |`)
    .join("\n");
  return `# Team Roster

| Role | Agent | Status |
| --- | --- | --- |
${body}

## Notes

${notes?.trim() || "- Managed by Squad4Cursor (`s4c hire` / `s4c retire` / casting)."}
`;
}

export function readRoster(projectRoot: string): RosterRow[] {
  const path = join(squadDir(projectRoot), "team.md");
  if (!existsSync(path)) return [];
  return parseTeamMd(readFileSync(path, "utf8"));
}

export function writeRoster(projectRoot: string, rows: RosterRow[], notes?: string): void {
  const path = join(squadDir(projectRoot), "team.md");
  ensureDir(squadDir(projectRoot));
  writeFileSync(path, renderTeamMd(rows, notes), "utf8");
}

export function upsertRosterRow(rows: RosterRow[], row: RosterRow): RosterRow[] {
  const idx = rows.findIndex((r) => r.agent === row.agent || r.role.toLowerCase() === row.role.toLowerCase());
  if (idx >= 0) {
    const next = [...rows];
    next[idx] = row;
    return next;
  }
  return [...rows, row];
}

export function removeRosterAgent(rows: RosterRow[], agentId: string): RosterRow[] {
  return rows.filter((r) => r.agent !== agentId);
}
