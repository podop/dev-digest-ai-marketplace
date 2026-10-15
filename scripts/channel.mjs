#!/usr/bin/env node
// Manage the stable release channel: a second marketplace whose plugin sources are pinned to the
// commit of a released tag. Users on the stable channel only move when a pin here changes.
// See docs/RELEASES.md.
//
//   node scripts/channel.mjs list                      # pins vs. latest released tags
//   node scripts/channel.mjs pin <plugin>@<version>    # pin one plugin to a released tag
//   node scripts/channel.mjs pin --latest              # pin every plugin to its newest tag
//   node scripts/channel.mjs check                     # every pin points at the commit of its tag

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { compare } from './lib/semver.mjs';

const ROOT = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const CHANNEL_FILE = join(ROOT, 'channels/stable/.claude-plugin/marketplace.json');
const sh = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
const fail = (msg) => {
  console.error(`channel: ${msg}`);
  process.exit(1);
};

const main = JSON.parse(readFileSync(join(ROOT, '.claude-plugin/marketplace.json'), 'utf8'));
const repoUrl = (() => {
  const url = sh('remote', 'get-url', 'origin');
  const m = /github\.com[:/](.+?)(\.git)?$/.exec(url);
  return m ? `https://github.com/${m[1]}.git` : url;
})();

function load() {
  if (existsSync(CHANNEL_FILE)) return JSON.parse(readFileSync(CHANNEL_FILE, 'utf8'));
  return {
    $schema: main.$schema,
    name: `${main.name}-stable`,
    owner: main.owner,
    metadata: {
      description: `Stable channel of ${main.name}: every plugin is pinned to the commit of a released tag. Updated by scripts/channel.mjs.`,
    },
    plugins: [],
  };
}

function save(channel) {
  channel.plugins.sort((a, b) => main.plugins.findIndex((p) => p.name === a.name) - main.plugins.findIndex((p) => p.name === b.name));
  mkdirSync(dirname(CHANNEL_FILE), { recursive: true });
  writeFileSync(CHANNEL_FILE, `${JSON.stringify(channel, null, 2)}\n`);
}

const tagsOf = (name) =>
  sh('tag', '--list', `${name}--v*`)
    .split('\n')
    .filter(Boolean)
    .map((t) => t.slice(`${name}--v`.length))
    .sort(compare);

const commitOf = (tag) => {
  try {
    return sh('rev-list', '-n', '1', tag);
  } catch {
    return null;
  }
};

function pin(channel, name, version) {
  const entry = main.plugins.find((p) => p.name === name);
  if (!entry) fail(`unknown plugin "${name}"`);
  const tag = `${name}--v${version}`;
  const sha = commitOf(tag);
  if (!sha) fail(`tag ${tag} does not exist — release it first (node scripts/release.mjs ${name})`);
  const pinned = {
    name,
    source: { source: 'git-subdir', url: repoUrl, path: entry.source.replace(/^\.\//, ''), ref: tag, sha },
    ...(entry.category ? { category: entry.category } : {}),
  };
  const i = channel.plugins.findIndex((p) => p.name === name);
  if (i >= 0) channel.plugins[i] = pinned;
  else channel.plugins.push(pinned);
  console.log(`pinned ${name} → ${tag} (${sha.slice(0, 12)})`);
}

const [cmd, arg] = process.argv.slice(2);
const channel = load();

if (cmd === 'pin' && arg === '--latest') {
  for (const { name } of main.plugins) {
    const latest = tagsOf(name).pop();
    if (latest) pin(channel, name, latest);
    else console.log(`skip ${name}: no released tag`);
  }
  save(channel);
} else if (cmd === 'pin' && arg?.includes('@')) {
  const [name, version] = arg.split('@');
  pin(channel, name, version.replace(/^v/, ''));
  save(channel);
} else if (cmd === 'list') {
  console.log(`channel: ${channel.name}  (${CHANNEL_FILE.slice(ROOT.length + 1)})`);
  for (const { name } of main.plugins) {
    const p = channel.plugins.find((x) => x.name === name);
    const latest = tagsOf(name).pop() ?? '—';
    console.log(`${name.padEnd(24)} stable ${(p?.source.ref.split('--v')[1] ?? '—').padEnd(8)} latest tag ${latest}`);
  }
} else if (cmd === 'check') {
  let bad = 0;
  for (const p of channel.plugins) {
    const sha = commitOf(p.source.ref);
    if (sha !== p.source.sha) {
      console.log(`✗ ${p.name}: ${p.source.ref} is ${sha ?? 'missing'}, pin says ${p.source.sha}`);
      bad++;
    } else console.log(`✓ ${p.name}: ${p.source.ref}`);
  }
  process.exit(bad ? 1 : 0);
} else {
  fail('usage: channel.mjs list | pin <plugin>@<version> | pin --latest | check');
}
