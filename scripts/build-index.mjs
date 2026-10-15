#!/usr/bin/env node
// Builds the static catalog index consumed by the site (see docs/SITE-SPEC.md).
//
// Inputs:  .claude-plugin/marketplace.json, plugins/<name>/.claude-plugin/plugin.json,
//          README / CHANGELOG / COMPATIBILITY, skills/*/SKILL.md, agents/*.md,
//          hooks/hooks.json, evals/**, git tags `{plugin}--v{version}`.
// Outputs: <out>/index.json, <out>/releases.json, <out>/stats.json, <out>/bodies/*.md
//
// Usage:   node scripts/build-index.mjs [--root <repo dir>] [--out <dir>] [--repo owner/repo] [--quiet]
//
// Zero dependencies: Node 22 standard library only.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(SCRIPT_DIR, '..');
const DEFAULT_REPO = 'podop/dev-digest-ai-marketplace';
const SEARCH_TEXT_LIMIT = 4096;
const MAX_SUPPORTING_FILES = 200;
const TAG_PATTERN = /^(.+)--v(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)$/;

class IndexError extends Error {}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { root: DEFAULT_ROOT, out: null, repo: null, quiet: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => {
      const value = argv[++i];
      if (value === undefined) throw new IndexError(`Missing value for ${arg}`);
      return value;
    };
    if (arg === '--root') args.root = path.resolve(next());
    else if (arg === '--out') args.out = path.resolve(next());
    else if (arg === '--repo') args.repo = next();
    else if (arg === '--quiet') args.quiet = true;
    else if (arg === '--help' || arg === '-h') {
      console.log('Usage: node scripts/build-index.mjs [--root <dir>] [--out <dir>] [--repo owner/repo] [--quiet]');
      process.exit(0);
    } else throw new IndexError(`Unknown argument: ${arg}`);
  }
  // Output always goes to this repository's site/public unless overridden,
  // so `--root <fixture>` can be previewed by the real site.
  args.out ??= path.join(DEFAULT_ROOT, 'site', 'public');
  return args;
}

// ---------------------------------------------------------------------------
// Minimal YAML parser for frontmatter
// Supports: block maps, block lists (incl. "- key: value" items), plain / single /
// double quoted scalars (multi-line too), literal `|` and folded `>` block scalars
// with chomping/indent indicators, flow sequences `[a, b]` and flow maps `{a: b}`,
// comments, booleans, null and numbers. Anchors, tags and multi-docs are not supported.
// ---------------------------------------------------------------------------

export function parseYaml(src) {
  const lines = src.split('\n').map((raw) => {
    const clean = raw.replace(/\t/g, '  ').replace(/\s+$/, '');
    return { raw: clean, indent: clean.match(/^ */)[0].length, text: clean.trim() };
  });
  let i = 0;

  const isBlank = (line) => line.text === '' || line.text.startsWith('#');
  const skipBlank = () => {
    while (i < lines.length && isBlank(lines[i])) i++;
  };
  const isListItem = (text) => text === '-' || text.startsWith('- ');

  function parseNode(indent) {
    skipBlank();
    if (i >= lines.length || lines[i].indent < indent) return null;
    const line = lines[i];
    return isListItem(line.text) ? parseList(line.indent) : parseMap(line.indent);
  }

  function parseMap(indent) {
    const obj = {};
    for (;;) {
      skipBlank();
      if (i >= lines.length) break;
      const line = lines[i];
      if (line.indent !== indent || isListItem(line.text)) break;
      const m = /^((?:"(?:[^"\\]|\\.)*"|'(?:[^']|'')*'|[^:#'"][^:]*?|[^:]+?))\s*:(?:\s+(.*))?$/.exec(line.text);
      i++;
      if (!m) continue; // tolerate garbage lines
      obj[unquoteKey(m[1].trim())] = parseValue(m[2] ?? '', indent);
    }
    return obj;
  }

  function parseList(indent) {
    const arr = [];
    for (;;) {
      skipBlank();
      if (i >= lines.length) break;
      const line = lines[i];
      if (line.indent !== indent || !isListItem(line.text)) break;
      const rest = line.text.slice(1).trim();
      if (rest === '') {
        i++;
        arr.push(parseNode(indent + 1));
        continue;
      }
      if (/^(?:[^"'[{\s][^:]*|"[^"]*"|'[^']*'):(?:\s|$)/.test(rest)) {
        // "- key: value" starts an inline map; re-read it as a map at the item's column.
        const column = line.raw.indexOf(rest, line.indent + 1);
        lines[i] = { raw: ' '.repeat(column) + rest, indent: column, text: rest };
        arr.push(parseMap(column));
        continue;
      }
      i++;
      arr.push(parseValue(rest, indent));
    }
    return arr;
  }

  function parseValue(rawValue, parentIndent) {
    const value = rawValue.trim();
    if (value === '' || value.startsWith('#')) {
      skipBlank();
      if (i < lines.length && lines[i].indent > parentIndent) return parseNode(lines[i].indent);
      if (i < lines.length && lines[i].indent === parentIndent && isListItem(lines[i].text)) {
        return parseList(parentIndent);
      }
      return null;
    }
    if (/^[|>][-+0-9]*(\s+#.*)?$/.test(value)) return parseBlockScalar(value, parentIndent);
    if (value.startsWith('[') || value.startsWith('{')) {
      const text = collectFlow(value, parentIndent);
      return parseFlow(text);
    }
    if (value.startsWith('"') || value.startsWith("'")) return parseQuoted(value, parentIndent);
    // Plain scalar, possibly continued on more-indented lines.
    const parts = [stripComment(value)];
    while (i < lines.length && lines[i].text !== '' && lines[i].indent > parentIndent && !lines[i].text.startsWith('#')) {
      parts.push(stripComment(lines[i].text));
      i++;
    }
    return parts.length > 1 ? parts.join(' ') : toScalar(parts[0]);
  }

  function collectFlow(first, parentIndent) {
    let text = first;
    while (!flowBalanced(text) && i < lines.length && lines[i].indent > parentIndent) {
      text += ' ' + lines[i].text;
      i++;
    }
    return text;
  }

  function parseQuoted(first, parentIndent) {
    const quote = first[0];
    let text = first;
    const closed = (t) => {
      for (let k = 1; k < t.length; k++) {
        if (quote === '"' && t[k] === '\\') {
          k++;
          continue;
        }
        if (t[k] === quote) {
          if (quote === "'" && t[k + 1] === "'") {
            k++;
            continue;
          }
          return k;
        }
      }
      return -1;
    };
    while (closed(text) === -1 && i < lines.length && (lines[i].indent > parentIndent || lines[i].text === '')) {
      text += lines[i].text === '' ? '\n' : ' ' + lines[i].text;
      i++;
    }
    const end = closed(text);
    const inner = end === -1 ? text.slice(1) : text.slice(1, end);
    return quote === '"' ? unescapeDouble(inner) : inner.replace(/''/g, "'");
  }

  function parseBlockScalar(header, parentIndent) {
    const folded = header[0] === '>';
    const chomp = header.includes('-') ? 'strip' : header.includes('+') ? 'keep' : 'clip';
    const explicit = /\d/.exec(header);
    const block = [];
    while (i < lines.length && (lines[i].text === '' || lines[i].indent > parentIndent)) {
      block.push(lines[i].raw);
      i++;
    }
    // Trailing blank lines belong to the scalar only for chomping purposes.
    let trailing = 0;
    while (block.length && block[block.length - 1].trim() === '') {
      block.pop();
      trailing++;
    }
    if (!block.length) return '';
    const firstIndent = block.find((l) => l.trim() !== '').match(/^ */)[0].length;
    const blockIndent = explicit ? parentIndent + Number(explicit[0]) : firstIndent;
    const contentLines = block.map((l) => l.slice(Math.min(blockIndent, l.match(/^ */)[0].length)));
    let out;
    if (!folded) {
      out = contentLines.join('\n');
    } else {
      out = '';
      let prevMoreIndented = false;
      contentLines.forEach((l, idx) => {
        const moreIndented = /^\s/.test(l);
        if (idx === 0) out = l;
        else if (l === '') out += '\n';
        else if (moreIndented || prevMoreIndented || out.endsWith('\n')) out += (out.endsWith('\n') ? '' : '\n') + l;
        else out += ' ' + l;
        prevMoreIndented = moreIndented;
      });
    }
    if (chomp === 'strip') return out;
    if (chomp === 'keep') return out + '\n'.repeat(trailing + 1);
    return out + '\n';
  }

  skipBlank();
  if (i >= lines.length) return {};
  const result = parseNode(lines[i].indent);
  return result && typeof result === 'object' && !Array.isArray(result) ? result : {};
}

function flowBalanced(text) {
  let depth = 0;
  let quote = null;
  for (let k = 0; k < text.length; k++) {
    const c = text[k];
    if (quote) {
      if (c === '\\' && quote === '"') k++;
      else if (c === quote) quote = null;
    } else if (c === '"' || c === "'") quote = c;
    else if (c === '[' || c === '{') depth++;
    else if (c === ']' || c === '}') depth--;
  }
  return depth <= 0;
}

function splitFlow(inner) {
  const parts = [];
  let depth = 0;
  let quote = null;
  let current = '';
  for (let k = 0; k < inner.length; k++) {
    const c = inner[k];
    if (quote) {
      if (c === '\\' && quote === '"') {
        current += c + (inner[k + 1] ?? '');
        k++;
        continue;
      }
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'") quote = c;
    else if (c === '[' || c === '{') depth++;
    else if (c === ']' || c === '}') depth--;
    else if (c === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }
    current += c;
  }
  if (current.trim() !== '') parts.push(current.trim());
  return parts;
}

function parseFlow(text) {
  const trimmed = stripComment(text).trim();
  const open = trimmed[0];
  const close = open === '[' ? ']' : '}';
  const end = trimmed.lastIndexOf(close);
  const inner = trimmed.slice(1, end === -1 ? undefined : end);
  const items = splitFlow(inner);
  if (open === '[') return items.map(flowScalar);
  const obj = {};
  for (const item of items) {
    const m = /^((?:"[^"]*"|'[^']*'|[^:]+?))\s*:\s*(.*)$/.exec(item);
    if (m) obj[unquoteKey(m[1].trim())] = flowScalar(m[2]);
    else obj[unquoteKey(item)] = null;
  }
  return obj;
}

function flowScalar(item) {
  const v = item.trim();
  if (v.startsWith('[') || v.startsWith('{')) return parseFlow(v);
  if (v.startsWith('"')) return unescapeDouble(v.slice(1, v.endsWith('"') ? -1 : undefined));
  if (v.startsWith("'")) return v.slice(1, v.endsWith("'") ? -1 : undefined).replace(/''/g, "'");
  return toScalar(v);
}

function stripComment(value) {
  const idx = value.search(/\s#/);
  return (idx === -1 ? value : value.slice(0, idx)).trim();
}

function unquoteKey(key) {
  if (key.startsWith('"') && key.endsWith('"')) return unescapeDouble(key.slice(1, -1));
  if (key.startsWith("'") && key.endsWith("'")) return key.slice(1, -1).replace(/''/g, "'");
  return key;
}

function unescapeDouble(s) {
  return s.replace(/\\(u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|.)/g, (_, e) => {
    if (e[0] === 'u' || e[0] === 'x') return String.fromCharCode(parseInt(e.slice(1), 16));
    return { n: '\n', t: '\t', r: '\r', '0': '\0', '"': '"', '\\': '\\', '/': '/', ' ': ' ' }[e] ?? e;
  });
}

function toScalar(v) {
  if (v === '' || v === '~' || v === 'null' || v === 'Null' || v === 'NULL') return null;
  if (/^(true|True|TRUE)$/.test(v)) return true;
  if (/^(false|False|FALSE)$/.test(v)) return false;
  if (/^-?(0|[1-9]\d*)(\.\d+)?$/.test(v)) return Number(v);
  return v;
}

export function parseFrontmatter(source) {
  const text = source.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const lines = text.split('\n');
  if (lines[0].trim() !== '---') return { data: {}, body: text };
  const end = lines.findIndex((l, idx) => idx > 0 && (l.trim() === '---' || l.trim() === '...'));
  if (end === -1) return { data: {}, body: text };
  let data = {};
  try {
    data = parseYaml(lines.slice(1, end).join('\n'));
  } catch {
    data = {};
  }
  return { data, body: lines.slice(end + 1).join('\n').replace(/^\n+/, '') };
}

// ---------------------------------------------------------------------------
// Markdown helpers
// ---------------------------------------------------------------------------

export function stripMarkdown(md) {
  return md
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\[[^\]]*\]/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s*([-*+]|\d+[.)])\s+/gm, '')
    .replace(/^\s*\|?[\s:|-]+\|[\s:|-]*$/gm, ' ')
    .replace(/[|*_~]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateUtf16(text, limit) {
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  const lastSpace = cut.lastIndexOf(' ');
  return lastSpace > limit * 0.8 ? cut.slice(0, lastSpace) : cut;
}

/** Splits a Keep a Changelog file into `{ version, date, notes }` sections. */
export function parseChangelog(md) {
  const sections = [];
  const lines = md.replace(/\r\n?/g, '\n').split('\n');
  let current = null;
  let inFence = false;
  for (const line of lines) {
    if (/^(```|~~~)/.test(line)) inFence = !inFence;
    const m = !inFence && /^##\s+\[?([^\]\s]+)\]?(?:\s*[-–—]\s*(\d{4}-\d{2}-\d{2}))?/.exec(line);
    if (m && !line.startsWith('###')) {
      if (current) sections.push(current);
      current = { version: m[1].replace(/^v/, ''), date: m[2] ?? null, lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) sections.push(current);
  return sections.map(({ version, date, lines: body }) => ({ version, date, notes: body.join('\n').trim() }));
}

// ---------------------------------------------------------------------------
// Filesystem helpers
// ---------------------------------------------------------------------------

const exists = (p) => fs.existsSync(p);
const readText = (p) => (exists(p) ? fs.readFileSync(p, 'utf8') : null);
const toPosix = (p) => p.split(path.sep).join('/');

function readJson(file, label) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    throw new IndexError(`${label}: cannot parse ${file}: ${err.message}`);
  }
}

function listDirs(dir) {
  if (!exists(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
    .map((d) => d.name)
    .sort();
}

function walkFiles(dir, base = dir, out = []) {
  if (!exists(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === '__pycache__') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, base, out);
    else if (entry.isFile()) out.push(toPosix(path.relative(base, full)));
  }
  return out;
}

function safeName(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'item';
}

function git(root, args) {
  try {
    return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

function detectRepo(root, override) {
  if (override) return override;
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY;
  const url = git(root, ['remote', 'get-url', 'origin']);
  const m = url && /github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?\/?$/.exec(url);
  return m ? m[1] : DEFAULT_REPO;
}

// ---------------------------------------------------------------------------
// Field normalisation
// ---------------------------------------------------------------------------

function fieldToString(value) {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map(fieldToString).join(', ');
  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([k, v]) => `${k}: ${fieldToString(v)}`)
      .join('; ');
  }
  return String(value).trim();
}

function toStringList(value) {
  if (Array.isArray(value)) return value.map((v) => fieldToString(v)).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
}

export function normalizeDependencies(deps) {
  const out = [];
  const push = (name, version) => {
    if (typeof name === 'string' && name.trim()) out.push({ name: name.trim(), version: version ? String(version).trim() : null });
  };
  if (Array.isArray(deps)) {
    for (const dep of deps) {
      if (typeof dep === 'string') {
        const at = dep.lastIndexOf('@');
        if (at > 0) push(dep.slice(0, at), dep.slice(at + 1));
        else push(dep, null);
      } else if (dep && typeof dep === 'object') {
        push(dep.name, dep.version ?? dep.range ?? null);
      }
    }
  } else if (deps && typeof deps === 'object') {
    for (const [name, version] of Object.entries(deps)) push(name, typeof version === 'string' ? version : null);
  }
  return out;
}

function compatibilityLine(md) {
  if (!md) return null;
  const lines = md
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && !/^[-|:\s]+$/.test(l) && !l.startsWith('```'));
  const pick = lines.find((l) => /claude code/i.test(l) && /\d/.test(l)) ?? lines[0];
  if (!pick) return null;
  const text = stripMarkdown(pick)
    .replace(/^(requires?|requirements?|minimum|compatibility)\s*[:\-–]\s*/i, '')
    .trim();
  return text.length > 160 ? `${text.slice(0, 157)}...` : text || null;
}

function countHooks(hooksJson) {
  if (!hooksJson || typeof hooksJson !== 'object') return 0;
  const events = hooksJson.hooks && typeof hooksJson.hooks === 'object' ? hooksJson.hooks : hooksJson;
  let count = 0;
  for (const groups of Object.values(events)) {
    if (!Array.isArray(groups)) continue;
    for (const group of groups) {
      if (group && Array.isArray(group.hooks)) count += group.hooks.length;
      else if (group && typeof group === 'object') count += 1;
    }
  }
  return count;
}

function countEvals(evalsDir) {
  const dirs = new Set();
  for (const rel of walkFiles(evalsDir)) {
    const base = path.posix.basename(rel);
    if (base === 'case.yaml' || base === 'case.yml' || base === 'prompt.md') dirs.add(path.posix.dirname(rel));
  }
  return dirs.size;
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

export function buildIndex({ root, repo: repoOverride }) {
  const marketplaceFile = path.join(root, '.claude-plugin', 'marketplace.json');
  const repo = detectRepo(root, repoOverride);
  const commit = process.env.GITHUB_SHA || git(root, ['rev-parse', 'HEAD']) || null;
  const errors = [];
  const warnings = [];

  let marketplace = { name: path.basename(root), owner: { name: '' }, plugins: [] };
  if (exists(marketplaceFile)) marketplace = readJson(marketplaceFile, 'marketplace');
  else warnings.push(`No marketplace file at ${toPosix(path.relative(root, marketplaceFile))}; generating an empty catalog.`);

  const marketplaceName = String(marketplace.name ?? '').trim() || path.basename(root);
  const marketplaceOwner = fieldToString(marketplace.owner?.name ?? marketplace.owner ?? '');
  const pluginRoot = marketplace.metadata?.pluginRoot;
  const entries = Array.isArray(marketplace.plugins) ? marketplace.plugins : [];

  const plugins = [];
  const artifacts = [];
  const bodies = new Map(); // relative body path -> markdown
  const changelogs = new Map(); // plugin name -> markdown
  const seenNames = new Set();

  const addBody = (kind, ...parts) => (content) => {
    if (content === null || content === undefined) return null;
    const rel = `bodies/${[kind, ...parts].map(safeName).join('--')}.md`;
    bodies.set(rel, content);
    return rel;
  };

  for (const [idx, entry] of entries.entries()) {
    const label = `marketplace.plugins[${idx}]${entry?.name ? ` (${entry.name})` : ''}`;
    if (!entry || typeof entry.name !== 'string' || !entry.name.trim()) {
      errors.push(`${label}: missing "name".`);
      continue;
    }
    if (seenNames.has(entry.name)) errors.push(`${label}: duplicate plugin name "${entry.name}".`);
    seenNames.add(entry.name);

    if (typeof entry.source !== 'string') {
      warnings.push(`${label}: non-local source ${JSON.stringify(entry.source)} is not indexed.`);
      continue;
    }
    const sourceRel = !entry.source.startsWith('./') && !entry.source.startsWith('../') && pluginRoot
      ? path.join(pluginRoot, entry.source)
      : entry.source;
    const pluginDir = path.resolve(root, sourceRel);
    if (pluginDir !== root && !pluginDir.startsWith(root + path.sep)) {
      errors.push(`${label}: source "${entry.source}" points outside the repository.`);
      continue;
    }
    if (!exists(pluginDir) || !fs.statSync(pluginDir).isDirectory()) {
      errors.push(`${label}: source path "${entry.source}" does not exist.`);
      continue;
    }
    const manifestFile = path.join(pluginDir, '.claude-plugin', 'plugin.json');
    if (!exists(manifestFile)) {
      errors.push(`${label}: missing ${toPosix(path.relative(root, manifestFile))}.`);
      continue;
    }
    let manifest;
    try {
      manifest = readJson(manifestFile, label);
    } catch (err) {
      errors.push(err.message);
      continue;
    }
    if (manifest.name !== entry.name) {
      errors.push(`${label}: marketplace name "${entry.name}" does not match plugin.json name "${manifest.name}" (${toPosix(path.relative(root, manifestFile))}).`);
      continue;
    }

    const name = manifest.name;
    const sourcePath = toPosix(path.relative(root, pluginDir));
    const readme = readText(path.join(pluginDir, 'README.md'));
    const changelog = readText(path.join(pluginDir, 'CHANGELOG.md'));
    const compatibility = readText(path.join(pluginDir, 'COMPATIBILITY.md'));
    if (changelog) changelogs.set(name, changelog);

    // Skills
    const skillIds = [];
    const agentIds = [];
    let contextBytes = 0;
    for (const dir of listDirs(path.join(pluginDir, 'skills'))) {
      const skillDir = path.join(pluginDir, 'skills', dir);
      const file = path.join(skillDir, 'SKILL.md');
      if (!exists(file)) continue;
      const { data, body } = parseFrontmatter(fs.readFileSync(file, 'utf8'));
      const artifact = makeArtifact({
        type: 'skill', plugin: name, fallbackName: dir, data, body, root, file,
        files: walkFiles(skillDir).filter((f) => f !== 'SKILL.md').slice(0, MAX_SUPPORTING_FILES),
        addBody,
      });
      contextBytes += Buffer.byteLength(artifact.description, 'utf8');
      skillIds.push(artifact.id);
      artifacts.push(artifact);
    }
    // Agents
    const agentsDir = path.join(pluginDir, 'agents');
    if (exists(agentsDir)) {
      for (const entryName of fs.readdirSync(agentsDir).filter((f) => f.endsWith('.md')).sort()) {
        const file = path.join(agentsDir, entryName);
        if (!fs.statSync(file).isFile()) continue;
        const { data, body } = parseFrontmatter(fs.readFileSync(file, 'utf8'));
        const artifact = makeArtifact({
          type: 'agent', plugin: name, fallbackName: entryName.replace(/\.md$/, ''), data, body, root, file,
          files: [], addBody,
        });
        contextBytes += Buffer.byteLength(artifact.description, 'utf8');
        agentIds.push(artifact.id);
        artifacts.push(artifact);
      }
    }

    // Hooks: hooks/hooks.json plus inline/extra hook configs referenced from plugin.json.
    let hooks = 0;
    const defaultHooks = path.join(pluginDir, 'hooks', 'hooks.json');
    if (exists(defaultHooks)) {
      try {
        hooks += countHooks(JSON.parse(fs.readFileSync(defaultHooks, 'utf8')));
      } catch {
        warnings.push(`${name}: cannot parse hooks/hooks.json.`);
      }
    }
    const manifestHooks = Array.isArray(manifest.hooks) ? manifest.hooks : manifest.hooks ? [manifest.hooks] : [];
    for (const h of manifestHooks) {
      if (typeof h === 'object') hooks += countHooks(h);
      else if (typeof h === 'string') {
        const hookFile = path.resolve(pluginDir, h);
        if (hookFile !== defaultHooks && exists(hookFile)) {
          try {
            hooks += countHooks(JSON.parse(fs.readFileSync(hookFile, 'utf8')));
          } catch {
            warnings.push(`${name}: cannot parse ${h}.`);
          }
        }
      }
    }

    const keywords = [...new Set([...toStringList(manifest.keywords), ...toStringList(entry.keywords)])];
    plugins.push({
      name,
      version: manifest.version ? String(manifest.version) : null,
      description: fieldToString(manifest.description ?? entry.description ?? ''),
      owner: fieldToString(manifest.author?.name ?? manifest.author ?? '') || marketplaceOwner,
      keywords,
      category: entry.category ? String(entry.category) : null,
      license: manifest.license ? String(manifest.license) : null,
      compatibility: compatibilityLine(compatibility),
      dependencies: normalizeDependencies(manifest.dependencies),
      dependents: [],
      components: { skills: skillIds, agents: agentIds, hooks, evals: countEvals(path.join(pluginDir, 'evals')) },
      install: `/plugin install ${name}@${marketplaceName}`,
      readme: addBody('plugin', name, 'readme')(readme),
      changelog: addBody('plugin', name, 'changelog')(changelog),
      compatibilityDoc: addBody('plugin', name, 'compatibility')(compatibility),
      sourcePath,
      contextBytes,
      searchText: truncateUtf16(stripMarkdown(readme ?? ''), SEARCH_TEXT_LIMIT),
    });
  }

  // Reverse dependency edges.
  const byName = new Map(plugins.map((p) => [p.name, p]));
  for (const p of plugins) {
    for (const dep of p.dependencies) {
      const target = byName.get(dep.name);
      if (target) {
        if (!target.dependents.includes(p.name)) target.dependents.push(p.name);
      } else warnings.push(`${p.name}: dependency "${dep.name}" is not in this marketplace.`);
    }
  }
  for (const p of plugins) p.dependents.sort();

  // Duplicate artifact ids would make routes ambiguous.
  const idCounts = new Map();
  for (const a of artifacts) idCounts.set(a.id, (idCounts.get(a.id) ?? 0) + 1);
  for (const [id, count] of idCounts) if (count > 1) errors.push(`Duplicate artifact id "${id}" (${count} times).`);

  if (errors.length) {
    throw new IndexError(`Catalog index has ${errors.length} error(s):\n  - ${errors.join('\n  - ')}`);
  }

  const generatedAt = new Date().toISOString();
  const index = {
    marketplace: {
      name: marketplaceName,
      owner: marketplaceOwner,
      description: fieldToString(marketplace.metadata?.description ?? marketplace.description ?? ''),
      repo,
    },
    generatedAt,
    commit,
    plugins,
    artifacts,
  };

  const releases = buildReleases(root, plugins, changelogs);
  const stats = {
    generatedAt,
    plugins: plugins.length,
    skills: artifacts.filter((a) => a.type === 'skill').length,
    agents: artifacts.filter((a) => a.type === 'agent').length,
    evals: plugins.reduce((n, p) => n + p.components.evals, 0),
    hooks: plugins.reduce((n, p) => n + p.components.hooks, 0),
    releases: releases.length,
    dependencyEdges: plugins.flatMap((p) => p.dependencies.map((d) => ({ from: p.name, to: d.name, version: d.version }))),
    contextBytes: Object.fromEntries(plugins.map((p) => [p.name, p.contextBytes])),
    totalContextBytes: plugins.reduce((n, p) => n + p.contextBytes, 0),
  };

  return { index, releases: { generatedAt, releases }, stats, bodies, warnings };
}

function makeArtifact({ type, plugin, fallbackName, data, body, root, file, files, addBody }) {
  const name = fieldToString(data.name) || fallbackName;
  const fields = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === 'name' || key === 'description') continue;
    const str = fieldToString(value);
    if (str !== '') fields[key] = str;
  }
  return {
    id: `${plugin}:${name}`,
    type,
    name,
    plugin,
    description: fieldToString(data.description).replace(/\s+/g, ' ').trim(),
    fields,
    body: addBody(type, plugin, name)(body),
    files,
    sourcePath: toPosix(path.relative(root, file)),
    searchText: truncateUtf16(stripMarkdown(body), SEARCH_TEXT_LIMIT),
  };
}

function compareVersionsDesc(a, b) {
  const pa = String(a).split(/[.+-]/).map((x) => (/^\d+$/.test(x) ? Number(x) : x));
  const pb = String(b).split(/[.+-]/).map((x) => (/^\d+$/.test(x) ? Number(x) : x));
  for (let k = 0; k < Math.max(pa.length, pb.length); k++) {
    const x = pa[k] ?? 0;
    const y = pb[k] ?? 0;
    if (x === y) continue;
    if (typeof x === 'number' && typeof y === 'number') return y - x;
    return String(y).localeCompare(String(x));
  }
  return 0;
}

function buildReleases(root, plugins, changelogs) {
  const known = new Set(plugins.map((p) => p.name));
  const out = [];
  const raw = git(root, [
    'for-each-ref',
    'refs/tags',
    '--format=%(refname:short)%09%(creatordate:iso-strict)%09%(objectname)%09%(*objectname)',
  ]);
  const tagged = new Set();
  const sectionsFor = new Map();
  const sections = (plugin) => {
    if (!sectionsFor.has(plugin)) sectionsFor.set(plugin, parseChangelog(changelogs.get(plugin) ?? ''));
    return sectionsFor.get(plugin);
  };

  for (const line of (raw ?? '').split('\n').filter(Boolean)) {
    const [tag, date, object, peeled] = line.split('\t');
    const m = TAG_PATTERN.exec(tag);
    if (!m || !known.has(m[1])) continue;
    const [, plugin, version] = m;
    const section = sections(plugin).find((s) => s.version === version);
    tagged.add(plugin);
    out.push({
      plugin,
      version,
      tag,
      date: (date || section?.date || '').slice(0, 10) || null,
      commit: peeled || object || null,
      untagged: false,
      notes: section?.notes ?? '',
    });
  }

  // Plugins without tags: fall back to their changelog, marked untagged.
  for (const plugin of known) {
    if (tagged.has(plugin)) continue;
    for (const s of sections(plugin)) {
      if (/^unreleased$/i.test(s.version)) continue;
      out.push({ plugin, version: s.version, tag: null, date: s.date, commit: null, untagged: true, notes: s.notes });
    }
  }

  return out.sort(
    (a, b) =>
      (b.date ?? '').localeCompare(a.date ?? '') ||
      a.plugin.localeCompare(b.plugin) ||
      compareVersionsDesc(a.version, b.version),
  );
}

export function writeOutputs(outDir, { index, releases, stats, bodies }) {
  fs.mkdirSync(outDir, { recursive: true });
  const bodiesDir = path.join(outDir, 'bodies');
  fs.rmSync(bodiesDir, { recursive: true, force: true });
  fs.mkdirSync(bodiesDir, { recursive: true });
  for (const [rel, content] of bodies) fs.writeFileSync(path.join(outDir, rel), content);
  const write = (name, data) => {
    const target = path.join(outDir, name);
    const tmp = `${target}.tmp`;
    fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`);
    fs.renameSync(tmp, target);
  };
  write('releases.json', releases);
  write('stats.json', stats);
  write('index.json', index); // last, so a watcher never sees an index pointing to missing bodies
}

function main() {
  const started = Date.now();
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!exists(args.root)) throw new IndexError(`Root directory does not exist: ${args.root}`);
    const result = buildIndex(args);
    writeOutputs(args.out, result);
    for (const w of result.warnings) console.warn(`build-index: warning: ${w}`);
    if (!args.quiet) {
      const { stats } = result;
      console.log(
        `build-index: ${stats.plugins} plugin(s), ${stats.skills} skill(s), ${stats.agents} agent(s), ` +
          `${stats.evals} eval(s), ${stats.releases} release(s) -> ${path.relative(process.cwd(), args.out) || '.'} ` +
          `(${Date.now() - started} ms)`,
      );
    }
  } catch (err) {
    console.error(`build-index: error: ${err instanceof IndexError ? err.message : err.stack}`);
    process.exit(1);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
