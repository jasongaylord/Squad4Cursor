# Routing

Who handles what. The coordinator uses this table when spawning specialists.

| Intent | Primary | Supporting | Review |
| --- | --- | --- | --- |
| Architecture / scope / trade-offs | Lead | — | Lead |
| UI / client state / UX | Frontend | Lead | Tester, Lead |
| API / data / server logic | Backend | Lead | Tester, Lead |
| Tests / coverage / edge cases | Tester | — | Lead |
| Memory / decisions / session log | Scribe | — | — |
| Ambiguous / multi-surface feature | Lead | Frontend, Backend, Tester | Lead, Tester |

## Rules

1. Prefer parallel specialists when work is independent.
2. Lead defines contracts before Frontend and Backend diverge.
3. Tester may reject work; a different agent must fix rejected work (reviewer lockout).
4. Scribe never implements product code — only records knowledge.
