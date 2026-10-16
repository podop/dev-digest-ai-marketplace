# sdd-engineering evals

Behavior evals for `claude plugin eval`. The fixed scenario: a user asks for a spec and a plan for a
small feature (priority for todos) in a tiny repository that has its own `CLAUDE.md` and test command.

| Case | Checks | Tags |
|---|---|---|
| `spec-small-feature` | spec-creator runs, writes the spec where asked, ACs trace to FRs with a verify method, no implementation details, status left as draft | cost-baseline |
| `plan-from-spec` | implementation-planner plans from the ready spec, covers every AC, uses the repo's test command, invents nothing | cost-baseline |
| `plan-no-test-command` | without a test command the plan says so instead of inventing one | edge |
| `spec-ac-gate` | (1.1.0) a spec whose FR3 has no AC stays draft when the user approves it as is; the reply names FR3 | v1.1.0 |
| `negative-unrelated-question` | an unrelated question starts no SDD agent or skill and writes no files | negative, cost-baseline |

`_fixtures/todo-repo.sh` seeds the repository (git, `CLAUDE.md`, `package.json`, `src/`, `test/`);
cases call it from their `scaffold.sh`, so runs need `--scaffold`. Dependency plugins are loaded
from sibling directories through `plugins:` in each `prompt.md`.

```bash
# from plugins/sdd-engineering
claude plugin eval . --trust-plugin --scaffold --allow-tools Write Edit --ablation none --no-publish
# cost baseline subset
claude plugin eval . --trust-plugin --scaffold --allow-tools Write Edit --ablation none --no-publish --tag cost-baseline
```

`--ablation none` skips the no-plugin arm (the cases name plugin agents, so a baseline arm cannot
pass them anyway) and halves the cost. Bash is not granted: on Linux it needs `bubblewrap` and
`socat` for the eval sandbox; the agents fall back to Read/Grep/Glob. Results go to `results/`
(git-ignored).
