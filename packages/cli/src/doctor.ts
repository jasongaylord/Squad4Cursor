import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { listAgentDirs, pathExists } from "./fs-utils.js";
import { cursorDir, squadDir } from "./paths.js";

export type DoctorFinding = {
  level: "ok" | "warn" | "error";
  code: string;
  message: string;
};

export type DoctorReport = {
  ok: boolean;
  findings: DoctorFinding[];
};

function check(level: DoctorFinding["level"], code: string, message: string): DoctorFinding {
  return { level, code, message };
}

export function runDoctor(projectRoot: string): DoctorReport {
  const findings: DoctorFinding[] = [];
  const squad = squadDir(projectRoot);

  if (!pathExists(squad)) {
    findings.push(check("error", "squad.missing", ".squad/ not found — run s4c init"));
    return { ok: false, findings };
  }

  findings.push(check("ok", "squad.present", ".squad/ found"));

  for (const required of ["team.md", "routing.md", "decisions.md", "config.json"]) {
    if (!pathExists(join(squad, required))) {
      findings.push(check("error", `squad.${required}`, `Missing .squad/${required}`));
    } else {
      findings.push(check("ok", `squad.${required}`, `.squad/${required} present`));
    }
  }

  const agentsRoot = join(squad, "agents");
  const agents = listAgentDirs(agentsRoot);
  if (!agents.includes("scribe")) {
    findings.push(check("warn", "agents.scribe", "Scribe agent missing — re-run s4c init"));
  } else {
    findings.push(check("ok", "agents.scribe", "Scribe present"));
  }

  for (const agent of agents) {
    const charter = join(agentsRoot, agent, "charter.md");
    const history = join(agentsRoot, agent, "history.md");
    if (!existsSync(charter)) {
      findings.push(check("error", `agents.${agent}.charter`, `Missing charter for ${agent}`));
    }
    if (!existsSync(history)) {
      findings.push(check("warn", `agents.${agent}.history`, `Missing history for ${agent}`));
    }
  }

  const rule = join(cursorDir(projectRoot), "rules", "squad.mdc");
  const coordinator = join(cursorDir(projectRoot), "skills", "squad-coordinator", "SKILL.md");
  const speckit = join(cursorDir(projectRoot), "skills", "squad-speckit", "SKILL.md");
  const openspecSkill = join(cursorDir(projectRoot), "skills", "squad-openspec", "SKILL.md");

  if (!pathExists(rule)) {
    findings.push(check("error", "cursor.rule", "Missing .cursor/rules/squad.mdc — run s4c init or s4c upgrade"));
  } else {
    findings.push(check("ok", "cursor.rule", "Cursor squad rule present"));
  }

  if (!pathExists(coordinator)) {
    findings.push(
      check("error", "cursor.coordinator", "Missing squad-coordinator skill — run s4c upgrade"),
    );
  } else {
    findings.push(check("ok", "cursor.coordinator", "squad-coordinator skill present"));
  }

  if (!pathExists(speckit)) {
    findings.push(check("warn", "cursor.speckit", "Missing squad-speckit skill — run s4c upgrade"));
  }
  if (!pathExists(openspecSkill)) {
    findings.push(check("warn", "cursor.openspec", "Missing squad-openspec skill — run s4c upgrade"));
  }

  const governance = join(cursorDir(projectRoot), "skills", "squad-governance", "SKILL.md");
  if (!pathExists(governance)) {
    findings.push(
      check("warn", "cursor.governance", "Missing squad-governance skill — run s4c upgrade"),
    );
  } else {
    findings.push(check("ok", "cursor.governance", "squad-governance skill present"));
  }

  if (pathExists(join(projectRoot, ".github", "agents", "squad.agent.md"))) {
    findings.push(
      check("ok", "copilot.agent", "Copilot squad.agent.md present (dual-runtime ready)"),
    );
  }

  // Soft check: config JSON parse
  try {
    const raw = readFileSync(join(squad, "config.json"), "utf8");
    JSON.parse(raw);
    findings.push(check("ok", "squad.config.parse", "config.json parses as JSON"));
  } catch {
    findings.push(check("error", "squad.config.parse", "config.json is not valid JSON"));
  }

  const ok = !findings.some((f) => f.level === "error");
  return { ok, findings };
}
