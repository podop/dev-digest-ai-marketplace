#!/usr/bin/env bash
# Seeds a tiny Node repository with its own instructions and test command.
# Usage (from a case scaffold): bash "$(dirname "$0")/../_fixtures/todo-repo.sh" [--no-tests] [--with-spec] [--with-uncovered-spec]
set -euo pipefail
FIX_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NO_TESTS=0; WITH_SPEC=0; WITH_UNCOVERED=0
for a in "$@"; do
  case "$a" in --no-tests) NO_TESTS=1 ;; --with-spec) WITH_SPEC=1 ;; --with-uncovered-spec) WITH_UNCOVERED=1 ;; esac
done
mkdir -p src test
cat > CLAUDE.md <<'MD'
# todo-lib

Small library for in-memory todo lists. Plain Node.js (ESM), no runtime dependencies.

- Source in `src/`, tests in `test/` (node:test).
- Public API is exported from `src/index.js` only.
- Keep functions pure; no I/O in `src/`.
MD
if [ "$NO_TESTS" = 1 ]; then
  cat > package.json <<'JSON'
{ "name": "todo-lib", "version": "0.1.0", "type": "module", "main": "src/index.js" }
JSON
  sed -i '/tests in `test\//d' CLAUDE.md
else
  cat > package.json <<'JSON'
{ "name": "todo-lib", "version": "0.1.0", "type": "module", "main": "src/index.js",
  "scripts": { "test": "node --test test/" } }
JSON
  cat > test/todo.test.js <<'JS'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addTodo, listTodos } from '../src/index.js';

test('adds a todo', () => {
  const list = addTodo([], 'buy milk');
  assert.equal(listTodos(list).length, 1);
  assert.equal(list[0].done, false);
});
JS
fi
cat > src/todo.js <<'JS'
let nextId = 1;

export function addTodo(list, title) {
  if (!title || !title.trim()) throw new Error('title is required');
  return [...list, { id: nextId++, title: title.trim(), done: false }];
}

export function completeTodo(list, id) {
  return list.map((t) => (t.id === id ? { ...t, done: true } : t));
}

export function listTodos(list, { done } = {}) {
  return done === undefined ? list : list.filter((t) => t.done === done);
}
JS
cat > src/index.js <<'JS'
export { addTodo, completeTodo, listTodos } from './todo.js';
JS
if [ "$WITH_SPEC" = 1 ]; then
  mkdir -p specs
  cp "$FIX_DIR/todo-priority.spec.md" specs/todo-priority.md
fi
if [ "$WITH_UNCOVERED" = 1 ]; then
  mkdir -p specs
  cp "$FIX_DIR/todo-priority-uncovered.spec.md" specs/todo-priority.md
fi
git init -q -b main
git add -A
git -c user.email=eval@example.com -c user.name=eval commit -q -m "initial todo-lib"
