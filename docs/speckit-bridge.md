# SpecKit bridge

SpecKit defines *what* to build (`spec.md`), *how* (`plan.md`), and *task order* (`tasks.md`). Squad4Cursor assigns *who* runs those tasks and keeps team memory in `.squad/`.

## Prerequisites

```bash
# Spec Kit (example)
uv tool install specify-cli
specify integration install cursor-agent

# Squad4Cursor
s4c init --preset default
# or
s4c init --with-speckit
```

## Recommended flow

1. `/speckit-constitution` (once per project)
2. `/speckit-specify` → `/speckit-plan` → `/speckit-tasks`
3. In Cursor: **Team, implement the active SpecKit feature** or `/squad-implement-speckit`
4. Coordinator uses the `squad-speckit` skill:
   - Lead enforces constitution + phase gates
   - `[P]` tasks spawn parallel specialists
   - Checkboxes in SpecKit `tasks.md` are the progress source of truth
   - Architectural choices also append to `.squad/decisions.md`

## Mapping

| SpecKit | Squad |
| --- | --- |
| constitution | Lead constraints |
| spec / plan | Specialist context |
| tasks.md checkboxes | Implementation progress |
| decisions.md | Durable team memory (cross-session) |

## What we do not do

- Squad4Cursor does not replace Spec Kit’s CLI or `/speckit-*` planning skills.
- It does not invent a second task tracker for SpecKit work — update SpecKit checkboxes.
