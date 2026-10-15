#!/usr/bin/env node
// Summarize `claude plugin eval` results for docs/COST-BASELINE.md: per case and overall —
// pass rate, median cost and latency, tokens (input / output / cache read / cache write),
// API calls, tool calls and subagents. Token detail needs the run traces, so run the evals
// with --keep-temp (traces are read from each run's tracePath).
//
//   node scripts/cost-report.mjs <results dir | aggregate-result.json> [...more] [--json]

import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const inputs = args.filter((a) => !a.startsWith('--'));
if (!inputs.length) {
  console.error('usage: cost-report.mjs <results dir | aggregate-result.json> [...] [--json]');
  process.exit(2);
}

const median = (xs) => {
  const s = [...xs].filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const sum = (xs) => xs.reduce((a, b) => a + (b ?? 0), 0);

function traceStats(path) {
  if (!path || !existsSync(path)) return null;
  const requests = new Set();
  const toolUses = new Set();
  let result = null;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    let o;
    try {
      o = JSON.parse(line);
    } catch {
      continue;
    }
    if (o.type === 'assistant') {
      if (o.request_id) requests.add(o.request_id);
      for (const block of o.message?.content ?? []) if (block.type === 'tool_use') toolUses.add(block.id);
    }
    if (o.type === 'result') result = o;
  }
  const models = Object.values(result?.modelUsage ?? {});
  return {
    inputTokens: sum(models.map((m) => m.inputTokens)),
    outputTokens: sum(models.map((m) => m.outputTokens)),
    cacheReadTokens: sum(models.map((m) => m.cacheReadInputTokens)),
    cacheWriteTokens: sum(models.map((m) => m.cacheCreationInputTokens)),
    apiCalls: requests.size,
    toolCalls: toolUses.size,
    subagents: result?.subagent_stats?.spawned ?? 0,
    subagentTypes: result?.subagent_stats?.by_type ?? {},
    apiSeconds: result?.duration_api_ms ? result.duration_api_ms / 1000 : null,
    models: Object.keys(result?.modelUsage ?? {}),
  };
}

const runsByCase = new Map();
const meta = [];
for (const input of inputs) {
  const file = statSync(input).isDirectory() ? join(input, 'aggregate-result.json') : input;
  const doc = JSON.parse(readFileSync(file, 'utf8'));
  meta.push({ file, claudeVersion: doc.claudeVersion, startedAt: doc.startedAt, plugins: doc.suite?.plugins?.map((p) => `${p.name}@${p.version}`) });
  for (const c of doc.cases ?? []) {
    const list = runsByCase.get(c.name) ?? [];
    for (const r of c.arms?.with ?? []) {
      list.push({ score: r.score, passed: r.passed, costUsd: r.costUsd, judgeCostUsd: r.judgeCostUsd ?? 0, durationSeconds: r.durationSeconds, error: r.error, trace: traceStats(r.tracePath) });
    }
    runsByCase.set(c.name, list);
  }
}

const summarize = (runs) => {
  const t = runs.map((r) => r.trace).filter(Boolean);
  return {
    runs: runs.length,
    passRate: runs.length ? runs.filter((r) => r.passed).length / runs.length : null,
    meanScore: runs.length ? sum(runs.map((r) => r.score)) / runs.length : null,
    errors: runs.filter((r) => r.error).map((r) => r.error),
    medianCostUsd: median(runs.map((r) => r.costUsd - r.judgeCostUsd)),
    totalCostUsd: sum(runs.map((r) => r.costUsd)),
    medianLatencySeconds: median(runs.map((r) => r.durationSeconds)),
    tracesRead: t.length,
    medianInputTokens: median(t.map((x) => x.inputTokens)),
    medianOutputTokens: median(t.map((x) => x.outputTokens)),
    medianCacheReadTokens: median(t.map((x) => x.cacheReadTokens)),
    medianCacheWriteTokens: median(t.map((x) => x.cacheWriteTokens)),
    medianApiCalls: median(t.map((x) => x.apiCalls)),
    medianToolCalls: median(t.map((x) => x.toolCalls)),
    medianSubagents: median(t.map((x) => x.subagents)),
    models: [...new Set(t.flatMap((x) => x.models))],
  };
};

const cases = Object.fromEntries([...runsByCase].map(([name, runs]) => [name, summarize(runs)]));
const overall = summarize([...runsByCase.values()].flat());

if (asJson) {
  console.log(JSON.stringify({ meta, cases, overall }, null, 2));
  process.exit(0);
}

const f = (n, d = 0) => (n === null || n === undefined ? '—' : Number(n).toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d }));
const usd = (n) => (n === null ? '—' : `$${n.toFixed(3)}`);
console.log(`Sources: ${meta.map((m) => `${m.file} (Claude Code ${m.claudeVersion})`).join('; ')}`);
console.log(`Models: ${overall.models.join(', ') || 'n/a (no traces — run with --keep-temp)'}\n`);
console.log('| Case | Runs | Pass | Median cost | Median latency | Input | Output | Cache read | Cache write | API calls | Tool calls | Subagents |');
console.log('|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const [name, s] of [...Object.entries(cases), ['**all**', overall]]) {
  console.log(`| ${name} | ${s.runs} | ${f(s.passRate * 100)}% | ${usd(s.medianCostUsd)} | ${f(s.medianLatencySeconds)} s | ${f(s.medianInputTokens)} | ${f(s.medianOutputTokens)} | ${f(s.medianCacheReadTokens)} | ${f(s.medianCacheWriteTokens)} | ${f(s.medianApiCalls)} | ${f(s.medianToolCalls)} | ${f(s.medianSubagents)} |`);
}
console.log(`\nTotal cost incl. judges: ${usd(overall.totalCostUsd)} · run errors: ${overall.errors.length ? overall.errors.join('; ') : 'none'}`);
console.log('Costs are list-price estimates from Claude Code; medians exclude judge cost.');
