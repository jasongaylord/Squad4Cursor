import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";

export function ensureDir(path: string): void {
  mkdirSync(path, { recursive: true });
}

export function readText(path: string): string {
  return readFileSync(path, "utf8");
}

export function writeText(path: string, contents: string): void {
  ensureDir(dirname(path));
  writeFileSync(path, contents, "utf8");
}

/** Copy file only if destination missing, or if overwrite is true. Never overwrite non-empty history by default. */
export function copyFileSafe(
  src: string,
  dest: string,
  options: { overwrite?: boolean; skipIfDestNonEmpty?: boolean } = {},
): "written" | "skipped" | "overwritten" {
  const overwrite = options.overwrite ?? false;
  const skipIfDestNonEmpty = options.skipIfDestNonEmpty ?? false;

  if (existsSync(dest)) {
    if (skipIfDestNonEmpty) {
      const current = readFileSync(dest, "utf8").trim();
      if (current.length > 0 && !isPlaceholderHistory(current)) {
        return "skipped";
      }
    }
    if (!overwrite && !skipIfDestNonEmpty) {
      return "skipped";
    }
    if (!overwrite && skipIfDestNonEmpty) {
      // placeholder or empty — allow refresh
    } else if (!overwrite) {
      return "skipped";
    }
    copyFileSync(src, dest);
    return "overwritten";
  }

  ensureDir(dirname(dest));
  copyFileSync(src, dest);
  return "written";
}

function isPlaceholderHistory(contents: string): boolean {
  return (
    contents.includes("(none yet)") ||
    contents.includes("<!-- Decisions are appended below -->")
  );
}

export function pathExists(path: string): boolean {
  return existsSync(path);
}

export function listAgentDirs(agentsRoot: string): string[] {
  if (!existsSync(agentsRoot)) return [];
  return readdirSync(agentsRoot)
    .filter((name) => {
      if (name.startsWith("_")) return false;
      const full = join(agentsRoot, name);
      return statSync(full).isDirectory();
    })
    .sort();
}

export function copyTreeIfMissing(srcDir: string, destDir: string): string[] {
  const written: string[] = [];
  if (!existsSync(srcDir)) return written;

  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const src = join(dir, entry.name);
      const rel = relative(srcDir, src);
      const dest = join(destDir, rel);
      if (entry.isDirectory()) {
        ensureDir(dest);
        walk(src);
      } else {
        const result = copyFileSafe(src, dest, { overwrite: false });
        if (result === "written") written.push(dest);
      }
    }
  };

  ensureDir(destDir);
  walk(srcDir);
  return written;
}

/** Always refresh Cursor-owned adapter files (rules/skills/commands). */
export function syncCursorAdapters(srcCursor: string, projectRoot: string): string[] {
  const destCursor = join(projectRoot, ".cursor");
  const touched: string[] = [];

  const syncSub = (sub: string, overwrite: boolean): void => {
    const src = join(srcCursor, sub);
    if (!existsSync(src)) return;
    const dest = join(destCursor, sub);
    ensureDir(dest);
    const walk = (dir: string, base: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const s = join(dir, entry.name);
        const rel = relative(base, s);
        const d = join(dest, rel);
        if (entry.isDirectory()) {
          ensureDir(d);
          walk(s, base);
        } else {
          const result = copyFileSafe(s, d, { overwrite });
          if (result !== "skipped") touched.push(d);
        }
      }
    };
    walk(src, src);
  };

  syncSub("rules", true);
  syncSub("skills", true);
  syncSub("commands", true);

  const agentsSrc = join(srcCursor, "AGENTS.md");
  if (existsSync(agentsSrc)) {
    const agentsDest = join(projectRoot, "AGENTS.md");
    if (!existsSync(agentsDest)) {
      copyFileSync(agentsSrc, agentsDest);
      touched.push(agentsDest);
    }
  }

  return touched;
}

export function cpDirContents(src: string, dest: string): void {
  ensureDir(dest);
  cpSync(src, dest, { recursive: true });
}
