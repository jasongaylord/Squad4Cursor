import assert from "node:assert/strict";
import { mkdtempSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { defineAgent, defineSquad, defineTeam, generateSquadFiles } from "./index.js";

test("generateSquadFiles writes agents and team", async () => {
  const root = mkdtempSync(join(tmpdir(), "s4c-sdk-"));
  const config = defineSquad({
    team: defineTeam({ name: "Demo", members: ["@lead", "@backend"] }),
    agents: [
      defineAgent({ name: "lead", role: "Lead", model: "claude-sonnet" }),
      defineAgent({ name: "backend", role: "Backend" }),
    ],
    modelProfile: "balanced",
  });
  const result = await generateSquadFiles(root, config);
  assert.ok(result.messages.length > 0);
  assert.ok(existsSync(join(root, ".squad", "agents", "lead", "charter.md")));
  assert.ok(existsSync(join(root, ".squad", "agents", "scribe", "charter.md")));
  const configJson = JSON.parse(readFileSync(join(root, ".squad", "config.json"), "utf8"));
  assert.equal(configJson.modelProfile, "balanced");
  assert.equal(configJson.models.lead, "claude-sonnet");
});
