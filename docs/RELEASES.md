# Releases, updates and rollback

## Versioning

Each plugin is versioned on its own with [SemVer](https://semver.org/). The version lives only in
`plugins/<name>/.claude-plugin/plugin.json`.

| Change | Bump | Examples |
|---|---|---|
| Breaking | MAJOR | renamed or removed agent/skill; changed output format or artifact path a consumer relies on; removed tool; dependency moved to a new major |
| Backward-compatible behavior | MINOR | new component; new optional input; stricter quality gate that keeps the old outputs valid (e.g. spec-creator requires acceptance criteria) |
| Fix | PATCH | wording, bug fix, docs, eval-only changes that ship |

Every version has a `## [x.y.z] - YYYY-MM-DD` section in the plugin's `CHANGELOG.md`.
Unreleased work may sit under `## [Unreleased]`; the version is bumped in the pull request that
prepares the release.

## Tags

A release is an immutable git tag `<plugin>--v<version>` on a commit of `main` that passed CI:

```
engineering-paved-path--v1.0.0
research-tools--v1.0.0
architecture-review--v1.0.0
sdd-engineering--v1.0.0
```

Claude Code resolves dependency ranges (`"version": "^1.0.0"`) to the highest tag of the
dependency that satisfies the range. A consumer can therefore only be installed from GitHub after
its dependencies are tagged. **Never move or delete a tag**; publish a new version instead.

## Cutting a release

Releases are cut from an up-to-date, clean `main` after the release pull request is merged and CI
is green.

```bash
git switch main && git pull
node scripts/release.mjs --all --dry-run     # what would be tagged, in dependency order
node scripts/release.mjs --all --push        # tag and push every untagged version
# or one plugin:
node scripts/release.mjs sdd-engineering --push
```

`scripts/release.mjs` refuses to tag when the tree is dirty, `main` is behind `origin/main`, the
changelog has no section for the version, the tag already exists, or a dependency range has no
satisfying tag yet. It then runs `scripts/check-plugins.mjs`, `claude plugin validate --strict`
and finally `claude plugin tag` (which checks that `plugin.json` and the marketplace entry agree
and creates the annotated tag). Before tagging, look at the CHANGELOG entry, the commit SHA and
the eval results for that commit.

After the tags are pushed, users on the `latest` channel get the release on their next update;
the stable channel moves only when it is re-pinned (below).

## Channels

| Channel | Marketplace name | Source | Moves when |
|---|---|---|---|
| latest | `dev-digest-ai-marketplace` | `podop/dev-digest-ai-marketplace` (default branch) | a pull request merges and its tags are pushed |
| stable | `dev-digest-ai-marketplace-stable` | `channels/stable/.claude-plugin/marketplace.json` | a maintainer re-pins it |

The stable marketplace lists every plugin with a `git-subdir` source pinned to the `ref` **and**
`sha` of a released tag, so its content cannot change unless the file changes.

```bash
node scripts/channel.mjs list                         # stable pins vs. newest tags
node scripts/channel.mjs pin sdd-engineering@1.0.0    # pin one plugin
node scripts/channel.mjs pin --latest                 # promote every plugin's newest tag
node scripts/channel.mjs check                        # pins still match their tags (CI runs this)
```

Commit the changed channel file through a pull request.

## Updating (users)

Catalog and plugin are updated separately:

```bash
claude plugin marketplace update dev-digest-ai-marketplace          # refresh the catalog
claude plugin update sdd-engineering@dev-digest-ai-marketplace --scope project
```

Then start a new session or run `/reload-plugins`. `claude plugin list --json` shows the installed
version and its dependencies.

Auto-update is off by default for third-party marketplaces. Turn it on per marketplace in
`/plugin` → Marketplaces, or in the project's `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "dev-digest-ai-marketplace": {
      "source": { "source": "github", "repo": "podop/dev-digest-ai-marketplace" },
      "autoUpdate": true
    }
  },
  "enabledPlugins": { "sdd-engineering@dev-digest-ai-marketplace": true }
}
```

## Rollback

There is no `plugin rollback` command. Rolling back means switching to the stable channel, which is
pinned to a release that passed its evals, and switching back once `latest` is fixed.

```bash
scripts/switch-channel.sh stable --scope project    # leave latest, install from stable
# ... smoke eval, then later:
scripts/switch-channel.sh latest --scope project    # return to latest
```

`scripts/switch-channel.sh` runs, in order: add the target marketplace (if missing) → uninstall
the plugin from the other channel → install it from the target channel (dependencies come along) →
disable nothing else → print `claude plugin list --json` for the plugin. Then run `/reload-plugins`
or start a new session, and a smoke check (for example the `negative-unrelated-question` and
`spec-small-feature` evals, or the quick start on a throwaway branch).

What is kept: everything `sdd-engineering` produces lives in your repository (`specs/`,
`docs/plans/`, `.sdd/`, `INSIGHTS.md`, `docs/retros/ledger.md`) and is untouched by switching.
The plugin keeps no data in `${CLAUDE_PLUGIN_DATA}`. Plugins that do keep data must document how
it is migrated between channels in their COMPATIBILITY.md.

External state: `sdd-engineering` only writes files in your repository; it does not call external
services. If a release wrote something wrong, review it with `git status` / `git diff` and revert
it with git as usual.

If a release is unsafe (not just buggy), follow [SECURITY.md](SECURITY.md#after-an-unsafe-release).
