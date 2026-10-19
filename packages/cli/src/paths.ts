import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

/** Resolve templates dir for published package or monorepo checkout. */
export function resolveTemplatesRoot(): string {
  const candidates = [
    join(here, "..", "templates"),
    join(here, "..", "..", "..", "templates"),
    join(here, "..", "..", "templates"),
  ];
  for (const candidate of candidates) {
    if (existsSync(join(candidate, "squad")) && existsSync(join(candidate, "cursor"))) {
      return candidate;
    }
  }
  throw new Error(
    "Could not locate Squad4Cursor templates. Run `npm run build` from the repo root.",
  );
}

export function squadDir(projectRoot: string): string {
  return join(projectRoot, ".squad");
}

export function cursorDir(projectRoot: string): string {
  return join(projectRoot, ".cursor");
}
