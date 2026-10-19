---
name: squad-speckit
description: >-
  Bridge SpecKit (.specify/) with Squad orchestration. Use when implementing an
  active SpecKit feature, updating tasks.md checkboxes, or aligning the team to
  constitution/spec/plan artifacts.
---

# Squad + SpecKit Bridge

SpecKit answers *what* and *how*. Squad answers *who* and *coordination*.

## Detect active feature

1. Look for `.specify/` in the repo.
2. Resolve the active feature directory from:
   - `.specify/feature.json` (or Spec Kit’s current feature pointer), or
   - env `SPECIFY_FEATURE_DIRECTORY`, or
   - ask the human which feature folder under `.specify/specs/` / feature dirs to use.
3. Load when present:
   - `spec.md`, `plan.md`, `tasks.md`
   - `.specify/memory/constitution.md` (or project constitution path)
   - optional: `data-model.md`, `contracts/`, `research.md`, `checklists/`

## Map artifacts → agents

| Artifact | Consumer |
| --- | --- |
| constitution | Lead (hard constraints) |
| spec.md | Lead + all implementers (acceptance) |
| plan.md | Lead, Backend, Frontend |
| tasks.md | Coordinator progress source |
| contracts / data-model | Backend (+ Frontend if API-facing) |
| checklists | Lead gate before implement |

## Implement flow

1. Lead confirms phase gates (Setup → Foundational → user stories → Polish). Do not skip blocking Foundational tasks.
2. Parse `tasks.md` checklist items. Respect dependency order.
3. Tasks marked `[P]` may run in parallel via Frontend/Backend/Tester Task subagents.
4. Assign by intent using `.squad/routing.md`.
5. **Progress source of truth**: check boxes in SpecKit `tasks.md` when a task is done (`[ ]` → `[x]`). Also append notable decisions to `.squad/decisions.md`.
6. Tester writes/adjusts tests from acceptance criteria while implementation proceeds when tasks allow.
7. On rejection, reviewer lockout applies; do not uncheck completed tasks unless the human requests a revert.

## Planning vs execution

- Prefer SpecKit skills/commands (`/speckit-specify`, `/speckit-plan`, `/speckit-tasks`, etc.) for authoring specs.
- Use this skill when the human says: "Team, implement the active SpecKit feature" or similar.

## Isolation

Specialists still load only their own charter/history plus the SpecKit files needed for their tasks — not other agents' histories.
