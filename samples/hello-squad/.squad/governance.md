# Governance

Enforced by Squad4Cursor coordinator skills and CLI helpers.

## Reviewer lockout

Enabled — when Tester or Lead rejects work, a *different* agent must fix it. Use `s4c lockout` to record.

## Protected paths

- `.squad/agents/`
- `.squad/decisions.md`
- `.squad/casting/`

Agents should not rewrite protected team-memory paths except via Scribe/coordinator protocols.

## Decision inbox

Drop proposed decisions in `.squad/decisions/inbox/*.md`, then run:

```bash
s4c inbox process
```
