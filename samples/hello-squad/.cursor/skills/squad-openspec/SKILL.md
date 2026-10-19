---
name: squad-openspec
description: >-
  Bridge OpenSpec (openspec/) with Squad orchestration. Use when applying an
  OpenSpec change, syncing/archiving with team memory, or implementing
  openspec/changes/*/tasks.md via specialists.
---

# Squad + OpenSpec Bridge

OpenSpec owns change proposals, delta specs, design, and archive. Squad owns parallel execution and persistent team memory.

## Detect changes

1. Confirm `openspec/` exists (`specs/`, `changes/`, optional `config.yaml`).
2. Identify the active change folder under `openspec/changes/<change-name>/` (not under `archive/`).
3. Load `proposal.md`, `design.md`, `tasks.md`, and delta `specs/` when present.

## Apply flow

1. Lead reviews proposal + design for conflicts with `.squad/decisions.md` and SpecKit constitution if both exist.
2. Sequence work from the change’s `tasks.md`.
3. Spawn Frontend/Backend/Tester in parallel for independent tasks.
4. Check off OpenSpec tasks as they complete.
5. Scribe appends architectural decisions to `.squad/decisions.md` (do not replace OpenSpec artifacts).
6. When implementation is done, remind the human to run OpenSpec archive/sync skills (`openspec-archive-change`, `openspec-sync-specs`, or `/opsx-archive` / `/opsx-sync`) — Squad does not fork the OpenSpec CLI.

## Relationship to OpenSpec Cursor skills

If `.cursor/skills/openspec-*` are installed (via `openspec init --tools cursor`), prefer them for propose/explore/archive. Use this skill to **orchestrate the team while applying** a change.

## Init hint

Humans can run `s4c init --with openspec` to attach adapters and, when the OpenSpec CLI is available, run `openspec init --tools cursor`.
