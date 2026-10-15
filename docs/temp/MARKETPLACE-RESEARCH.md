# Marketplace research (temporary)

> Working notes collected while building this marketplace. Delete this folder once the plugins
> are released; the durable rules live in CONTRIBUTING.md, docs/PLUGIN-GUIDELINES.md,
> docs/RELEASES.md and docs/SECURITY.md. Checked against Claude Code 2.1.300 on 2026-10-15.

## Official documentation

| Topic | Source |
|---|---|
| marketplace.json | https://code.claude.com/docs/en/plugins/marketplace-reference.md |
| plugin.json | https://code.claude.com/docs/en/plugins/manifest-reference.md |
| Dependencies | https://code.claude.com/docs/en/plugins/dependencies.md |
| Loading, cache, auto-update | https://code.claude.com/docs/en/plugins/loading.md |
| Hosting, release channels | https://code.claude.com/docs/en/plugins/host-marketplace.md |
| CLI | https://code.claude.com/docs/en/plugins/cli-reference.md |
| Troubleshooting | https://code.claude.com/docs/en/plugins/troubleshooting.md |
| Evals | https://code.claude.com/docs/en/plugin-evals.md |
| Skills / subagents | https://code.claude.com/docs/en/skills.md · https://code.claude.com/docs/en/sub-agents.md |

## Findings

**marketplace.json** — required: `name`, `owner.name`, `plugins[]` (`name`, `source`). Relative
sources start with `./` and resolve from the marketplace root. Other source forms: `github`
(`repo`, `ref`, `sha`), `url`, `git-subdir` (`url`, `path`, `ref`, `sha`), `npm`, `archive`;
`sha` wins over `ref`. Reserved names include `claude-plugins-official`, `inline`, `builtin`,
`skills-dir`, `npm`, `github` and anything starting with `claudeai-`.

**Version** — `plugin.json` `version` wins over the marketplace entry; validate warns on a
mismatch. Keep it in one place (`plugin.json`). Without a version the commit SHA (12 chars) is the
version, and every commit becomes an update.

**Dependencies** — `[{ "name": "x", "version": "^1.0.0" }]` (plain strings also allowed). A
range resolves to the highest git tag `<plugin>--v<version>` that satisfies it, in the repository
that hosts the plugin (for relative paths: this repository). No tag → "has no git tag satisfying
<range>". So dependency plugins must be tagged before a consumer can be installed from GitHub.
Cross-marketplace dependencies need `marketplace` on the dependency plus
`allowCrossMarketplaceDependenciesOn` in the root marketplace.

**Namespacing** — skills `/<plugin>:<skill>`, agents `<plugin>:<agent>`
(`claude --agent sdd-engineering:spec-creator`, `@agent-<plugin>:<agent>`).

**Plugin agents** ignore `hooks`, `mcpServers`, `permissionMode` (and `initialPrompt`).
Hooks ship in `hooks/hooks.json`, MCP servers in `.mcp.json`.

**Path variables** — `${CLAUDE_PLUGIN_ROOT}` and `${CLAUDE_PLUGIN_DATA}` are substituted in skill,
command and agent bodies, hooks, MCP and LSP config. `${CLAUDE_SKILL_DIR}` is substituted in a
skill body and its `allowed-tools` rules. None of them is an environment variable inside Bash
tool commands — the text is substituted before the model sees it. `PLUGIN_ROOT` changes on every
version; persistent state goes to `PLUGIN_DATA` (`~/.claude/plugins/data/<id>/`).

**Cache** — installs are copied to `~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/`.
Files outside the plugin directory are not copied; symlinks leaving the marketplace are skipped.

**Release channels** — two marketplaces with different names pointing at different refs or
SHAs; users add the one they want. There is no `plugin rollback` command: roll back by moving to
a channel pinned at the old release, or by publishing a fix.

**Auto-update** — off by default for third-party marketplaces. Turn on per marketplace with the
`/plugin` toggle or `autoUpdate: true` on an `extraKnownMarketplaces` entry. `DISABLE_UPDATES`,
`DISABLE_AUTOUPDATER` or `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` disable it unless
`FORCE_AUTOUPDATE_PLUGINS=1`.

**Validation** — `claude plugin validate <dir>` checks a marketplace or plugin manifest plus
component files. `--strict` turns warnings into failures (the lab text says it does not exist;
it does in 2.1.300). The marketplace-root run does not open plugin components, so CI validates
each plugin directory too.

**Evals** — `claude plugin eval <plugin dir>` runs `evals/<case>/prompt.md` +
`evals/<case>/graders/*.md` (grader types `regex`, `tool_used`, `tool_order`, `file_exists`,
`llm`, `baseline`). `runs` defaults to 3. Results land in `<eval dir>/results/<timestamp>/` with
`aggregate-result.json` (`costUsd`, `durationSeconds`) and `report.html`. CI form:
`claude plugin eval . --trust-plugin --json results.json --threshold 0.8 --no-publish --max-cost-usd 20`.

**Token cost** — `claude --plugin-dir <dir> plugin details <name>` prints the always-on
(discovery) cost per session and the on-invoke cost per component.

## Community practices

- Validate the marketplace and every plugin with `--strict` in CI.
- One version source; bump it on every user-visible change.
- README + CHANGELOG per plugin; no absolute paths; bundled scripts through `${CLAUDE_PLUGIN_ROOT}`
  / `${CLAUDE_SKILL_DIR}`.
- No secrets in the repository; use `userConfig` with `sensitive: true`.
- Short, specific skill descriptions — they are always loaded and drive selection.
- CODEOWNERS on `.claude-plugin/` and `plugins/` with a ruleset that requires owner review.

## Unverified

- Minimum Claude Code version for version-constrained dependencies (the lab states >= 2.1.110).
- `range-conflict` / `no-matching-tag` as `plugin list --json` status names (present in the
  binary, not in the docs).
- Whether an agent's `tools: Agent(<plugin>:<agent>)` accepts a dependency's namespaced agent —
  checked by the behavior evals of `sdd-engineering`.
