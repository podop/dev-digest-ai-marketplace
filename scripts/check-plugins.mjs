#!/usr/bin/env node
// Harness checks that `claude plugin validate` does not cover: marketplace/manifest agreement,
// versions and changelogs, dependency graph, portability (absolute paths, product names),
// secrets and English-only text. Exit 1 on any error.
//
//   node scripts/check-plugins.mjs [--root <dir>]

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const args = process.argv.slice(2);
const ROOT = resolve(args.includes('--root') ? args[args.indexOf('--root') + 1] : '.');

// Names of the product the plugins were extracted from; they must not leak into plugins.
const PRODUCT_TERMS = [/devdigest/i, /dev-digest(?!-ai-marketplace)/i, /reviewer-core/, /@devdigest\//];
const ABSOLUTE_PATHS = [/(^|[\s"'`(=])\/home\/[a-z0-9_.-]+\//i, /(^|[\s"'`(=])\/Users\/[A-Za-z0-9_.-]+\//, /[A-Z]:\\Users\\/];
const SECRETS = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'private key'],
  [/\bsk-ant-[A-Za-z0-9_-]{20,}/, 'Anthropic API key'],
  [/\bsk-[A-Za-z0-9]{32,}/, 'API key'],
  [/\bgh[pousr]_[A-Za-z0-9]{30,}/, 'GitHub token'],
  [/\bAKIA[0-9A-Z]{16}\b/, 'AWS access key'],
  [/\bxox[baprs]-[A-Za-z0-9-]{10,}/, 'Slack token'],
];
const NON_ENGLISH = /[Ѐ-ӿ]/; // Cyrillic
const TEXT_EXT = /\.(md|json|ya?ml|py|mjs|js|ts|tsx|sh|txt|css|html)$/i;
const SEMVER = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;

const errors = [];
const warnings = [];
const err = (file, msg) => errors.push(`${file}: ${msg}`);
const warn = (file, msg) => warnings.push(`${file}: ${msg}`);
const rel = (p) => relative(ROOT, p) || '.';

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    err(rel(path), `cannot parse JSON (${e.message})`);
    return null;
  }
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '__pycache__' || name === 'results' || name === '.git') continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function frontmatter(text) {
  const m = /^---\n([\s\S]*?)\n---/.exec(text);
  if (!m) return null;
  const keys = {};
  for (const line of m[1].split('\n')) {
    const k = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (k) keys[k[1]] = k[2];
  }
  return keys;
}

// ---- marketplace ----------------------------------------------------------------------------
const marketPath = join(ROOT, '.claude-plugin', 'marketplace.json');
const market = existsSync(marketPath) ? readJson(marketPath) : (err('.claude-plugin/marketplace.json', 'missing'), null);
const plugins = new Map(); // name -> { dir, manifest }

if (market) {
  const seen = new Set();
  for (const entry of market.plugins ?? []) {
    const where = `.claude-plugin/marketplace.json › ${entry.name}`;
    if (seen.has(entry.name)) err(where, 'duplicate plugin name');
    seen.add(entry.name);
    if ('version' in entry) err(where, 'version belongs in plugin.json only');
    if (typeof entry.source !== 'string' || !entry.source.startsWith('./')) {
      err(where, 'source must be a relative path starting with ./');
      continue;
    }
    const dir = join(ROOT, entry.source);
    const manifestPath = join(dir, '.claude-plugin', 'plugin.json');
    if (!existsSync(manifestPath)) {
      err(where, `no plugin.json at ${rel(manifestPath)}`);
      continue;
    }
    const manifest = readJson(manifestPath);
    if (!manifest) continue;
    if (manifest.name !== entry.name) err(where, `plugin.json name is "${manifest.name}"`);
    if (rel(dir) !== `plugins/${entry.name}`) err(where, `directory should be plugins/${entry.name}`);
    plugins.set(entry.name, { dir, manifest });
  }
  for (const name of existsSync(join(ROOT, 'plugins')) ? readdirSync(join(ROOT, 'plugins')) : []) {
    if (!seen.has(name)) err(`plugins/${name}`, 'directory is not listed in marketplace.json');
  }
}

// ---- per plugin -----------------------------------------------------------------------------
for (const [name, { dir, manifest }] of plugins) {
  const p = rel(dir);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) err(p, 'name must be kebab-case');
  if (!SEMVER.test(manifest.version ?? '')) err(p, `version "${manifest.version}" is not SemVer`);
  for (const field of ['description', 'author', 'license', 'keywords']) {
    if (!manifest[field]) err(p, `plugin.json is missing "${field}"`);
  }
  for (const doc of ['README.md', 'CHANGELOG.md', 'COMPATIBILITY.md']) {
    if (!existsSync(join(dir, doc))) err(p, `missing ${doc}`);
  }
  const changelog = existsSync(join(dir, 'CHANGELOG.md')) ? readFileSync(join(dir, 'CHANGELOG.md'), 'utf8') : '';
  if (manifest.version && !changelog.includes(`## [${manifest.version}]`)) {
    err(p, `CHANGELOG.md has no "## [${manifest.version}]" section`);
  }

  for (const dep of manifest.dependencies ?? []) {
    const depName = typeof dep === 'string' ? dep.split('@')[0] : dep.name;
    if (!plugins.has(depName) && !(market?.plugins ?? []).some((e) => e.name === depName)) {
      err(p, `dependency "${depName}" is not in this marketplace`);
    }
    if (typeof dep === 'object' && dep.version && !/^[\^~]?\d+\.\d+(\.\d+)?$|^>=\s*\d/.test(dep.version)) {
      warn(p, `dependency "${depName}" range "${dep.version}" is unusual; prefer ^x.y.z`);
    }
  }

  for (const agentFile of existsSync(join(dir, 'agents')) ? readdirSync(join(dir, 'agents')) : []) {
    if (!agentFile.endsWith('.md')) continue;
    const text = readFileSync(join(dir, 'agents', agentFile), 'utf8');
    const fm = frontmatter(text);
    const f = `${p}/agents/${agentFile}`;
    if (!text.startsWith('---\nname:')) err(f, 'frontmatter must start on line 1 with name');
    if (!fm?.description) err(f, 'missing description');
    for (const ignored of ['hooks', 'mcpServers', 'permissionMode']) {
      if (fm && ignored in fm) err(f, `"${ignored}" is ignored for plugin agents`);
    }
  }
  for (const skill of existsSync(join(dir, 'skills')) ? readdirSync(join(dir, 'skills')) : []) {
    const skillMd = join(dir, 'skills', skill, 'SKILL.md');
    if (!existsSync(skillMd)) {
      err(`${p}/skills/${skill}`, 'missing SKILL.md');
      continue;
    }
    const fm = frontmatter(readFileSync(skillMd, 'utf8'));
    if (fm?.name && fm.name.replace(/^["']|["']$/g, '') !== skill) err(rel(skillMd), `name "${fm.name}" differs from directory`);
    if (!fm?.description) err(rel(skillMd), 'missing description');
  }

  for (const file of walk(dir)) {
    if (!TEXT_EXT.test(file)) continue;
    const text = readFileSync(file, 'utf8');
    const f = rel(file);
    if (f.endsWith('THIRD_PARTY_NOTICES.md') || f.endsWith('CHANGELOG.md')) {
      // provenance notes may name the source product
    } else {
      for (const re of PRODUCT_TERMS) if (re.test(text)) err(f, `product-specific reference ${re}`);
    }
    text.split('\n').forEach((line, i) => {
      for (const re of ABSOLUTE_PATHS) if (re.test(line)) err(`${f}:${i + 1}`, 'absolute path');
      for (const [re, what] of SECRETS) if (re.test(line)) err(`${f}:${i + 1}`, `possible secret (${what})`);
      if (NON_ENGLISH.test(line)) err(`${f}:${i + 1}`, 'non-English text');
    });
  }
}

// ---- dependency cycles ----------------------------------------------------------------------
const state = new Map();
function visit(name, stack) {
  if (state.get(name) === 'done') return;
  if (state.get(name) === 'active') {
    err('dependencies', `cycle: ${[...stack, name].join(' → ')}`);
    return;
  }
  state.set(name, 'active');
  for (const dep of plugins.get(name)?.manifest.dependencies ?? []) {
    const depName = typeof dep === 'string' ? dep.split('@')[0] : dep.name;
    if (plugins.has(depName)) visit(depName, [...stack, name]);
  }
  state.set(name, 'done');
}
for (const name of plugins.keys()) visit(name, []);

// ---- repository-wide language and secret check (docs, site, scripts) -----------------------
for (const top of ['docs', 'scripts', 'site/src', '.github', 'channels', 'README.md', 'CONTRIBUTING.md', 'CODEOWNERS']) {
  const p = join(ROOT, top);
  if (!existsSync(p)) continue;
  const files = statSync(p).isDirectory() ? walk(p) : [p];
  for (const file of files) {
    if (!TEXT_EXT.test(file) && !file.endsWith('CODEOWNERS')) continue;
    if (file.endsWith('check-plugins.mjs')) continue;
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      if (NON_ENGLISH.test(line)) err(`${rel(file)}:${i + 1}`, 'non-English text');
      for (const [re, what] of SECRETS) if (re.test(line)) err(`${rel(file)}:${i + 1}`, `possible secret (${what})`);
    });
  }
}

for (const w of warnings) console.log(`warning  ${w}`);
for (const e of errors) console.log(`error    ${e}`);
console.log(`\n${plugins.size} plugins checked · ${errors.length} errors · ${warnings.length} warnings`);
process.exit(errors.length ? 1 : 0);
