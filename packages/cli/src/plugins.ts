import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ensureDir } from "./fs-utils.js";
import { squadDir } from "./paths.js";

export type PluginEntry = {
  name: string;
  source: string;
  addedAt: string;
  enabled: boolean;
};

export type Marketplace = {
  plugins: PluginEntry[];
};

export type Upstream = {
  name: string;
  url: string;
  addedAt: string;
};

function pluginsDir(projectRoot: string): string {
  return join(squadDir(projectRoot), "plugins");
}

function marketplacePath(projectRoot: string): string {
  return join(pluginsDir(projectRoot), "marketplace.json");
}

function upstreamPath(projectRoot: string): string {
  return join(squadDir(projectRoot), "upstream.json");
}

export function readMarketplace(projectRoot: string): Marketplace {
  const path = marketplacePath(projectRoot);
  if (!existsSync(path)) return { plugins: [] };
  return JSON.parse(readFileSync(path, "utf8")) as Marketplace;
}

function writeMarketplace(projectRoot: string, data: Marketplace): void {
  ensureDir(pluginsDir(projectRoot));
  writeFileSync(marketplacePath(projectRoot), JSON.stringify(data, null, 2) + "\n", "utf8");
}

export function pluginAdd(projectRoot: string, name: string, source: string): PluginEntry {
  const market = readMarketplace(projectRoot);
  if (market.plugins.some((p) => p.name === name)) {
    throw new Error(`Plugin already registered: ${name}`);
  }
  const entry: PluginEntry = {
    name,
    source,
    addedAt: new Date().toISOString(),
    enabled: true,
  };
  market.plugins.push(entry);
  writeMarketplace(projectRoot, market);
  const stub = join(pluginsDir(projectRoot), name);
  mkdirSync(stub, { recursive: true });
  writeFileSync(
    join(stub, "README.md"),
    `# Plugin: ${name}\n\nSource: ${source}\n\nSquad4Cursor records plugins locally. Wire runtime hooks in Phase C+ integrations.\n`,
    "utf8",
  );
  return entry;
}

export function pluginRemove(projectRoot: string, name: string): void {
  const market = readMarketplace(projectRoot);
  const next = market.plugins.filter((p) => p.name !== name);
  if (next.length === market.plugins.length) {
    throw new Error(`Plugin not found: ${name}`);
  }
  writeMarketplace(projectRoot, { plugins: next });
}

export function pluginList(projectRoot: string): PluginEntry[] {
  return readMarketplace(projectRoot).plugins;
}

export function readUpstreams(projectRoot: string): Upstream[] {
  const path = upstreamPath(projectRoot);
  if (!existsSync(path)) return [];
  return (JSON.parse(readFileSync(path, "utf8")) as { upstreams: Upstream[] }).upstreams;
}

export function upstreamAdd(projectRoot: string, name: string, url: string): Upstream {
  const list = readUpstreams(projectRoot);
  if (list.some((u) => u.name === name)) {
    throw new Error(`Upstream already exists: ${name}`);
  }
  const entry: Upstream = { name, url, addedAt: new Date().toISOString() };
  list.push(entry);
  ensureDir(squadDir(projectRoot));
  writeFileSync(upstreamPath(projectRoot), JSON.stringify({ upstreams: list }, null, 2) + "\n");
  return entry;
}

export function upstreamRemove(projectRoot: string, name: string): void {
  const list = readUpstreams(projectRoot).filter((u) => u.name !== name);
  writeFileSync(upstreamPath(projectRoot), JSON.stringify({ upstreams: list }, null, 2) + "\n");
}

export function upstreamSync(projectRoot: string): { messages: string[] } {
  const list = readUpstreams(projectRoot);
  if (list.length === 0) {
    return {
      messages: [
        "No upstreams configured. Add Brady Squad or another source with:",
        "  s4c upstream add brady https://github.com/bradygaster/squad",
      ],
    };
  }
  const messages = list.map(
    (u) =>
      `Upstream '${u.name}' (${u.url}) — recorded. Manual sync: compare templates with their releases; s4c upgrade refreshes Cursor adapters only.`,
  );
  const log = join(squadDir(projectRoot), "orchestration-log");
  mkdirSync(log, { recursive: true });
  writeFileSync(
    join(log, `${new Date().toISOString().replace(/[:.]/g, "-")}-upstream-sync.md`),
    messages.join("\n") + "\n",
    "utf8",
  );
  return { messages };
}
