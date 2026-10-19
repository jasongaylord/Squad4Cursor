# Agent guide — Squad4Cursor

This project uses a human-led AI team. Shared state is in `.squad/` (compatible with Brady Gaster’s Squad for GitHub Copilot).

## Entry points

- Rule: `.cursor/rules/squad.mdc` (always on when present)
- Skill: `squad-coordinator` — route and spawn specialists
- Skill: `squad-speckit` — SpecKit bridge
- Skill: `squad-openspec` — OpenSpec bridge
- Commands: `/squad-status`, `/squad-cast`, `/squad-implement-speckit`, `/squad-apply-openspec`

## CLI

```bash
s4c status
s4c doctor
s4c upgrade
```

Prefer one runtime per session (Cursor or Copilot) when writing team state.
