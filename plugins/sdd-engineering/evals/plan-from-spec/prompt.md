---
description: The SDD plan step — implementation-planner plans from a ready spec without inventing requirements.
plugins: ["../..", "../../../engineering-paved-path", "../../../research-tools", "../../../architecture-review"]
runs: 3
max_turns: 40
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Agent, Skill, Write]
---

The spec in `specs/todo-priority.md` is approved. Use the implementation-planner agent to turn it into
an implementation plan saved as `docs/plans/todo-priority.md` (with its context pack next to it).
Single-agent execution is fine. I'm not available for questions: record any assumption in the plan.
Don't implement anything yet.
