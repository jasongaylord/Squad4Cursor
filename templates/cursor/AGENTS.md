# Agent guide — Squad4Cursor

This project uses a human-led AI team. Shared state is in `.squad/` (compatible with Brady Gaster’s Squad for GitHub Copilot).

## Entry points

- Rule: `.cursor/rules/squad.mdc` (always on when present)
- Skill: `squad-coordinator` — route and spawn specialists
- Skill: `squad-speckit` — SpecKit bridge
- Skill: `squad-openspec` — OpenSpec bridge
- Skill: `squad-governance` — lockout, inbox, protected paths
- Commands: `/squad-status`, `/squad-cast`, `/squad-hire`, `/squad-nap`, `/squad-implement-speckit`, `/squad-apply-openspec`

## CLI

```bash
s4c status
s4c doctor
s4c cast --theme flight
s4c hire devops --role DevOps
s4c nap --dry-run
s4c watch --once
s4c upgrade
```

Prefer one runtime per session (Cursor or Copilot) when writing team state.
