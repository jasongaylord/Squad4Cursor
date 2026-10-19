# Squad4Cursor

Human-led AI agent teams for **Cursor**, sharing Brady Gaster’s [Squad](https://github.com/bradygaster/squad) **`.squad/`** state so you can bounce between **GitHub Copilot** and **Cursor** on the same repo.

Includes SpecKit + OpenSpec bridges, casting/hire/nap/governance, Ralph watch mode, GitHub Issues/PRD flows, plugins/upstreams, and a typed SDK.

## Quick start

```bash
npm install
npm run build
npm run dev:link

cd your-project
s4c init --preset default
s4c cast --theme flight
```

In Cursor: `/squad-cast`, `/squad-status`, or “Team, set up for this project…”

## Dual runtime

| Surface | Location |
| --- | --- |
| Team state | `.squad/` (shared) |
| Copilot | `.github/agents/squad.agent.md` |
| Cursor | `.cursor/rules`, `.cursor/skills`, `.cursor/commands` |

See [docs/compatibility.md](docs/compatibility.md).

## CLI (Phases A–C)

| Command | Purpose |
| --- | --- |
| `s4c init` | Scaffold/attach `.squad/` + Cursor adapters |
| `s4c status` / `doctor` / `upgrade` | Orient, validate, refresh adapters |
| `s4c cast` | Thematic persistent names |
| `s4c hire` / `retire` / `restore` | Team membership + alumni |
| `s4c nap` | Compress histories / archive logs |
| `s4c export` / `import` | Portable JSON snapshots |
| `s4c config` | Model profile + per-agent model hints |
| `s4c inbox` / `lockout` | Decision inbox + reviewer lockout records |
| `s4c watch` | Ralph poll loop (`--execute`, `--once`, `--health`) |
| `s4c triage` / `issue` | GitHub Issues via `gh` |
| `s4c prd` | PRD → backlog → issues |
| `s4c plugin` / `upstream` | Local plugin + upstream registry |
| `s4c observe` | Local JSONL observability |
| `s4c build` | Generate `.squad/` from `squad.config.*` (SDK) |

## SDK

```js
// squad.config.mjs
import { defineAgent, defineSquad, defineTeam } from "@squad4cursor/sdk";

export default defineSquad({
  team: defineTeam({ name: "Platform", members: ["@lead", "@backend"] }),
  agents: [
    defineAgent({ name: "lead", role: "Lead", model: "claude-sonnet" }),
    defineAgent({ name: "backend", role: "Backend" }),
  ],
});
```

```bash
s4c build
```

## SpecKit + OpenSpec

- [docs/speckit-bridge.md](docs/speckit-bridge.md)
- [docs/openspec-bridge.md](docs/openspec-bridge.md)

## Roadmap

[docs/roadmap.md](docs/roadmap.md) — Phases A–C marked complete for the current surface.

## License

MIT — inspired by [bradygaster/squad](https://github.com/bradygaster/squad) (MIT). Clean-room Cursor adapters and tooling.
