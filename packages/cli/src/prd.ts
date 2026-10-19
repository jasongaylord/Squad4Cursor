import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createIssueFromItem } from "./github.js";
import { ensureDir } from "./fs-utils.js";
import { squadDir } from "./paths.js";

export type PrdItem = {
  id: string;
  title: string;
  priority: number;
  dependsOn: string[];
  body: string;
};

export type PrdBacklog = {
  title: string;
  source: string;
  createdAt: string;
  items: PrdItem[];
};

function backlogPath(projectRoot: string): string {
  return join(squadDir(projectRoot), "prd", "backlog.json");
}

/** Parse a simple PRD markdown into backlog items (## headings as epics/items). */
export function parsePrdMarkdown(markdown: string, source: string): PrdBacklog {
  const lines = markdown.split(/\r?\n/);
  const title =
    lines.find((l) => l.startsWith("# "))?.replace(/^#\s+/, "").trim() || "PRD Backlog";
  const items: PrdItem[] = [];
  let current: { heading: string; body: string[] } | null = null;
  let priority = 1;

  const flush = (): void => {
    if (!current) return;
    const id = `prd-${String(items.length + 1).padStart(3, "0")}`;
    items.push({
      id,
      title: current.heading,
      priority: priority++,
      dependsOn: items.length ? [items[items.length - 1].id] : [],
      body: current.body.join("\n").trim(),
    });
    current = null;
  };

  for (const line of lines) {
    if (line.startsWith("## ")) {
      flush();
      current = { heading: line.replace(/^##\s+/, "").trim(), body: [] };
      continue;
    }
    if (current) current.body.push(line);
  }
  flush();

  // First item has no deps
  if (items[0]) items[0].dependsOn = [];

  return {
    title,
    source,
    createdAt: new Date().toISOString(),
    items,
  };
}

export function ingestPrd(
  projectRoot: string,
  prdFile: string,
): { backlog: PrdBacklog; path: string } {
  if (!existsSync(prdFile)) {
    throw new Error(`PRD file not found: ${prdFile}`);
  }
  const markdown = readFileSync(prdFile, "utf8");
  const backlog = parsePrdMarkdown(markdown, prdFile);
  const dir = join(squadDir(projectRoot), "prd");
  ensureDir(dir);
  const path = backlogPath(projectRoot);
  writeFileSync(path, JSON.stringify(backlog, null, 2) + "\n", "utf8");
  writeFileSync(
    join(dir, "backlog.md"),
    renderBacklogMd(backlog),
    "utf8",
  );
  return { backlog, path };
}

export function renderBacklogMd(backlog: PrdBacklog): string {
  const lines = [
    `# ${backlog.title}`,
    "",
    `Source: ${backlog.source}`,
    `Created: ${backlog.createdAt}`,
    "",
    "| ID | P | Title | Depends |",
    "| --- | --- | --- | --- |",
    ...backlog.items.map(
      (i) => `| ${i.id} | P${i.priority} | ${i.title} | ${i.dependsOn.join(", ") || "—"} |`,
    ),
    "",
  ];
  for (const item of backlog.items) {
    lines.push(`## ${item.id} — ${item.title}`, "", item.body || "(no detail)", "");
  }
  return lines.join("\n");
}

export function readBacklog(projectRoot: string): PrdBacklog | null {
  const path = backlogPath(projectRoot);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as PrdBacklog;
}

export type MaterializeResult = {
  created: Array<{ id: string; url: string }>;
  skipped: string[];
  messages: string[];
};

/** Create GitHub issues from backlog items (dependency-aware order). */
export function materializeBacklogIssues(
  projectRoot: string,
  options: { dryRun?: boolean } = {},
): MaterializeResult {
  const backlog = readBacklog(projectRoot);
  if (!backlog) {
    throw new Error("No backlog. Run: s4c prd ingest <file.md>");
  }

  const created: MaterializeResult["created"] = [];
  const skipped: string[] = [];
  const messages: string[] = [];
  const sorted = [...backlog.items].sort((a, b) => a.priority - b.priority);

  for (const item of sorted) {
    const title = `[${item.id}] ${item.title}`;
    const body = `${item.body}\n\n---\nSquad PRD item \`${item.id}\` (P${item.priority}). Depends on: ${item.dependsOn.join(", ") || "none"}.`;
    if (options.dryRun) {
      messages.push(`[dry-run] Would create issue: ${title}`);
      skipped.push(item.id);
      continue;
    }
    const result = createIssueFromItem(projectRoot, title, body, ["squad", "prd"]);
    if (result.ok && result.url) {
      created.push({ id: item.id, url: result.url });
      messages.push(`Created ${title} → ${result.url}`);
    } else {
      skipped.push(item.id);
      messages.push(`Failed ${item.id}: ${result.detail}`);
    }
  }

  const mapPath = join(squadDir(projectRoot), "prd", "issue-map.json");
  mkdirSync(join(squadDir(projectRoot), "prd"), { recursive: true });
  writeFileSync(mapPath, JSON.stringify({ created, at: new Date().toISOString() }, null, 2) + "\n");

  return { created, skipped, messages };
}
