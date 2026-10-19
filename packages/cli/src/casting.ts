import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ensureDir } from "./fs-utils.js";
import { squadDir } from "./paths.js";
import { readRoster, writeRoster, type RosterRow } from "./team-md.js";

export type CastingRegistry = {
  names: Record<string, { displayName: string; role: string; theme?: string }>;
};

export type CastingPolicy = {
  theme: string;
  persistNames: boolean;
  allowUserOverrides: boolean;
};

export type CastingHistory = {
  universes: string[];
  assignments: Array<{ at: string; agent: string; displayName: string; theme: string }>;
};

const THEMES: Record<string, string[]> = {
  default: ["Ripley", "Bishop", "Hicks", "Hudson", "Vasquez", "Apone", "Newt", "Gorman"],
  flight: ["CAPCOM", "EECOM", "FIDO", "GUIDO", "INCO", "NETWORK", "Flight"],
  orchestra: ["Maestro", "Concertmaster", "Principal", "Section", "Librarian", "Tuner"],
};

function castingDir(projectRoot: string): string {
  return join(squadDir(projectRoot), "casting");
}

export function readRegistry(projectRoot: string): CastingRegistry {
  const path = join(castingDir(projectRoot), "registry.json");
  if (!existsSync(path)) return { names: {} };
  return JSON.parse(readFileSync(path, "utf8")) as CastingRegistry;
}

export function writeRegistry(projectRoot: string, registry: CastingRegistry): void {
  ensureDir(castingDir(projectRoot));
  writeFileSync(join(castingDir(projectRoot), "registry.json"), JSON.stringify(registry, null, 2) + "\n");
}

export function readPolicy(projectRoot: string): CastingPolicy {
  const path = join(castingDir(projectRoot), "policy.json");
  if (!existsSync(path)) {
    return { theme: "default", persistNames: true, allowUserOverrides: true };
  }
  return JSON.parse(readFileSync(path, "utf8")) as CastingPolicy;
}

export function writePolicy(projectRoot: string, policy: CastingPolicy): void {
  ensureDir(castingDir(projectRoot));
  writeFileSync(join(castingDir(projectRoot), "policy.json"), JSON.stringify(policy, null, 2) + "\n");
}

export function readHistory(projectRoot: string): CastingHistory {
  const path = join(castingDir(projectRoot), "history.json");
  if (!existsSync(path)) return { universes: [], assignments: [] };
  return JSON.parse(readFileSync(path, "utf8")) as CastingHistory;
}

export function writeHistory(projectRoot: string, history: CastingHistory): void {
  ensureDir(castingDir(projectRoot));
  writeFileSync(join(castingDir(projectRoot), "history.json"), JSON.stringify(history, null, 2) + "\n");
}

function pickName(theme: string, used: Set<string>): string {
  const pool = THEMES[theme] ?? THEMES.default;
  for (const name of pool) {
    if (!used.has(name.toLowerCase())) return name;
  }
  let i = 1;
  while (used.has(`agent-${i}`)) i += 1;
  return `Agent-${i}`;
}

export type CastResult = {
  theme: string;
  assignments: Array<{ agent: string; role: string; displayName: string }>;
  messages: string[];
};

/** Assign thematic display names to current roster agents; persist in casting registry. */
export function castTeam(
  projectRoot: string,
  options: { theme?: string; force?: boolean } = {},
): CastResult {
  const policy = readPolicy(projectRoot);
  const theme = options.theme ?? policy.theme ?? "default";
  if (options.theme) {
    writePolicy(projectRoot, { ...policy, theme });
  }

  const roster = readRoster(projectRoot);
  const registry = readRegistry(projectRoot);
  const history = readHistory(projectRoot);
  const used = new Set(
    Object.values(registry.names).map((n) => n.displayName.toLowerCase()),
  );

  const assignments: CastResult["assignments"] = [];
  const messages: string[] = [];

  for (const row of roster) {
    if (row.agent === "scribe" && registry.names.scribe && !options.force) {
      assignments.push({
        agent: row.agent,
        role: row.role,
        displayName: registry.names.scribe.displayName,
      });
      continue;
    }
    if (registry.names[row.agent] && !options.force) {
      assignments.push({
        agent: row.agent,
        role: row.role,
        displayName: registry.names[row.agent].displayName,
      });
      continue;
    }
    const displayName = pickName(theme, used);
    used.add(displayName.toLowerCase());
    registry.names[row.agent] = { displayName, role: row.role, theme };
    history.assignments.push({
      at: new Date().toISOString(),
      agent: row.agent,
      displayName,
      theme,
    });
    assignments.push({ agent: row.agent, role: row.role, displayName });
    messages.push(`Cast ${row.role} (${row.agent}) as ${displayName}`);
  }

  if (!history.universes.includes(theme)) history.universes.push(theme);
  writeRegistry(projectRoot, registry);
  writeHistory(projectRoot, history);

  // Annotate team.md notes with cast names
  const annotated: RosterRow[] = roster.map((r) => ({
    ...r,
    role: `${r.role}`,
  }));
  const castNotes = assignments
    .map((a) => `- ${a.role} (\`${a.agent}\`) → **${a.displayName}**`)
    .join("\n");
  writeRoster(
    projectRoot,
    annotated,
    `Cast theme: ${theme}\n\n${castNotes}\n\n- Use display names in chat (@${assignments[0]?.displayName ?? "Name"}); directory keys stay stable.`,
  );

  return { theme, assignments, messages };
}

export function setCastName(
  projectRoot: string,
  agentId: string,
  displayName: string,
): void {
  const registry = readRegistry(projectRoot);
  const roster = readRoster(projectRoot);
  const row = roster.find((r) => r.agent === agentId);
  const policy = readPolicy(projectRoot);
  registry.names[agentId] = {
    displayName,
    role: row?.role ?? agentId,
    theme: policy.theme,
  };
  writeRegistry(projectRoot, registry);
  const history = readHistory(projectRoot);
  history.assignments.push({
    at: new Date().toISOString(),
    agent: agentId,
    displayName,
    theme: policy.theme,
  });
  writeHistory(projectRoot, history);
}
