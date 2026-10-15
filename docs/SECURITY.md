# Security

Plugins from this marketplace run inside colleagues' sessions with their permissions. Treat
every change as code that executes on someone else's machine.

## Rules for contributions

1. **No secrets.** No API keys, tokens, passwords, private URLs with credentials or `.env` files
   in any plugin, manifest, eval or fixture. Plugins that need credentials declare them in
   `userConfig` with `sensitive: true`; never in `plugin.json` values or the marketplace.
2. **No absolute paths** (`/home/…`, `/Users/…`, `C:\…`) and no paths into a specific product.
   Use `${CLAUDE_PLUGIN_ROOT}`, `${CLAUDE_SKILL_DIR}`, `${CLAUDE_PLUGIN_DATA}` or repository-relative
   discovery.
3. **Least privilege.** Agents list only the tools they need; read-only agents disallow
   Write/Edit/NotebookEdit. Skills restrict Bash through `allowed-tools` where possible.
4. **No network or install side effects by default.** Hooks and MCP servers that call the network
   go into a separate, opt-in integration plugin and are documented in its COMPATIBILITY.md.
5. **No destructive commands** in prompts or scripts (history rewrites, `rm -rf` outside a temp
   dir, force pushes, dropping databases, container volume removal).
6. **Untrusted content stays untrusted.** The catalog site sanitizes all rendered Markdown with
   DOMPurify; scripts never `eval` repository content.

`scripts/check-plugins.mjs` (run in CI as `Validate harness`) fails on common secret patterns,
absolute home paths and product-specific names. It is a safety net, not a review.

## Reporting a problem

Open a private security advisory on the repository (Security → Advisories → Report a
vulnerability) or contact the owners listed in CODEOWNERS. Do not open a public issue for a leaked
secret or an exploitable plugin.

## After an unsafe release

1. **Contain.** Pin the stable channel to the last safe release
   (`node scripts/channel.mjs pin <plugin>@<safe version>`), merge, and tell users to switch:
   `scripts/switch-channel.sh stable` (see [RELEASES.md](RELEASES.md#rollback)).
2. **Fix forward.** Publish a patch version that removes the problem. Never move or delete a
   released tag — consumers and the stable channel rely on tags being immutable; a new version
   is the only way forward on `latest`.
3. **Rotate.** If a secret was published, rotate it at the provider immediately; removing it from
   git history does not un-publish it (forks, caches and clones keep it).
4. **External state.** If the plugin could have changed state outside the repository (files in
   users' projects, remote services), document what it touched and how to undo it in the
   CHANGELOG entry of the fix and in the advisory.
5. **Post-mortem** in the pull request of the fix: what got through, which check should have
   caught it, and the check that now does.
