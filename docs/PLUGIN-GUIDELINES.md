# Plugin guidelines

How to decide what goes into a plugin, and how to write components that work in any repository.

## What belongs in this marketplace

Sort every candidate file into one of four groups before extracting it from a product:

| Group | Examples | Goes where |
|---|---|---|
| Reusable | skills, agents, evals, hooks without product paths | a plugin here |
| Project-specific | `CLAUDE.md`, product specs, module names, rules for one product | stays in the product |
| Optional integration | MCP servers, anything needing network access or credentials | its own plugin, opt-in, credentials via `userConfig` (`sensitive: true`) |
| Local leftovers | caches, personal memory, experiments, absolute paths | nowhere |

For each file you add you should be able to name its owner, its consumer scenario and why it
is versioned together with the rest of the plugin.

## Plugin boundaries

- A plugin is one release unit with one owner. Split when two parts change for different reasons
  or have different consumers.
- Shared technical guidance lives in `engineering-paved-path`; workflows depend on it.
- Generic agents useful on their own (`researcher`, `architecture-reviewer`) live in their own
  plugins so they can be installed without a workflow.
- Keep only skills that a workflow here needs or that have another real consumer. Every skill
  description is loaded into every session (`claude --plugin-dir <dir> plugin details <name>`
  shows the always-on cost).

## Writing portable components

- **No product knowledge.** No product names, module paths, package names or repository URLs of
  a product. Replace assumptions about repository structure with explicit inputs, or with
  discovery of the repository's own docs (`CLAUDE.md`, `AGENTS.md`, `ARCHITECTURE.md`, ADRs).
- **Repository rules win.** Components say so and defer to project instructions.
- **Paths.** Plugin-level files: `${CLAUDE_PLUGIN_ROOT}/…`. Files inside a skill:
  `${CLAUDE_SKILL_DIR}/…`. Both are substituted in Markdown before the model reads it; they are
  not environment variables in Bash. Persistent state: `${CLAUDE_PLUGIN_DATA}` — never the plugin
  root, which changes with every version.
- **Scripts** locate their own data relative to their file and operate on the user's repository
  through the working directory / `git rev-parse --show-toplevel`. Python: stdlib only, 3.9+.
- **Missing tools.** Describe what happens when something is absent (no test command, no
  architecture config, no INSIGHTS files): report it, never invent a command.
- **Namespaces.** Refer to dependency components by full name (`research-tools:researcher`).
  Your own components too, where the field expects a plugin-scoped reference.
- **One source per instruction.** Don't repeat a skill's content inside an agent prompt; point to
  the skill or to a reference file that is loaded on demand.

## Agents

- Frontmatter starts on line 1 with `name` and `description` (what + when + "Not for …").
- `tools` is an allowlist with the minimum needed; read-only agents also set
  `disallowedTools: Write, Edit, NotebookEdit`.
- Plugin agents ignore `hooks`, `mcpServers` and `permissionMode`; don't rely on them.
- Subagents cannot ask the user: return open questions in a fixed format.
- Hand-backs are short and fixed-format; long reports go to files.

## Skills

- `SKILL.md` short; details in supporting files read only when needed.
- Workflows that must not start on their own set `disable-model-invocation: true`.
- Descriptions say when to use and when not to.

## Evals

Every plugin with behavior (agents, workflow skills) ships evals in `evals/<case>/`:
`prompt.md` + at least one grader in `graders/`. Include at least one negative case (a request
that must **not** trigger the component). Schema validation checks the shape; evals check that
the composition does the right work — both are required.
