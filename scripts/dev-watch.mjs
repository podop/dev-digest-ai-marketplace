#!/usr/bin/env node
// Runs the site dev server and rebuilds the catalog index whenever files under
// plugins/ or .claude-plugin/ change. Extra arguments (e.g. `--root <dir>`) are
// passed to build-index.mjs.
//
// Usage: npm run dev:watch [-- --root <dir>]

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUILD_SCRIPT = path.join(REPO, 'scripts', 'build-index.mjs');
const SITE_DIR = path.join(REPO, 'site');
const DEBOUNCE_MS = 300;
const extraArgs = process.argv.slice(2);
const rootIdx = extraArgs.indexOf('--root');
const watchRoot = rootIdx !== -1 && extraArgs[rootIdx + 1] ? path.resolve(extraArgs[rootIdx + 1]) : REPO;
const WATCHED = ['plugins', '.claude-plugin'];

const first = spawnSync(process.execPath, [BUILD_SCRIPT, ...extraArgs], { stdio: 'inherit' });
if (first.status !== 0) process.exit(first.status ?? 1);

if (!fs.existsSync(path.join(SITE_DIR, 'node_modules'))) {
  console.error('dev-watch: site dependencies are missing; run `cd site && npm ci` first.');
  process.exit(1);
}

// Start Vite directly (the site's `dev` script would rebuild the index a second time).
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const server = spawn(npm, ['run', 'dev:vite'], { cwd: SITE_DIR, stdio: 'inherit' });
server.on('exit', (code) => {
  closeWatchers();
  process.exit(code ?? 0);
});

let timer = null;
let building = false;
let pending = false;

function rebuild() {
  if (building) {
    pending = true;
    return;
  }
  building = true;
  const child = spawn(process.execPath, [BUILD_SCRIPT, ...extraArgs], { stdio: 'inherit' });
  child.on('exit', () => {
    building = false;
    if (pending) {
      pending = false;
      rebuild();
    }
  });
}

function schedule(reason) {
  clearTimeout(timer);
  timer = setTimeout(() => {
    console.log(`dev-watch: change detected (${reason}), rebuilding index...`);
    rebuild();
  }, DEBOUNCE_MS);
}

const watchers = new Map();
function watchDir(name) {
  const dir = path.join(watchRoot, name);
  if (watchers.has(name) || !fs.existsSync(dir)) return;
  try {
    const watcher = fs.watch(dir, { recursive: true }, (_event, file) => schedule(path.join(name, String(file ?? ''))));
    watcher.on('error', () => {
      watcher.close();
      watchers.delete(name);
    });
    watchers.set(name, watcher);
  } catch (err) {
    console.warn(`dev-watch: cannot watch ${dir}: ${err.message}`);
  }
}

function closeWatchers() {
  for (const w of watchers.values()) w.close();
  watchers.clear();
}

WATCHED.forEach(watchDir);
// Pick up watched directories that are created (or re-created) later.
const rootWatcher = fs.watch(watchRoot, (_event, file) => {
  if (file && WATCHED.includes(String(file))) {
    watchDir(String(file));
    schedule(String(file));
  }
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    rootWatcher.close();
    closeWatchers();
    server.kill(signal);
  });
}
console.log(`dev-watch: watching ${WATCHED.map((d) => path.join(watchRoot, d)).join(', ')}`);
