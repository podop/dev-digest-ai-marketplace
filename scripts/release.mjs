#!/usr/bin/env node
// Release one plugin, or every plugin with an untagged version in dependency order.
// Wraps `claude plugin tag` with the checks a release needs. See docs/RELEASES.md.
//
//   node scripts/release.mjs <plugin> [--push] [--dry-run] [--allow-branch]
//   node scripts/release.mjs --all     [--push] [--dry-run] [--allow-branch]
//
// Checks, per plugin: clean working tree · on main and level with origin/main · CHANGELOG has
// the version · the tag does not exist yet · every dependency range is satisfied by an existing
// tag (or by a plugin released earlier in this run) · harness checks · strict validation.

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { satisfies } from './lib/semver.mjs';

const argv = process.argv.slice(2);
const flag = (f) => argv.includes(f);
const PUSH = flag('--push');
const DRY = flag('--dry-run');
const ALL = flag('--all');
const target = argv.find((a) => !a.startsWith('--'));

const ROOT = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const sh = (cmd, args, opts = {}) => (execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', ...opts }) ?? '').trim();
const fail = (msg) => {
  console.error(`release: ${msg}`);
  process.exit(1);
};

const market = JSON.parse(readFileSync(join(ROOT, '.claude-plugin/marketplace.json'), 'utf8'));
const manifests = new Map(
  market.plugins.map((e) => [e.name, JSON.parse(readFileSync(join(ROOT, e.source, '.claude-plugin/plugin.json'), 'utf8'))]),
);
const depsOf = (name) =>
  (manifests.get(name).dependencies ?? []).map((d) =>
    typeof d === 'string' ? { name: d.split('@')[0], version: d.split('@')[1] ?? '*' } : { version: '*', ...d },
  );
const tagsOf = (name) =>
  sh('git', ['tag', '--list', `${name}--v*`])
    .split('\n')
    .filter(Boolean)
    .map((t) => t.slice(`${name}--v`.length));

// ---- repository preconditions ---------------------------------------------------------------
if (!ALL && !target) fail('usage: release.mjs <plugin> | --all  [--push] [--dry-run]');
if (target && !manifests.has(target)) fail(`unknown plugin "${target}"`);
if (sh('git', ['status', '--porcelain'])) fail('working tree is not clean — commit or stash first');
const branch = sh('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
if (branch !== 'main' && !flag('--allow-branch')) fail(`on "${branch}"; releases are cut from main (--allow-branch to override)`);
try {
  sh('git', ['fetch', '--quiet', '--tags', 'origin']);
  const behind = sh('git', ['rev-list', '--count', 'HEAD..origin/main']);
  if (behind !== '0' && branch === 'main') fail(`main is ${behind} commit(s) behind origin/main — pull first`);
} catch (e) {
  if (e.status) console.warn('release: could not fetch origin; continuing with local tags');
}

// ---- order ----------------------------------------------------------------------------------
const order = [];
const visit = (name) => {
  if (order.includes(name)) return;
  for (const d of depsOf(name)) if (manifests.has(d.name)) visit(d.name);
  order.push(name);
};
(ALL ? [...manifests.keys()] : [target]).forEach(visit);
const queue = ALL ? order.filter((n) => !tagsOf(n).includes(manifests.get(n).version)) : [target];
if (!queue.length) {
  console.log('release: every plugin version is already tagged — nothing to do');
  process.exit(0);
}

// ---- checks shared by the run ---------------------------------------------------------------
console.log('release: harness checks');
sh('node', ['scripts/check-plugins.mjs'], { stdio: 'inherit' });
const commit = sh('git', ['rev-parse', 'HEAD']);
const released = new Map(); // name -> version released in this run

for (const name of queue) {
  const { version } = manifests.get(name);
  const tag = `${name}--v${version}`;
  const dir = join(ROOT, 'plugins', name);
  console.log(`\nrelease: ${tag} @ ${commit.slice(0, 12)}`);

  if (tagsOf(name).includes(version)) fail(`${tag} already exists — bump the version (tags are immutable)`);
  const changelog = readFileSync(join(dir, 'CHANGELOG.md'), 'utf8');
  if (!changelog.includes(`## [${version}]`)) fail(`${name}/CHANGELOG.md has no "## [${version}]" section`);

  for (const dep of depsOf(name)) {
    const available = [...tagsOf(dep.name), ...(released.has(dep.name) ? [released.get(dep.name)] : [])];
    if (!available.some((v) => satisfies(v, dep.version))) {
      fail(`${name} needs ${dep.name}@${dep.version} but no released tag satisfies it (have: ${available.join(', ') || 'none'}). Release ${dep.name} first.`);
    }
    console.log(`  dependency ${dep.name}@${dep.version} ✓`);
  }

  sh('claude', ['plugin', 'validate', '--strict', dir], { stdio: 'inherit' });

  const tagArgs = ['plugin', 'tag', dir, '-m', `${name} %s`];
  if (DRY) {
    console.log(sh('claude', [...tagArgs, '--dry-run']));
  } else {
    sh('claude', [...tagArgs, ...(PUSH ? ['--push'] : [])], { stdio: 'inherit' });
  }
  released.set(name, version);
}

console.log(`\nrelease: ${DRY ? 'dry run — nothing tagged' : `${released.size} tag(s) created${PUSH ? ' and pushed' : ' locally (push with: git push origin --tags)'}`}`);
if (!DRY) console.log('next: node scripts/channel.mjs pin <plugin>@<version> when this release should become stable');
