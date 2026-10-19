import { Command } from "commander";
import { castTeam, setCastName } from "./casting.js";
import { readConfig, setAgentModel, setModelProfile, type ModelProfile } from "./config.js";
import { runDoctor } from "./doctor.js";
import { defaultExportPath, exportSquad, importSquad } from "./export-import.js";
import {
  listInbox,
  processInbox,
  recordLockout,
  writeGovernanceReadme,
} from "./governance.js";
import { triageIssues, workOnIssue } from "./github.js";
import { hireAgent, restoreAlumni, retireAgent } from "./hire.js";
import { initProject } from "./init.js";
import { runNap } from "./nap.js";
import { initObservability, logEvent } from "./observability.js";
import {
  pluginAdd,
  pluginList,
  pluginRemove,
  upstreamAdd,
  upstreamRemove,
  upstreamSync,
  readUpstreams,
} from "./plugins.js";
import { ingestPrd, materializeBacklogIssues, readBacklog } from "./prd.js";
import { getStatus } from "./status.js";
import { upgradeProject } from "./upgrade.js";
import { requestWatchStop, startWatch, watchHealth } from "./watch.js";

export const VERSION = "0.2.0";

function printLines(lines: string[], ok = true): void {
  for (const line of lines) console.log(ok ? `✔ ${line}` : line);
}

export function createProgram(): Command {
  const program = new Command();

  program
    .name("s4c")
    .description(
      "Squad4Cursor — Cursor-native Squad orchestration with shared .squad/ state (Copilot-compatible)",
    )
    .version(VERSION);

  program
    .command("init")
    .description("Scaffold or attach .squad/ + Cursor adapters (idempotent)")
    .option("--preset <name>", "Seed roster preset (supported: default)")
    .option("--with-openspec", "Also run openspec init --tools cursor when CLI is available")
    .option("--with-speckit", "Also run specify integration install cursor-agent when CLI is available")
    .option("--path <dir>", "Project directory", process.cwd())
    .action(
      (opts: {
        preset?: string;
        withOpenspec?: boolean;
        withSpeckit?: boolean;
        path: string;
      }) => {
        if (opts.preset && opts.preset !== "default") {
          console.error(`Unknown preset: ${opts.preset}. Supported: default`);
          process.exitCode = 1;
          return;
        }
        const result = initProject({
          projectRoot: opts.path,
          preset: opts.preset === "default" ? "default" : null,
          withOpenspec: Boolean(opts.withOpenspec),
          withSpeckit: Boolean(opts.withSpeckit),
        });
        writeGovernanceReadme(opts.path);
        initObservability(opts.path);
        for (const line of result.messages) console.log(`✔ ${line}`);
        for (const line of result.warnings) console.warn(`⚠ ${line}`);
        console.log(
          "\nNext: open this project in Cursor and ask the team to set up, or run /squad-cast",
        );
      },
    );

  program
    .command("status")
    .description("Show which squad is active and adapter presence")
    .option("--path <dir>", "Project directory", process.cwd())
    .action((opts: { path: string }) => {
      const report = getStatus(opts.path);
      for (const line of report.summaryLines) console.log(line);
      const config = readConfig(opts.path);
      console.log(`Model profile: ${config.modelProfile}`);
      if (!report.ok) {
        console.log("\nTip: run s4c init or s4c doctor");
        process.exitCode = 1;
      }
    });

  program
    .command("doctor")
    .description("Validate .squad/ integrity and Cursor adapters")
    .option("--path <dir>", "Project directory", process.cwd())
    .action((opts: { path: string }) => {
      const report = runDoctor(opts.path);
      for (const finding of report.findings) {
        const mark = finding.level === "ok" ? "✔" : finding.level === "warn" ? "⚠" : "✖";
        console.log(`${mark} [${finding.code}] ${finding.message}`);
      }
      if (!report.ok) process.exitCode = 1;
    });

  program
    .command("upgrade")
    .description("Refresh Cursor-owned templates/skills; never touches team state")
    .option("--path <dir>", "Project directory", process.cwd())
    .action((opts: { path: string }) => {
      const result = upgradeProject(opts.path);
      writeGovernanceReadme(opts.path);
      for (const line of result.messages) console.log(`✔ ${line}`);
    });

  // --- Phase B ---

  program
    .command("cast")
    .description("Assign thematic persistent display names from casting theme")
    .option("--theme <name>", "Theme: default | flight | orchestra")
    .option("--force", "Re-cast even when names exist")
    .option("--set <agent=name>", "Set a single display name (e.g. backend=Ripley)")
    .option("--path <dir>", "Project directory", process.cwd())
    .action((opts: { theme?: string; force?: boolean; set?: string; path: string }) => {
      try {
        if (opts.set) {
          const [agent, name] = opts.set.split("=");
          if (!agent || !name) {
            console.error("Use --set agent=DisplayName");
            process.exitCode = 1;
            return;
          }
          setCastName(opts.path, agent, name);
          console.log(`✔ Set ${agent} → ${name}`);
          return;
        }
        const result = castTeam(opts.path, { theme: opts.theme, force: opts.force });
        console.log(`✔ Cast theme: ${result.theme}`);
        for (const a of result.assignments) {
          console.log(`  ${a.role} (${a.agent}) → ${a.displayName}`);
        }
      } catch (e) {
        console.error(String(e));
        process.exitCode = 1;
      }
    });

  program
    .command("hire")
    .description("Add a specialist agent to the squad")
    .argument("<id>", "Agent directory id (e.g. devops)")
    .requiredOption("--role <role>", "Role title (e.g. DevOps)")
    .option("--path <dir>", "Project directory", process.cwd())
    .action((id: string, opts: { role: string; path: string }) => {
      try {
        const result = hireAgent(opts.path, { id, role: opts.role });
        printLines(result.messages);
        logEvent(opts.path, "hire", `Hired ${id}`);
      } catch (e) {
        console.error(String(e));
        process.exitCode = 1;
      }
    });

  program
    .command("retire")
    .description("Move an agent to .squad/agents/_alumni/ (preserve history)")
    .argument("<id>", "Agent id")
    .option("--path <dir>", "Project directory", process.cwd())
    .action((id: string, opts: { path: string }) => {
      try {
        const result = retireAgent(opts.path, id);
        printLines(result.messages);
        logEvent(opts.path, "retire", `Retired ${id}`);
      } catch (e) {
        console.error(String(e));
        process.exitCode = 1;
      }
    });

  program
    .command("restore")
    .description("Restore an alumni agent back to the active roster")
    .argument("<id>", "Alumni agent id")
    .option("--role <role>", "Role title override")
    .option("--path <dir>", "Project directory", process.cwd())
    .action((id: string, opts: { role?: string; path: string }) => {
      try {
        const result = restoreAlumni(opts.path, id, opts.role);
        printLines(result.messages);
      } catch (e) {
        console.error(String(e));
        process.exitCode = 1;
      }
    });

  program
    .command("nap")
    .description("Context hygiene: compress histories, prune/archive old logs")
    .option("--deep", "Aggressive compression and shorter log retention")
    .option("--dry-run", "Preview without writing")
    .option("--path <dir>", "Project directory", process.cwd())
    .action((opts: { deep?: boolean; dryRun?: boolean; path: string }) => {
      const result = runNap(opts.path, { deep: opts.deep, dryRun: opts.dryRun });
      printLines(result.messages);
    });

  program
    .command("export")
    .description("Export .squad/ to a portable JSON snapshot")
    .option("-o, --out <file>", "Output file")
    .option("--path <dir>", "Project directory", process.cwd())
    .action((opts: { out?: string; path: string }) => {
      try {
        const out = opts.out ?? defaultExportPath(opts.path);
        const result = exportSquad(opts.path, out);
        console.log(`✔ Exported ${result.count} files → ${result.file}`);
      } catch (e) {
        console.error(String(e));
        process.exitCode = 1;
      }
    });

  program
    .command("import")
    .description("Import a Squad4Cursor JSON snapshot into .squad/")
    .argument("<file>", "Export JSON file")
    .option("--force", "Overwrite existing files")
    .option("--path <dir>", "Project directory", process.cwd())
    .action((file: string, opts: { force?: boolean; path: string }) => {
      try {
        const result = importSquad(opts.path, file, { force: opts.force });
        console.log(`✔ Import written=${result.written} skipped=${result.skipped}`);
      } catch (e) {
        console.error(String(e));
        process.exitCode = 1;
      }
    });

  program
    .command("config")
    .description("Show or update .squad/config.json model preferences")
    .option("--profile <name>", "quality | balanced | economy")
    .option("--model <agent=model>", "Set per-agent model hint (e.g. lead=claude-opus)")
    .option("--path <dir>", "Project directory", process.cwd())
    .action((opts: { profile?: string; model?: string; path: string }) => {
      try {
        if (opts.profile) {
          const allowed = ["quality", "balanced", "economy"] as ModelProfile[];
          if (!allowed.includes(opts.profile as ModelProfile)) {
            console.error(`Invalid profile. Use: ${allowed.join(", ")}`);
            process.exitCode = 1;
            return;
          }
          const config = setModelProfile(opts.path, opts.profile as ModelProfile);
          console.log(`✔ modelProfile=${config.modelProfile}`);
          console.log(`  ${config.cursorHints?.modelGuidance ?? ""}`);
          return;
        }
        if (opts.model) {
          const [agent, model] = opts.model.split("=");
          if (!agent || !model) {
            console.error("Use --model agent=modelId");
            process.exitCode = 1;
            return;
          }
          const config = setAgentModel(opts.path, agent, model);
          console.log(`✔ models.${agent}=${model}`);
          console.log(JSON.stringify(config.models, null, 2));
          return;
        }
        console.log(JSON.stringify(readConfig(opts.path), null, 2));
      } catch (e) {
        console.error(String(e));
        process.exitCode = 1;
      }
    });

  const inbox = program.command("inbox").description("Decision inbox helpers");
  inbox
    .command("list")
    .option("--path <dir>", "Project directory", process.cwd())
    .action((opts: { path: string }) => {
      const items = listInbox(opts.path);
      if (items.length === 0) {
        console.log("(empty)");
        return;
      }
      for (const item of items) console.log(`- ${item.file}: ${item.title}`);
    });
  inbox
    .command("process")
    .option("--dry-run", "Preview")
    .option("--path <dir>", "Project directory", process.cwd())
    .action((opts: { dryRun?: boolean; path: string }) => {
      const result = processInbox(opts.path, { dryRun: opts.dryRun });
      printLines(result.messages);
    });

  program
    .command("lockout")
    .description("Record a reviewer lockout event in orchestration-log")
    .requiredOption("--agent <id>", "Rejected agent id")
    .requiredOption("--reviewer <id>", "Reviewer agent id")
    .requiredOption("--reason <text>", "Rejection reason")
    .option("--assign <id>", "Agent assigned to fix")
    .option("--path <dir>", "Project directory", process.cwd())
    .action(
      (opts: { agent: string; reviewer: string; reason: string; assign?: string; path: string }) => {
        const file = recordLockout(opts.path, {
          at: new Date().toISOString(),
          rejectedAgent: opts.agent,
          reviewer: opts.reviewer,
          reason: opts.reason,
          assignedTo: opts.assign,
        });
        console.log(`✔ Lockout recorded → ${file}`);
      },
    );

  // --- Phase C ---

  program
    .command("watch")
    .description("Ralph continuous poll loop (triage issues; optional execute)")
    .option("--execute", "Dispatch cursor-agent / --agent-cmd when issues exist")
    .option("--interval <minutes>", "Poll interval", "10")
    .option("--agent-cmd <cmd>", "Custom agent command; use {prompt} placeholder")
    .option("--once", "Single round then exit")
    .option("--dry-run", "Do not dispatch agents")
    .option("--health", "Show watch health and exit")
    .option("--stop", "Request graceful stop of a running watch")
    .option("--path <dir>", "Project directory", process.cwd())
    .action(
      async (opts: {
        execute?: boolean;
        interval?: string;
        agentCmd?: string;
        once?: boolean;
        dryRun?: boolean;
        health?: boolean;
        stop?: boolean;
        path: string;
      }) => {
        if (opts.health) {
          console.log(watchHealth(opts.path));
          return;
        }
        if (opts.stop) {
          requestWatchStop(opts.path);
          console.log("✔ Stop sentinel written (.squad/ralph-stop)");
          return;
        }
        await startWatch(opts.path, {
          execute: opts.execute,
          intervalMinutes: Number(opts.interval ?? 10),
          agentCmd: opts.agentCmd,
          once: opts.once,
          dryRun: opts.dryRun,
        });
      },
    );

  program
    .command("triage")
    .description("Scan open GitHub issues (requires gh)")
    .option("--path <dir>", "Project directory", process.cwd())
    .action(async (opts: { path: string }) => {
      const result = await triageIssues(opts.path);
      if (!result.ok) {
        console.error(result.detail);
        process.exitCode = 1;
        return;
      }
      console.log(`✔ ${result.detail}`);
      for (const issue of result.issues) {
        console.log(`  #${issue.number} ${issue.title}`);
      }
    });

  program
    .command("issue")
    .description("Prepare Squad work prompt for a GitHub issue")
    .argument("<number>", "Issue number")
    .option("--path <dir>", "Project directory", process.cwd())
    .action((number: string, opts: { path: string }) => {
      const result = workOnIssue(opts.path, Number(number));
      if (!result.ok) {
        console.error(result.message);
        process.exitCode = 1;
        return;
      }
      console.log(`✔ ${result.message}`);
      if (result.promptFile) console.log(`  Prompt: ${result.promptFile}`);
    });

  const prd = program.command("prd").description("PRD → backlog → GitHub issues");
  prd
    .command("ingest")
    .argument("<file>", "PRD markdown file")
    .option("--path <dir>", "Project directory", process.cwd())
    .action((file: string, opts: { path: string }) => {
      try {
        const result = ingestPrd(opts.path, file);
        console.log(`✔ Ingested ${result.backlog.items.length} items → ${result.path}`);
      } catch (e) {
        console.error(String(e));
        process.exitCode = 1;
      }
    });
  prd
    .command("show")
    .option("--path <dir>", "Project directory", process.cwd())
    .action((opts: { path: string }) => {
      const backlog = readBacklog(opts.path);
      if (!backlog) {
        console.error("No backlog. Run s4c prd ingest <file.md>");
        process.exitCode = 1;
        return;
      }
      console.log(JSON.stringify(backlog, null, 2));
    });
  prd
    .command("materialize")
    .description("Create GitHub issues from backlog")
    .option("--dry-run", "Preview")
    .option("--path <dir>", "Project directory", process.cwd())
    .action((opts: { dryRun?: boolean; path: string }) => {
      try {
        const result = materializeBacklogIssues(opts.path, { dryRun: opts.dryRun });
        printLines(result.messages);
      } catch (e) {
        console.error(String(e));
        process.exitCode = 1;
      }
    });

  const plugin = program.command("plugin").description("Local plugin marketplace registry");
  plugin
    .command("add")
    .argument("<name>", "Plugin name")
    .argument("<source>", "Source URL or path")
    .option("--path <dir>", "Project directory", process.cwd())
    .action((name: string, source: string, opts: { path: string }) => {
      try {
        const entry = pluginAdd(opts.path, name, source);
        console.log(`✔ Added plugin ${entry.name}`);
      } catch (e) {
        console.error(String(e));
        process.exitCode = 1;
      }
    });
  plugin
    .command("remove")
    .argument("<name>", "Plugin name")
    .option("--path <dir>", "Project directory", process.cwd())
    .action((name: string, opts: { path: string }) => {
      try {
        pluginRemove(opts.path, name);
        console.log(`✔ Removed ${name}`);
      } catch (e) {
        console.error(String(e));
        process.exitCode = 1;
      }
    });
  plugin
    .command("list")
    .option("--path <dir>", "Project directory", process.cwd())
    .action((opts: { path: string }) => {
      const list = pluginList(opts.path);
      if (!list.length) {
        console.log("(no plugins)");
        return;
      }
      for (const p of list) console.log(`- ${p.name} (${p.source}) enabled=${p.enabled}`);
    });

  const upstream = program.command("upstream").description("Upstream Squad sources");
  upstream
    .command("add")
    .argument("<name>", "Name")
    .argument("<url>", "Git URL")
    .option("--path <dir>", "Project directory", process.cwd())
    .action((name: string, url: string, opts: { path: string }) => {
      try {
        upstreamAdd(opts.path, name, url);
        console.log(`✔ Upstream ${name} → ${url}`);
      } catch (e) {
        console.error(String(e));
        process.exitCode = 1;
      }
    });
  upstream
    .command("remove")
    .argument("<name>", "Name")
    .option("--path <dir>", "Project directory", process.cwd())
    .action((name: string, opts: { path: string }) => {
      upstreamRemove(opts.path, name);
      console.log(`✔ Removed upstream ${name}`);
    });
  upstream
    .command("list")
    .option("--path <dir>", "Project directory", process.cwd())
    .action((opts: { path: string }) => {
      const list = readUpstreams(opts.path);
      if (!list.length) {
        console.log("(no upstreams)");
        return;
      }
      for (const u of list) console.log(`- ${u.name}: ${u.url}`);
    });
  upstream
    .command("sync")
    .option("--path <dir>", "Project directory", process.cwd())
    .action((opts: { path: string }) => {
      const result = upstreamSync(opts.path);
      printLines(result.messages);
    });

  program
    .command("observe")
    .description("Local observability helpers")
    .argument("[action]", "init | ping", "ping")
    .option("--path <dir>", "Project directory", process.cwd())
    .action((action: string, opts: { path: string }) => {
      if (action === "init") {
        console.log(`✔ ${initObservability(opts.path)}`);
        return;
      }
      initObservability(opts.path);
      logEvent(opts.path, "ping", "observe ping");
      console.log("✔ ping logged to .squad/observability/events.jsonl");
    });

  program
    .command("build")
    .description("Generate .squad/ from squad.config.ts via @squad4cursor/sdk (if present)")
    .option("--path <dir>", "Project directory", process.cwd())
    .action(async (opts: { path: string }) => {
      try {
        const { buildFromConfig } = await import("./sdk-bridge.js");
        const result = await buildFromConfig(opts.path);
        printLines(result.messages);
      } catch (e) {
        console.error(String(e));
        console.error("Tip: add squad.config.ts and depend on @squad4cursor/sdk");
        process.exitCode = 1;
      }
    });

  return program;
}
