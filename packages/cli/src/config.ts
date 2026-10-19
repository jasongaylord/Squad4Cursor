import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ensureDir } from "./fs-utils.js";
import { squadDir } from "./paths.js";

export type ModelProfile = "quality" | "balanced" | "economy";

export type SquadConfig = {
  version: string;
  runtime: string;
  modelProfile: ModelProfile;
  createdBy?: string;
  compat?: Record<string, boolean>;
  models?: {
    lead?: string;
    frontend?: string;
    backend?: string;
    tester?: string;
    scribe?: string;
    default?: string;
  };
  governance?: {
    protectedPaths?: string[];
    reviewerLockout?: boolean;
    requireDecisionInboxReview?: boolean;
  };
  watch?: {
    intervalMinutes?: number;
    stateBackend?: "in-memory" | "file";
    notifyLevel?: "all" | "important" | "none";
  };
  cursorHints?: {
    /** Free-text hints injected into coordinator context for model choice */
    modelGuidance?: string;
  };
};

const DEFAULT_CONFIG: SquadConfig = {
  version: "0.2.0",
  runtime: "squad4cursor",
  modelProfile: "quality",
  createdBy: "s4c",
  compat: { bradySquad: true, cursor: true, copilot: true },
  models: {},
  governance: {
    protectedPaths: [".squad/agents/", ".squad/decisions.md", ".squad/casting/"],
    reviewerLockout: true,
    requireDecisionInboxReview: true,
  },
  watch: {
    intervalMinutes: 10,
    stateBackend: "file",
    notifyLevel: "important",
  },
  cursorHints: {
    modelGuidance:
      "quality: prefer stronger models for Lead/Tester review; balanced: mid-tier for implementers; economy: fast models for mechanical work.",
  },
};

export function defaultConfig(): SquadConfig {
  return structuredClone(DEFAULT_CONFIG);
}

export function readConfig(projectRoot: string): SquadConfig {
  const path = join(squadDir(projectRoot), "config.json");
  if (!existsSync(path)) return defaultConfig();
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as Partial<SquadConfig>;
    return {
      ...defaultConfig(),
      ...parsed,
      models: { ...defaultConfig().models, ...parsed.models },
      governance: { ...defaultConfig().governance, ...parsed.governance },
      watch: { ...defaultConfig().watch, ...parsed.watch },
      cursorHints: { ...defaultConfig().cursorHints, ...parsed.cursorHints },
      compat: { ...defaultConfig().compat, ...parsed.compat },
    };
  } catch {
    return defaultConfig();
  }
}

export function writeConfig(projectRoot: string, config: SquadConfig): void {
  const path = join(squadDir(projectRoot), "config.json");
  ensureDir(squadDir(projectRoot));
  writeFileSync(path, JSON.stringify(config, null, 2) + "\n", "utf8");
}

export function setModelProfile(projectRoot: string, profile: ModelProfile): SquadConfig {
  const config = readConfig(projectRoot);
  config.modelProfile = profile;
  writeConfig(projectRoot, config);
  return config;
}

export function setAgentModel(projectRoot: string, agent: string, model: string): SquadConfig {
  const config = readConfig(projectRoot);
  config.models = config.models ?? {};
  (config.models as Record<string, string>)[agent] = model;
  writeConfig(projectRoot, config);
  return config;
}
