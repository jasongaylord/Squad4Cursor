import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { listAgentDirs, pathExists } from "./fs-utils.js";
import { cursorDir, squadDir } from "./paths.js";

export type StatusReport = {
  ok: boolean;
  projectRoot: string;
  hasSquad: boolean;
  agents: string[];
  hasCursorRule: boolean;
  hasCoordinatorSkill: boolean;
  hasCopilotAgent: boolean;
  hasSpeckit: boolean;
  hasOpenspec: boolean;
  focus: string;
  summaryLines: string[];
};

function readFocus(projectRoot: string): string {
  const nowPath = join(squadDir(projectRoot), "identity", "now.md");
  if (!existsSync(nowPath)) return "(missing identity/now.md)";
  const text = readFileSync(nowPath, "utf8");
  const match = text.match(/\*\*Focus\*\*:\s*(.+)/);
  return match?.[1]?.trim() || "(unset)";
}

export function getStatus(projectRoot: string): StatusReport {
  const hasSquad = pathExists(squadDir(projectRoot));
  const agents = hasSquad ? listAgentDirs(join(squadDir(projectRoot), "agents")) : [];
  const hasCursorRule = pathExists(join(cursorDir(projectRoot), "rules", "squad.mdc"));
  const hasCoordinatorSkill = pathExists(
    join(cursorDir(projectRoot), "skills", "squad-coordinator", "SKILL.md"),
  );
  const hasCopilotAgent = pathExists(
    join(projectRoot, ".github", "agents", "squad.agent.md"),
  );
  const hasSpeckit = pathExists(join(projectRoot, ".specify"));
  const hasOpenspec = pathExists(join(projectRoot, "openspec"));
  const focus = hasSquad ? readFocus(projectRoot) : "(no .squad/)";

  const summaryLines = [
    `Project: ${projectRoot}`,
    `Squad state: ${hasSquad ? "yes" : "no"}`,
    `Agents: ${agents.length ? agents.join(", ") : "(none)"}`,
    `Focus: ${focus}`,
    `Cursor adapters: rule=${hasCursorRule ? "yes" : "no"}, coordinator=${hasCoordinatorSkill ? "yes" : "no"}`,
    `Copilot agent: ${hasCopilotAgent ? "yes" : "no"}`,
    `SpecKit (.specify): ${hasSpeckit ? "yes" : "no"}`,
    `OpenSpec (openspec/): ${hasOpenspec ? "yes" : "no"}`,
  ];

  return {
    ok: hasSquad && hasCursorRule && hasCoordinatorSkill,
    projectRoot,
    hasSquad,
    agents,
    hasCursorRule,
    hasCoordinatorSkill,
    hasCopilotAgent,
    hasSpeckit,
    hasOpenspec,
    focus,
    summaryLines,
  };
}
