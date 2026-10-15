import MiniSearch, { type SearchResult } from 'minisearch';
import type { CatalogIndex, DocKind } from './types';

interface SearchDoc {
  key: string;
  kind: DocKind;
  id: string;
  /** Stored copy of `id` (a stored field named `id` would clash with MiniSearch's result id). */
  ref: string;
  name: string;
  plugin: string;
  description: string;
  keywords: string;
  searchText: string;
}

export interface SearchHit {
  key: string;
  kind: DocKind;
  id: string;
  name: string;
  plugin: string;
  description: string;
  score: number;
  terms: string[];
}

const FIELDS = ['name', 'id', 'description', 'keywords', 'searchText'] as const;
const BOOST = { name: 4, id: 3, description: 2, keywords: 2, searchText: 1 };
const KIND_ORDER: Record<DocKind, number> = { plugin: 0, skill: 1, agent: 2 };

/** Filler words removed from natural-language queries ("I need a skill for database migrations"). */
const STOP_WORDS = new Set([
  'a', 'about', 'all', 'also', 'am', 'an', 'and', 'any', 'anything', 'are', 'as', 'at', 'be', 'best', 'but', 'by',
  'can', 'could', 'do', 'does', 'doing', 'for', 'from', 'get', 'give', 'good', 'got', 'have', 'help', 'helps',
  'how', 'i', "i'd", "i'm", 'if', 'in', 'into', 'is', 'it', 'its', 'just', 'let', 'like', 'look', 'looking',
  'me', 'my', 'need', 'needs', 'of', 'on', 'one', 'or', 'our', 'please', 'should', 'show', 'so', 'some',
  'something', 'that', 'the', 'their', 'them', 'there', 'these', 'thing', 'things', 'this', 'to', 'us', 'use',
  'using', 'want', 'wants', 'was', 'we', 'what', 'when', 'where', 'which', 'who', 'why', 'will', 'with',
  'would', 'you', 'your',
]);

const TYPE_WORDS: Record<string, DocKind> = {
  plugin: 'plugin',
  plugins: 'plugin',
  skill: 'skill',
  skills: 'skill',
  agent: 'agent',
  agents: 'agent',
  subagent: 'agent',
  subagents: 'agent',
};

export interface AnalyzedQuery {
  /** Terms sent to MiniSearch. */
  terms: string[];
  /** Type named in the query ("skill", "agent", "plugin"), if any. */
  impliedType: DocKind | null;
}

export function analyzeQuery(raw: string): AnalyzedQuery {
  const words = raw
    .toLowerCase()
    .split(/[\s,.;!?()"“”]+/)
    .map((w) => w.replace(/^['’]+|['’]+$/g, ''))
    .filter(Boolean);
  let impliedType: DocKind | null = null;
  const terms: string[] = [];
  for (const word of words) {
    const type = TYPE_WORDS[word];
    if (type) {
      impliedType ??= type;
      continue;
    }
    if (!STOP_WORDS.has(word)) terms.push(word);
  }
  // A query made only of filler ("how to") still searches for what was typed.
  if (terms.length === 0 && impliedType === null) terms.push(...words);
  return { terms, impliedType };
}

export function buildSearchIndex(index: CatalogIndex): MiniSearch<SearchDoc> {
  const search = new MiniSearch<SearchDoc>({
    idField: 'key',
    fields: [...FIELDS],
    storeFields: ['kind', 'ref', 'name', 'plugin', 'description'],
    searchOptions: { boost: BOOST, prefix: true, fuzzy: 0.2 },
  });
  const docs: SearchDoc[] = [
    ...index.plugins.map((p) => ({
      key: `plugin:${p.name}`,
      kind: 'plugin' as const,
      id: p.name,
      ref: p.name,
      name: p.name,
      plugin: p.name,
      description: p.description,
      keywords: [...p.keywords, p.category ?? ''].join(' '),
      searchText: p.searchText ?? '',
    })),
    ...index.artifacts.map((a) => ({
      key: `${a.type}:${a.id}`,
      kind: a.type,
      id: a.id,
      ref: a.id,
      name: a.name,
      plugin: a.plugin,
      description: a.description,
      keywords: '',
      searchText: a.searchText ?? '',
    })),
  ];
  search.addAll(docs);
  return search;
}

export interface SearchOptions {
  type: DocKind | null;
  plugin: string | null;
}

export interface SearchOutcome {
  hits: SearchHit[];
  /** Type actually applied: the user's filter, otherwise the one implied by the query. */
  effectiveType: DocKind | null;
  impliedType: DocKind | null;
  terms: string[];
}

function toHit(r: SearchResult): SearchHit {
  return {
    key: String(r.id),
    kind: r.kind as DocKind,
    id: r.ref as string,
    name: r.name as string,
    plugin: r.plugin as string,
    description: r.description as string,
    score: r.score,
    terms: r.terms,
  };
}

export function runSearch(
  search: MiniSearch<SearchDoc>,
  index: CatalogIndex,
  rawQuery: string,
  options: SearchOptions,
  ignoreImpliedType = false,
): SearchOutcome {
  const { terms, impliedType } = analyzeQuery(rawQuery);
  const effectiveType = options.type ?? (ignoreImpliedType ? null : impliedType);
  const accept = (kind: DocKind, plugin: string) =>
    (!effectiveType || kind === effectiveType) && (!options.plugin || plugin === options.plugin);

  if (terms.length === 0) {
    // No search words: browse everything that passes the filters.
    const all: SearchHit[] = [
      ...index.plugins.map((p) => ({ key: `plugin:${p.name}`, kind: 'plugin' as const, id: p.name, name: p.name, plugin: p.name, description: p.description, score: 0, terms: [] })),
      ...index.artifacts.map((a) => ({ key: `${a.type}:${a.id}`, kind: a.type, id: a.id, name: a.name, plugin: a.plugin, description: a.description, score: 0, terms: [] })),
    ];
    const hits = all
      .filter((h) => accept(h.kind, h.plugin))
      .sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.id.localeCompare(b.id));
    return { hits, effectiveType, impliedType, terms };
  }

  const results = search.search(terms.join(' '), {
    filter: (r) => accept(r.kind as DocKind, r.plugin as string),
  });
  return { hits: results.map(toHit), effectiveType, impliedType, terms };
}
