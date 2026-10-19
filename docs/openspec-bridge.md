# OpenSpec bridge

OpenSpec owns proposals, delta specs, design, tasks, sync, and archive. Squad4Cursor orchestrates specialists while **applying** a change and records team decisions in `.squad/decisions.md`.

## Prerequisites

```bash
npm i -g @fission-ai/openspec@latest
openspec init --tools cursor

s4c init --preset default
# or
s4c init --with-openspec
```

## Recommended flow

1. `/opsx-propose` or `openspec-propose` (OpenSpec skills)
2. Refine design/tasks as needed
3. In Cursor: **Team, apply OpenSpec change \<name\>** or `/squad-apply-openspec`
4. Coordinator uses `squad-openspec`:
   - Lead reviews against existing decisions
   - Specialists implement from `openspec/changes/<name>/tasks.md`
   - Check off OpenSpec tasks; append architecture notes to `.squad/decisions.md`
5. Human runs OpenSpec archive/sync (`/opsx-archive`, `/opsx-sync`) — not forked by `s4c`

## Boundaries

| Concern | Owner |
| --- | --- |
| proposal / design / delta specs / archive | OpenSpec |
| parallel specialists + reviewer lockout | Squad4Cursor |
| cross-session team memory | `.squad/decisions.md` + agent histories |
