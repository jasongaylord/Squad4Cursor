import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { ensureDir, listAgentDirs } from "./fs-utils.js";
import { squadDir } from "./paths.js";

export type SquadSnapshot = {
  format: "squad4cursor-export";
  version: number;
  exportedAt: string;
  files: Record<string, string>;
};

function collectFiles(root: string, base: string, out: Record<string, string>): void {
  if (!existsSync(root)) return;
  for (const name of readdirSync(root)) {
    if (name === "log" || name === "orchestration-log" || name === "_archive") continue;
    const full = join(root, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === "_alumni") {
        collectFiles(full, base, out);
        continue;
      }
      collectFiles(full, base, out);
    } else {
      const rel = relative(base, full).replace(/\\/g, "/");
      out[rel] = readFileSync(full, "utf8");
    }
  }
}

export function exportSquad(projectRoot: string, outFile: string): { file: string; count: number } {
  const base = squadDir(projectRoot);
  if (!existsSync(base)) {
    throw new Error("No .squad/ directory to export");
  }
  const files: Record<string, string> = {};
  collectFiles(base, base, files);
  const snapshot: SquadSnapshot = {
    format: "squad4cursor-export",
    version: 1,
    exportedAt: new Date().toISOString(),
    files,
  };
  ensureDir(dirname(outFile));
  writeFileSync(outFile, JSON.stringify(snapshot, null, 2) + "\n", "utf8");
  return { file: outFile, count: Object.keys(files).length };
}

export type ImportOptions = {
  /** If true, overwrite existing files */
  force?: boolean;
};

export function importSquad(
  projectRoot: string,
  inFile: string,
  options: ImportOptions = {},
): { written: number; skipped: number } {
  const raw = JSON.parse(readFileSync(inFile, "utf8")) as SquadSnapshot;
  if (raw.format !== "squad4cursor-export") {
    throw new Error("Not a Squad4Cursor export file");
  }
  const base = squadDir(projectRoot);
  ensureDir(base);
  let written = 0;
  let skipped = 0;
  for (const [rel, contents] of Object.entries(raw.files)) {
    const dest = join(base, rel);
    if (existsSync(dest) && !options.force) {
      skipped += 1;
      continue;
    }
    ensureDir(dirname(dest));
    writeFileSync(dest, contents, "utf8");
    written += 1;
  }
  // sanity: ensure agents listed
  listAgentDirs(join(base, "agents"));
  return { written, skipped };
}

export function defaultExportPath(projectRoot: string): string {
  mkdirSync(projectRoot, { recursive: true });
  return join(projectRoot, `squad-export-${new Date().toISOString().slice(0, 10)}.json`);
}
