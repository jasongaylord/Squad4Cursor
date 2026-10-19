---
name: squad-governance
description: >-
  Enforce Squad governance: reviewer lockout, protected .squad/ paths, and
  decision inbox processing. Use when rejecting work, promoting inbox decisions,
  or when agents attempt to rewrite team memory unsafely.
---

# Squad Governance

## Reviewer lockout

When Tester or Lead **REJECT**s work:

1. Do not assign the same agent to revise it.
2. Record with `s4c lockout --agent <id> --reviewer <id> --reason "..." --assign <other>`.
3. Assign a different implementer (or Lead).

## Protected paths

Unless acting as Scribe/coordinator for memory updates, avoid destructive rewrites of:

- `.squad/agents/**/history.md` (append/summarize only)
- `.squad/decisions.md` (append; supersede explicitly)
- `.squad/casting/**`

Read `.squad/config.json` → `governance.protectedPaths`.

## Decision inbox

1. Proposed decisions may land in `.squad/decisions/inbox/*.md`.
2. Run `s4c inbox process` (or process via this skill) to append to `decisions.md`.
3. Lead confirms status `accepted` vs `proposed`.

## File-write guard (agent protocol)

Before overwriting a protected path, stop and ask the human or route through Scribe.
