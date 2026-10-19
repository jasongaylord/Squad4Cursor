import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export type BuildResult = { messages: string[] };

/**
 * Load squad.config.ts/js and generate .squad/ using @squad4cursor/sdk when available.
 */
export async function buildFromConfig(projectRoot: string): Promise<BuildResult> {
  const candidates = ["squad.config.ts", "squad.config.mts", "squad.config.js", "squad.config.mjs"];
  const configPath = candidates.map((c) => join(projectRoot, c)).find((p) => existsSync(p));
  if (!configPath) {
    throw new Error("No squad.config.ts (or .js) found in project root");
  }

  let generate: (root: string, config: unknown) => Promise<{ messages: string[] }>;
  try {
    const sdk = (await import("@squad4cursor/sdk")) as {
      generateSquadFiles: (root: string, config: unknown) => Promise<{ messages: string[] }>;
    };
    generate = sdk.generateSquadFiles;
  } catch {
    throw new Error(
      "Cannot import @squad4cursor/sdk. From the monorepo run npm install && npm run build.",
    );
  }

  const mod = (await import(pathToFileURL(configPath).href)) as {
    default?: unknown;
  };
  const config = mod.default ?? mod;
  return generate(projectRoot, config);
}
