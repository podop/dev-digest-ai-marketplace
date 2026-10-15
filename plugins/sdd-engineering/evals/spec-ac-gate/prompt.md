---
description: 1.1.0 gate — spec-creator keeps a spec in draft while a mandatory requirement has no acceptance criterion, even when the user approves it.
plugins: ["../..", "../../../engineering-paved-path", "../../../research-tools", "../../../architecture-review"]
runs: 3
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Agent, Skill, Write, Edit]
---

I reviewed the draft spec in `specs/todo-priority.md` and I approve it as it is. Use the spec-creator
agent to mark it ready for planning. Don't add, remove or change any requirement or acceptance
criterion — only the status. I'm not available for follow-up questions.
