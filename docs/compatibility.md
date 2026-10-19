# Compatibility contract

Squad4Cursor and Brady Squad share one team state directory.

## Rules

1. **State lives in `.squad/` only.** Never scaffold `.squad4cursor/` or other parallel memory roots.
2. **Cursor owns** `.cursor/rules/squad.mdc`, `.cursor/skills/squad-*`, `.cursor/commands/squad-*`.
3. **Copilot owns** `.github/agents/squad.agent.md` (and related Copilot surfaces). `s4c` never deletes or overwrites that file.
4. **`s4c init` is idempotent.** Missing base files are created; existing `history.md` / `decisions.md` content is preserved.
5. **`s4c upgrade` refreshes Cursor adapters only.** It does not rewrite roster, casting, or decisions.
6. **One writer per session.** If Copilot and Cursor both mutate `.squad/` concurrently, last-write-wins; use git to reconcile.

## Recognized layout

```
.squad/
├── team.md
├── routing.md
├── decisions.md
├── ceremonies.md
├── config.json
├── squad4cursor.json          # optional marker written by s4c
├── casting/
├── agents/<id>/{charter.md,history.md}
├── identity/{now.md,wisdom.md}
├── skills/
├── decisions/inbox/
├── log/
└── orchestration-log/
```

## Switching runtimes

1. Commit `.squad/` (and Cursor adapters if you want them shared).
2. In Copilot: `copilot --agent squad` (or VS Code Squad agent).
3. In Cursor: open Agent chat; coordinator skill/rule activate when `.squad/` is present.
4. Avoid overlapping long-running agent sessions that both append to the same files.
