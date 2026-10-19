---
description: Hire a new Squad specialist (updates .squad/ via s4c hire guidance).
---

# Hire specialist

Ask what role is needed, pick a stable agent id, then either:

```bash
s4c hire <id> --role "<Role Title>"
```

or create `.squad/agents/<id>/{charter.md,history.md}` and update `team.md` / `routing.md` following the hire command semantics. Seed from `decisions.md`. Offer casting with `s4c cast`.
