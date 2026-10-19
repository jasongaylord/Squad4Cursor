import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { initProject } from "./init.js";
import { runDoctor } from "./doctor.js";
import { getStatus } from "./status.js";
import { upgradeProject } from "./upgrade.js";

function tempProject(): string {
  return mkdtempSync(join(tmpdir(), "s4c-"));
}

test("init creates .squad scribe-only and cursor adapters", () => {
  const root = tempProject();
  const result = initProject({ projectRoot: root });
  assert.equal(result.createdSquad, true);
  assert.ok(existsSync(join(root, ".squad", "agents", "scribe", "charter.md")));
  assert.ok(existsSync(join(root, ".cursor", "rules", "squad.mdc")));
  assert.ok(existsSync(join(root, ".cursor", "skills", "squad-coordinator", "SKILL.md")));
  assert.ok(existsSync(join(root, ".cursor", "skills", "squad-speckit", "SKILL.md")));
  assert.ok(existsSync(join(root, ".cursor", "skills", "squad-openspec", "SKILL.md")));
  assert.ok(!existsSync(join(root, ".squad", "agents", "lead")));
});

test("init --preset default seeds specialists without wiping later history", () => {
  const root = tempProject();
  initProject({ projectRoot: root, preset: "default" });
  assert.ok(existsSync(join(root, ".squad", "agents", "lead", "charter.md")));
  assert.ok(existsSync(join(root, ".squad", "agents", "frontend", "charter.md")));

  const historyPath = join(root, ".squad", "agents", "backend", "history.md");
  writeFileSync(historyPath, "# Backend History\n\n## Project knowledge\n\nUses FastAPI\n", "utf8");

  initProject({ projectRoot: root, preset: "default" });
  const preserved = readFileSync(historyPath, "utf8");
  assert.match(preserved, /Uses FastAPI/);
});

test("init on existing squad attaches cursor and preserves decisions", () => {
  const root = tempProject();
  initProject({ projectRoot: root });
  const decisions = join(root, ".squad", "decisions.md");
  writeFileSync(decisions, "# Decisions\n\n### 2026-01-01 — Keep me\n", "utf8");

  mkdirSync(join(root, ".github", "agents"), { recursive: true });
  writeFileSync(join(root, ".github", "agents", "squad.agent.md"), "# copilot\n", "utf8");

  const second = initProject({ projectRoot: root });
  assert.equal(second.createdSquad, false);
  assert.match(readFileSync(decisions, "utf8"), /Keep me/);
  assert.ok(existsSync(join(root, ".github", "agents", "squad.agent.md")));
});

test("doctor and status succeed after init", () => {
  const root = tempProject();
  initProject({ projectRoot: root, preset: "default" });
  const doctor = runDoctor(root);
  assert.equal(doctor.ok, true);
  const status = getStatus(root);
  assert.equal(status.ok, true);
  assert.ok(status.agents.includes("lead"));
  assert.ok(status.agents.includes("scribe"));
});

test("upgrade refreshes cursor skills and leaves decisions", () => {
  const root = tempProject();
  initProject({ projectRoot: root });
  const decisions = join(root, ".squad", "decisions.md");
  writeFileSync(decisions, "# Decisions\n\n### keep\n", "utf8");
  const result = upgradeProject(root);
  assert.ok(result.messages.length > 0);
  assert.match(readFileSync(decisions, "utf8"), /### keep/);
  assert.ok(existsSync(join(root, ".cursor", "skills", "squad-coordinator", "SKILL.md")));
});
