import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { listAgentDirs } from "./fs-utils.js";
import { squadDir } from "./paths.js";

const SOFT_LIMIT = 12 * 1024;
const DEEP_LIMIT = 6 * 1024;

export type NapOptions = {
  deep?: boolean;
  dryRun?: boolean;
};

export type NapResult = {
  messages: string[];
  changed: string[];
};

function compressHistory(contents: string, limit: number): { next: string; compressed: boolean } {
  if (Buffer.byteLength(contents, "utf8") <= limit) {
    return { next: contents, compressed: false };
  }

  const lines = contents.split(/\r?\n/);
  const header: string[] = [];
  const rest: string[] = [];
  let inHeader = true;
  for (const line of lines) {
    if (inHeader && (line.startsWith("#") || line.trim() === "" || line.startsWith("## Project"))) {
      header.push(line);
      if (line.startsWith("## Recent") || line.startsWith("## Archive")) inHeader = false;
      continue;
    }
    inHeader = false;
    rest.push(line);
  }

  const summaryBullets = rest
    .filter((l) => l.trim().startsWith("-") || l.trim().startsWith("*"))
    .slice(0, 40)
    .map((l) => l.trim());

  const archiveBlock = [
    "",
    "## Archive summary",
    "",
    `Compressed on ${new Date().toISOString().slice(0, 10)} (${rest.length} lines folded).`,
    ...summaryBullets,
    "",
    "## Recent sessions",
    "",
    "(see git history for full pre-nap detail)",
    "",
  ].join("\n");

  const next = `${header.filter(Boolean).join("\n").trim()}\n${archiveBlock}`;
  return { next, compressed: true };
}

function pruneOldLogs(logDir: string, keepDays: number, dryRun: boolean): string[] {
  const changed: string[] = [];
  if (!existsSync(logDir)) return changed;
  const cutoff = Date.now() - keepDays * 24 * 60 * 60 * 1000;
  const archive = join(logDir, "_archive");
  for (const name of readdirSync(logDir)) {
    if (name.startsWith("_")) continue;
    const full = join(logDir, name);
    const st = statSync(full);
    if (!st.isFile()) continue;
    if (st.mtimeMs < cutoff) {
      changed.push(full);
      if (!dryRun) {
        mkdirSync(archive, { recursive: true });
        renameSync(full, join(archive, name));
      }
    }
  }
  return changed;
}

export function runNap(projectRoot: string, options: NapOptions = {}): NapResult {
  const limit = options.deep ? DEEP_LIMIT : SOFT_LIMIT;
  const messages: string[] = [];
  const changed: string[] = [];
  const agentsRoot = join(squadDir(projectRoot), "agents");
  const agents = listAgentDirs(agentsRoot);

  for (const agent of agents) {
    const historyPath = join(agentsRoot, agent, "history.md");
    if (!existsSync(historyPath)) continue;
    const current = readFileSync(historyPath, "utf8");
    const { next, compressed } = compressHistory(current, limit);
    if (compressed) {
      changed.push(historyPath);
      if (!options.dryRun) writeFileSync(historyPath, next, "utf8");
      messages.push(
        `${options.dryRun ? "[dry-run] Would compress" : "Compressed"} ${agent}/history.md`,
      );
    }
  }

  const wisdomPath = join(squadDir(projectRoot), "identity", "wisdom.md");
  if (existsSync(wisdomPath)) {
    const current = readFileSync(wisdomPath, "utf8");
    const { next, compressed } = compressHistory(current, options.deep ? DEEP_LIMIT : SOFT_LIMIT * 2);
    if (compressed) {
      changed.push(wisdomPath);
      if (!options.dryRun) writeFileSync(wisdomPath, next, "utf8");
      messages.push(`${options.dryRun ? "[dry-run] Would compress" : "Compressed"} identity/wisdom.md`);
    }
  }

  const logPruned = pruneOldLogs(
    join(squadDir(projectRoot), "log"),
    options.deep ? 14 : 30,
    Boolean(options.dryRun),
  );
  const orchPruned = pruneOldLogs(
    join(squadDir(projectRoot), "orchestration-log"),
    options.deep ? 14 : 30,
    Boolean(options.dryRun),
  );
  for (const p of [...logPruned, ...orchPruned]) {
    changed.push(p);
    messages.push(`${options.dryRun ? "[dry-run] Would archive" : "Archived"} ${p}`);
  }

  if (messages.length === 0) {
    messages.push("Nothing to nap — histories and logs within budget.");
  } else if (options.dryRun) {
    messages.unshift(`Dry run (limit ${limit} bytes). No files modified.`);
  } else {
    messages.unshift(`Nap complete (${options.deep ? "deep" : "standard"}).`);
  }

  return { messages, changed };
}
