# Cost baseline — sdd-engineering

How much the short SDD workflow costs, and whether one optimization reduced that cost without
lowering quality.

## Setup

| | |
|---|---|
| Scenario | "Prepare a spec and a plan for a small feature" — priority for todos in a tiny Node repository with its own `CLAUDE.md` and test command |
| Eval set | `plugins/sdd-engineering/evals/` — `spec-small-feature` (3 runs), `plan-from-spec` (3), `plan-no-test-command` (2), `negative-unrelated-question` (3) |
| Quality gate | every case score ≥ 0.75 (`--threshold 0.75`), no critical false negative: the negative case must score 1.00 and no case may lose its `*-used` / file / traceability graders |
| Plugins | `sdd-engineering@1.0.0` with `engineering-paved-path`, `research-tools`, `architecture-review` from the same commit |
| Model | `claude-opus-5-5` — from the agents' frontmatter (spec-creator and implementation-planner are opus; the lead session runs on the default model) |
| Claude Code | 2.1.300 |
| Tools granted | `Write`, `Edit` (Bash needs `socat` for the eval sandbox on Linux and was not granted, so agents used Read/Grep/Glob) |
| Command | `claude plugin eval plugins --eval-dir sdd-engineering/evals --trust-plugin --scaffold --allow-tools Write Edit --ablation none --no-publish --keep-temp --threshold 0.75` |
| Report | `node scripts/cost-report.mjs <results dir>` (tokens, API and tool calls from each run's trace) |

`--ablation none` skips the no-plugin arm: the cases ask for plugin agents by name, so a baseline
arm cannot pass them and would only double the cost. Costs are Claude Code's list-price estimates;
medians exclude judge cost.

## Baseline — commit `1df1d10`

| Case | Runs | Pass | Median cost | Median latency | Input | Output | Cache read | Cache write | API calls | Tool calls | Subagents |
|---|---|---|---|---|---|---|---|---|---|---|---|
| negative-unrelated-question | 3 | 100% | $0.070 | 9 s | 2 | 146 | 5,935 | 8,199 | 1 | 0 | 0 |
| plan-from-spec | 3 | 100% | $0.400 | 104 s | 16 | 9,614 | 112,163 | 27,516 | 7 | 13 | 1 |
| plan-no-test-command | 2 | 100% | $0.404 | 117 s | 14 | 10,785 | 94,118 | 27,498 | 6 | 11 | 1 |
| spec-small-feature | 3 | 100% | $0.626 | 191 s | 16 | 18,607 | 109,235 | 36,529 | 7 | 11 | 1 |
| **all** | 11 | 100% | $0.400 | 116 s | 14 | 10,265 | 94,578 | 27,377 | 6 | 11 | 1 |

Total $4.00 including judges. Critical errors: none. Every case scored 1.00.

Per-run spread (cost / latency): spec $0.67 / 191 s, $0.63 / 195 s, $0.49 / 151 s;
plan $0.43 / 104 s, $0.37 / 94 s, $0.40 / 116 s. Run-to-run noise is therefore about ±15 % on
the spec case and ±7 % on the plan case; a smaller difference is not a result.

Where the money goes (spec case): output tokens (the spec itself, ~18 k tokens) and cache writes
of new context dominate; cache reads are cheap. A shorter agent prompt saves little; avoiding
reads of large files saves more.

## Optimization — one change

**Source of extra context:** every agent prompt restated the shared rules it needs *and* told the
agent to read `references/conventions.md` (6 KB, ≈ 1.6 k tokens). The traces show that file read
in 10 of 11 baseline runs (every planner run, 2 of 3 spec runs), costing a tool round trip plus a
cache write that is re-read on every later turn.

**Change (commit `46caf33`):** agents carry the rules they need inline (skill table and
verification-command order copied into the planner, implementer and verifier) and no longer read
`conventions.md`; the file stays as the maintainers' reference. Model, routing and eval set are
unchanged.

**Expected effect:** ≈ 1.6 k fewer cache-write tokens and one fewer API round trip per agent —
roughly $0.01 and a few seconds per run, i.e. below the measured noise.

## Result — commit `46caf33` (released as 1.0.0 at `1246d51`)

Same eval set, model, Claude Code version and flags.

| Case | Runs | Pass | Median cost | Median latency | Output | Cache read | Cache write | API calls | Tool calls |
|---|---|---|---|---|---|---|---|---|---|
| negative-unrelated-question | 3 | 100% | $0.069 | 9 s | 134 | 5,935 | 8,199 | 1 | 0 |
| plan-from-spec | 3 | 100% | $0.370 | 97 s | 9,642 | 104,454 | 24,667 | 7 | 11 |
| plan-no-test-command | 2 | 100% | $0.411 | 116 s | 11,466 | 101,753 | 26,066 | 7 | 10 |
| spec-small-feature | 3 | 100% | $0.577 | 204 s | 17,894 | 108,290 | 32,700 | 7 | 10 |
| **all** | 11 | 100% | $0.383 | 107 s | 10,041 | 104,454 | 25,111 | 7 | 10 |

Total $4.06 including judges (baseline $4.00). Critical errors: none.

| Metric (median, all runs) | Baseline | Optimized | Change |
|---|---|---|---|
| Runs that read `conventions.md` | 10 / 11 | 0 / 11 | removed — deterministic |
| Tool calls | 11 | 10 | −1 |
| Cache-write tokens | 27,377 | 25,111 | −8 % |
| Cost | $0.400 | $0.383 | −4 % — **within noise** |
| Latency | 116 s | 107 s | −8 % — **within noise** |
| Total suite cost | $4.00 | $4.06 | +1.5 % — within noise |
| Pass rate / quality gate | 11/11, green | 11/11, green | unchanged |

### Cost per successful workflow

One workflow = the fixed scenario end to end: a spec (`spec-small-feature`) plus a plan
(`plan-from-spec`). Cost per successful workflow = total cost of those runs ÷ number of complete
workflows whose spec and plan both passed.

| | Successful workflows | Total cost | Cost per successful workflow | Excl. judges | Wall time per workflow |
|---|---|---|---|---|---|
| Baseline `1df1d10` | 3 / 3 | $2.986 | **$0.995** | $0.991 | 284 s |
| Optimized `46caf33` | 3 / 3 | $3.023 | **$1.008** | $1.003 | 298 s |
| Change | — | +1.2 % | **+1.3 % (within noise)** | | +5 % (within noise) |

**Verdict.** The quality gate stays green and no false negatives appeared (the negative case still
scores 1.00). The change does what it targets: the extra file read is gone in every run, with one
tool call and ~2 k cache-write tokens less per agent. The cost and latency differences are smaller
than the run-to-run spread (spec case $0.49–$0.75 within one configuration), so **no saving in
money or time is claimed**. The change is kept because it removes a duplicated source of
instructions and lowers context at no quality cost.

**What would move the number:** output tokens dominate (the spec case writes ~18 k tokens of spec
for a five-requirement feature). A proportionality rule for small specs is the next candidate, to
be measured the same way.

Reproduce: run the command from Setup on each commit, then
`node scripts/cost-report.mjs <results dir>`.
