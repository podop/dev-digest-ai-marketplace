#!/usr/bin/env bash
set -euo pipefail
bash "$(dirname "$0")/../_fixtures/todo-repo.sh" --no-tests --with-spec
