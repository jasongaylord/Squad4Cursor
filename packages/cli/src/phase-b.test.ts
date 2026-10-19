import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { castTeam } from "./casting.js";
import { setModelProfile, readConfig } from "./config.js";
import { exportSquad, importSquad } from "./export-import.js";
import { processInbox, recordLockout, listInbox } from "./governance.js";
import { hireAgent, retireAgent, restoreAlumni } from "./hire.js";
import { initProject } from "./init.js";
import { runNap } from "./nap.js";
import { ingestPrd, parsePrdMarkdown } from "./prd.js";
import { pluginAdd, pluginList, upstreamAdd, upstreamSync } from "./plugins.js";

function tempProject(): string {
  const root = mkdtempSync(join(tmpdir(), "s4c-b-"));
  initProject({ projectRoot: root, preset: "default" });
  return root;
}

test("hire retire restore preserves history via alumni", () => {
  const root = tempProject();
  hireAgent(root, { id: "devops", role: "DevOps" });
  assert.ok(existsSync(join(root, ".squad", "agents", "devops", "charter.md")));
  writeFileSync(
    join(root, ".squad", "agents", "devops", "history.md"),
    "# DevOps History\n\nKnows Terraform\n",
    "utf8",
  );
  retireAgent(root, "devops");
  assert.ok(existsSync(join(root, ".squad", "agents", "_alumni", "devops", "history.md")));
  assert.ok(!existsSync(join(root, ".squad", "agents", "devops")));
  restoreAlumni(root, "devops", "DevOps");
  assert.match(
    readFileSync(join(root, ".squad", "agents", "devops", "history.md"), "utf8"),
    /Terraform/,
  );
});

test("cast assigns display names", () => {
  const root = tempProject();
  const result = castTeam(root, { theme: "flight" });
  assert.ok(result.assignments.length >= 4);
  assert.equal(result.theme, "flight");
  const registry = JSON.parse(
    readFileSync(join(root, ".squad", "casting", "registry.json"), "utf8"),
  );
  assert.ok(registry.names.lead.displayName);
});

test("nap compresses large history", () => {
  const root = tempProject();
  const history = join(root, ".squad", "agents", "backend", "history.md");
  const fat =
    "# Backend History\n\n## Recent sessions\n\n" +
    ("- detail line with extra padding for size\n".repeat(2000));
  writeFileSync(history, fat, "utf8");
  assert.ok(Buffer.byteLength(fat, "utf8") > 12 * 1024);
  const dry = runNap(root, { dryRun: true });
  assert.ok(
    dry.changed.some((p) => p.replace(/\\/g, "/").includes("backend/history.md")),
    `expected backend history in ${JSON.stringify(dry.changed)} / ${dry.messages.join("; ")}`,
  );
  runNap(root, {});
  assert.ok(Buffer.byteLength(readFileSync(history, "utf8"), "utf8") < Buffer.byteLength(fat, "utf8"));
});

test("export import roundtrip", () => {
  const root = tempProject();
  const out = join(root, "snap.json");
  exportSquad(root, out);
  const other = mkdtempSync(join(tmpdir(), "s4c-imp-"));
  const result = importSquad(other, out);
  assert.ok(result.written > 5);
  assert.ok(existsSync(join(other, ".squad", "team.md")));
});

test("config model profile", () => {
  const root = tempProject();
  setModelProfile(root, "economy");
  assert.equal(readConfig(root).modelProfile, "economy");
});

test("inbox process and lockout", () => {
  const root = tempProject();
  const inbox = join(root, ".squad", "decisions", "inbox");
  mkdirSync(inbox, { recursive: true });
  writeFileSync(join(inbox, "use-postgres.md"), "# Use Postgres\n\nWe choose Postgres.\n", "utf8");
  assert.equal(listInbox(root).length, 1);
  processInbox(root);
  assert.equal(listInbox(root).length, 0);
  assert.match(readFileSync(join(root, ".squad", "decisions.md"), "utf8"), /Use Postgres/);
  const file = recordLockout(root, {
    at: new Date().toISOString(),
    rejectedAgent: "backend",
    reviewer: "tester",
    reason: "missing null check",
    assignedTo: "lead",
  });
  assert.ok(existsSync(file));
});

test("prd parse and ingest", () => {
  const root = tempProject();
  const md = `# My PRD\n\n## Auth\n\nUsers can log in.\n\n## Dashboard\n\nShow metrics.\n`;
  const parsed = parsePrdMarkdown(md, "memory");
  assert.equal(parsed.items.length, 2);
  const file = join(root, "prd.md");
  writeFileSync(file, md, "utf8");
  const result = ingestPrd(root, file);
  assert.equal(result.backlog.items.length, 2);
  assert.ok(existsSync(join(root, ".squad", "prd", "backlog.md")));
});

test("plugins and upstream registry", () => {
  const root = tempProject();
  pluginAdd(root, "sample", "https://example.com/plugin");
  assert.equal(pluginList(root).length, 1);
  upstreamAdd(root, "brady", "https://github.com/bradygaster/squad");
  const sync = upstreamSync(root);
  assert.ok(sync.messages.length >= 1);
});
