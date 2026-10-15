---
name: run-plan
description: "Workflow (manual): runs the implementation phase of Spec Driven Development for an approved plan — implementer (one pass or waves) → verification → plan-verifier ∥ architecture-reviewer → fix rounds on the delta until PASS → wrap-up. The spec (spec-creator) and the plan (implementation-planner) are made before it, separately. Use when the user types /run-plan or asks to implement an approved plan from docs/plans/. Never start it for an unapproved plan, and not for writing specs or plans."
argument-hint: "<plan path> [--notes \"clarifications\"] [--spec <path>] [--max-rounds N] [--review-model opus]"
disable-model-invocation: true
---

# /run-plan — approved plan → reviewed code

```
spec-creator ──► spec ──► implementation-planner ──► plan      (separate sessions, manual)
                                                       │
/sdd-engineering:run-plan <plan> ──────────────────────┘
  0 preflight ─► 1 implement (single pass | waves) ─► verification
  ─► 2 round 1: plan-verifier ∥ architecture-reviewer
  ─► 3 fix rounds: implementer fix ─► verification ─► reviewers on the delta  (≤ max rounds)
  ─► 4 wrap-up: summary · insights · next steps
```

Arguments: `$ARGUMENTS`

You are the **lead**. You don't write code and you don't review; you route paths between
agents, run the snapshot script, and decide the next step from short reports. Conventions
(paths, statuses, verification commands, hand-off rules):
`${CLAUDE_PLUGIN_ROOT}/references/conventions.md` — read §1, §3 and §5 once at preflight.

Agents: `sdd-engineering:implementer`, `sdd-engineering:plan-verifier`,
`architecture-review:architecture-reviewer`. Snapshot script:
`python3 "${CLAUDE_SKILL_DIR}/scripts/review_delta.py"`.

## Lead rules

- **Paths, not content.** Hand agents the plan, context-pack and report paths, round
  number, changed-file list, finding IDs. Never paste a plan, diff or report into a prompt,
  and don't read them yourself — the short forms are enough.
- **Writers run one at a time**, except implementers of one wave the plan marks parallel.
  Reviewers run together, read-only, on the same snapshot.
- **Never** commit, push, edit code yourself, or fix a finding in the lead session — it goes
  into an implementer brief.
- **Ask the user** only at the gates below: BLOCKED, scope change, max rounds reached,
  MEDIUM/LOW findings at the end.

## 0 — preflight (no agents)

1. No plan path, or the file doesn't exist → stop: "create a plan first with
   `claude --agent sdd-engineering:implementation-planner`".
2. Read the plan header only (`head -n 8`): title, `Status`, `Spec`, `Base`, context pack.
   `grep -n -A12 '^## Execution'` for mode and waves; `grep -n 'Review risk'`.
   `Status` is not `approved` → ask the user to confirm the plan is approved; no → stop.
3. `--notes` that only clarify → pass on; notes that add scope (new behaviour, endpoint,
   screen, acceptance criterion) → stop and send the user back to the planner.
4. `git status --short`: unrelated uncommitted changes → tell the user and ask whether to
   continue (they would mix into the diff and the scope check).
5. `slug` = plan file name without date prefix and `.md`.
6. Tell the user in ≤ 5 lines: plan, mode, waves, reviewers' model, max rounds (default 3).

## 1 — implement

- **single-agent**: one implementer —
  `plan: <path> · context: <pack> · steps: all · notes: <…>`.
- **multi-agent**: per wave in order, one fresh implementer per parallel group —
  `plan · context · wave: W<n> · steps: S… · parallel: yes|no · notes`. Parallel groups of
  one wave go out in **one message**.

After each implementer:
- `STATUS: BLOCKED` → stop; show the blocker and its question; resume with the answer in a
  new brief, or send the user back to the planner.
- `STATUS: PARTIAL` because steps are missing → one more fresh implementer for them.
  `PARTIAL` only because no test command exists → continue; it is reported at wrap-up.
- Red verification → one fresh implementer: `fix verification: <command> · output tail ·
  plan: <path>`. Red twice on the same command → ask the user.
- Keep each report's "Insight candidates" and "For reviewers" lines; drop the rest.

## 2 — review round 1 (full)

In **one message**:
- `sdd-engineering:plan-verifier`: `plan · spec · context · mode: full · round: 1 ·
  report: .sdd/review/<slug>/verify-r1.md`.
- `architecture-review:architecture-reviewer`: `plan · base: <Base> · round: 1 ·
  report: .sdd/review/<slug>/arch-r1.md` + the implementers' "For reviewers" lines.

`--review-model opus` or `Review risk: high` → pass `model: opus` to both, round 1 only.

Then snapshot: `python3 "${CLAUDE_SKILL_DIR}/scripts/review_delta.py" save r1 --slug <slug>`.

Verdicts: both PASS → step 4. Otherwise one list: plan-verifier `FAIL-*` rows and
architecture `CRITICAL`/`HIGH` findings. `CANNOT_VERIFY` caused by the environment
(no toolchain, no test command) is reported to the user, not "fixed".

## 3 — fix rounds (N = 2 … max-rounds + 1)

1. **One** fresh implementer with the whole batch: `fix round: <N> · plan · context ·
   findings: <ID — file:line — expected behaviour> · reports: <previous report paths>`.
2. Verification green (as in step 1).
3. Changed files since the last round:
   `python3 "${CLAUDE_SKILL_DIR}/scripts/review_delta.py" diff r<N-1> --slug <slug>`.
4. In one message: plan-verifier `mode: delta · round: <N> · previous: <verify report> ·
   changed: <file list>`; architecture-reviewer `round: <N> · changed: <file list> ·
   previous: <arch report>` — **skip the architecture pass** when the delta adds no files
   and changes no import lines (`git diff` of the delta has no `import`/`require`/`from`
   lines) and say so in the summary.
5. `review_delta.py save r<N> --slug <slug>`.
6. PASS → step 4. FAIL → next round. Max rounds reached and still failing → stop; list the
   open IDs, one line each, and ask: another round / accept and finish / re-plan.

Continue (SendMessage) a reviewer instead of respawning it when its context is still small;
fix-round implementers are always fresh.

## 4 — wrap-up

1. Summary (≤ 30 lines): plan, mode, rounds, final verdicts with report paths, verification
   commands and results, changed-file count, what was not verified and why.
2. MEDIUM/LOW architecture findings not fixed → list them and ask whether to run one more
   fix round.
3. Insights: if the repository keeps `INSIGHTS.md` files, run the
   `sdd-engineering:engineering-insights` wrap-up with the collected "Insight candidates"
   only; nothing new and verified → write nothing.
4. Next steps for the user, not run automatically: review and commit; then, in this same
   session, `/sdd-engineering:workflow-retro <slug>` to see where tokens and time went.

## Notes

- Re-running on the same plan finds `.sdd/review/<slug>/*-r<N>.md`: ask whether to resume at
  the next fix round or start over.
- `.sdd/` is working state; suggest adding it to `.gitignore` if it is not ignored yet.
