# Roadmap

## Phase A — MVP

- [x] Shared `.squad/` state compatible with Brady Squad
- [x] Cursor adapters: coordinator skill, rule, commands
- [x] CLI: `init`, `status`, `doctor`, `upgrade`
- [x] Default preset roster
- [x] SpecKit bridge skill
- [x] OpenSpec bridge skill
- [x] Sample + docs

## Phase B — Broader parity

- [x] Casting / thematic persistent names (`s4c cast`, themes: default/flight/orchestra)
- [x] `s4c hire` / `retire` / `restore` → `.squad/agents/_alumni/`
- [x] `s4c nap` — compress, prune, archive (`--deep`, `--dry-run`)
- [x] Model preferences in `.squad/config.json` (`s4c config --profile` / `--model`)
- [x] `s4c export` / `s4c import` portable JSON snapshots
- [x] Governance: protected paths, `s4c lockout`, `s4c inbox list|process`, `squad-governance` skill
- [x] Richer command surface (cast, hire, nap, inbox, lockout, config)

## Phase C — Full Squad surface

- [x] Watch / Ralph loop (`s4c watch`, `--execute`, `--once`, `--health`, `--stop`)
- [x] GitHub Issues control plane (`s4c triage`, `s4c issue <n>` via `gh`)
- [x] PRD mode (`s4c prd ingest|show|materialize`)
- [x] Plugin marketplace + upstream registry (`s4c plugin`, `s4c upstream`)
- [x] `@squad4cursor/sdk` + `s4c build` from `squad.config.*`
- [x] Local observability (`.squad/observability/`, `s4c observe`)
- [x] Engines documented as Node ≥20 (align toward ≥22.5 when depending on Brady tooling)

Phase C coexists with Brady’s Copilot CLI: Squad4Cursor owns Cursor orchestration, SpecKit/OpenSpec bridges, and the expanded CLI surface above.
