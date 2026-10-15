#!/usr/bin/env bash
# Switch a plugin between the latest and stable channels of this marketplace (rollback and
# return). Run it in the repository where the plugin is installed. See docs/RELEASES.md#rollback.
#
#   scripts/switch-channel.sh stable [--plugin sdd-engineering] [--scope project|user|local]
#   scripts/switch-channel.sh latest [--plugin sdd-engineering] [--scope project|user|local]
#
# Overrides: LATEST_SOURCE (default podop/dev-digest-ai-marketplace),
#            STABLE_SOURCE (default: raw URL of channels/stable/.claude-plugin/marketplace.json on main).
set -euo pipefail

REPO="podop/dev-digest-ai-marketplace"
LATEST_NAME="dev-digest-ai-marketplace"
STABLE_NAME="dev-digest-ai-marketplace-stable"
LATEST_SOURCE="${LATEST_SOURCE:-$REPO}"
STABLE_SOURCE="${STABLE_SOURCE:-https://raw.githubusercontent.com/${REPO}/main/channels/stable/.claude-plugin/marketplace.json}"

target="${1:-}"
shift || true
plugin="sdd-engineering"
scope="project"
while [ $# -gt 0 ]; do
  case "$1" in
    --plugin) plugin="$2"; shift 2 ;;
    --scope) scope="$2"; shift 2 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

case "$target" in
  stable) to_name="$STABLE_NAME"; to_source="$STABLE_SOURCE"; from_name="$LATEST_NAME" ;;
  latest) to_name="$LATEST_NAME"; to_source="$LATEST_SOURCE"; from_name="$STABLE_NAME" ;;
  *) echo "usage: $0 stable|latest [--plugin <name>] [--scope project|user|local]" >&2; exit 2 ;;
esac

command -v claude >/dev/null || { echo "claude CLI not found" >&2; exit 1; }

step() { printf '\n==> %s\n' "$*"; }

step "1/5 make sure the ${target} channel (${to_name}) is known"
if claude plugin marketplace list 2>/dev/null | grep -q -- "${to_name}\b"; then
  claude plugin marketplace update "$to_name"
else
  claude plugin marketplace add "$to_source" --scope "$scope"
fi

step "2/5 uninstall ${plugin}@${from_name} (if installed)"
if claude plugin list --json 2>/dev/null | grep -q "\"${plugin}@${from_name}\""; then
  claude plugin uninstall "${plugin}@${from_name}" --scope "$scope" --keep-data
else
  echo "not installed from ${from_name} — skipping"
fi

step "3/5 install ${plugin}@${to_name} (dependencies come with it)"
claude plugin install "${plugin}@${to_name}" --scope "$scope"

step "4/5 remove dependencies the other channel no longer needs"
claude plugin prune --scope "$scope" -y || echo "nothing to prune"

step "5/5 installed versions"
claude plugin list --json | node -e '
  const names = process.argv.slice(1);
  let data = ""; process.stdin.on("data", (c) => (data += c)).on("end", () => {
    for (const p of JSON.parse(data)) {
      if (!names.some((n) => p.id.endsWith(`@${n}`))) continue;
      const extra = p.errors?.length ? `  ERRORS: ${JSON.stringify(p.errors)}` : "";
      console.log(`${p.id.padEnd(60)} ${String(p.version).padEnd(10)} ${p.scope}  ${p.enabled ? "enabled" : "disabled"}${extra}`);
    }
  });' "$LATEST_NAME" "$STABLE_NAME"

printf '\nNext: run /reload-plugins in Claude Code (or start a new session) and a smoke check.\n'
