import { useEffect, useMemo, useState } from 'react';
import { ResultCard } from '../components/Cards';
import { EmptyState } from '../components/States';
import { t, tn } from '../i18n';
import type { Catalog } from '../lib/data';
import { navigate, routes, type Route } from '../lib/router';
import { buildSearchIndex, runSearch } from '../lib/search';
import type { CatalogIndex, DocKind } from '../lib/types';
import { usePageTitle } from '../lib/usePageTitle';

const KINDS: DocKind[] = ['plugin', 'skill', 'agent'];
const TYPE_LABEL_KEYS = { plugin: 'search.typePlugins', skill: 'search.typeSkills', agent: 'search.typeAgents' } as const;
const TYPE_NOUN_KEYS = { plugin: 'search.nounPlugins', skill: 'search.nounSkills', agent: 'search.nounAgents' } as const;

const indexCache = new WeakMap<CatalogIndex, ReturnType<typeof buildSearchIndex>>();
function getSearchIndex(index: CatalogIndex) {
  let search = indexCache.get(index);
  if (!search) {
    search = buildSearchIndex(index);
    indexCache.set(index, search);
  }
  return search;
}

function parseType(value: string | null): DocKind | 'all' | null {
  return value === 'all' || KINDS.includes(value as DocKind) ? (value as DocKind | 'all') : null;
}

export function Search({ catalog, route }: { catalog: Catalog; route: Route }) {
  const { index } = catalog;
  usePageTitle(t('search.title'), index.marketplace.name);
  const q = route.query.get('q') ?? '';
  const typeParam = parseType(route.query.get('type'));
  const pluginParam = route.query.get('plugin');
  const plugin = pluginParam && catalog.pluginsByName.has(pluginParam) ? pluginParam : null;
  const [text, setText] = useState(q);
  useEffect(() => setText(q), [q]);

  const outcome = useMemo(
    () =>
      runSearch(
        getSearchIndex(index),
        index,
        q,
        { type: typeParam === 'all' ? null : typeParam, plugin },
        typeParam === 'all',
      ),
    [index, q, typeParam, plugin],
  );

  const update = (next: { q?: string; type?: DocKind | 'all' | null; plugin?: string | null }, replace = false) =>
    navigate(routes.search(next.q ?? q, next.type !== undefined ? next.type : typeParam, next.plugin !== undefined ? next.plugin : plugin), replace);

  const impliedActive = typeParam === null && outcome.impliedType !== null && outcome.effectiveType === outcome.impliedType;
  const hasFilters = typeParam !== null || plugin !== null;
  const pluginNames = useMemo(() => index.plugins.map((p) => p.name).sort(), [index]);

  return (
    <>
      <h1 className="page-title">{t('search.title')}</h1>
      <form
        className="search-panel"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          update({ q: text.trim() });
        }}
      >
        <div className="search-form search-form-hero">
          <label htmlFor="search-page-input" className="visually-hidden">
            {t('search.label')}
          </label>
          <input
            id="search-page-input"
            type="search"
            className="input search-input"
            placeholder={t('search.placeholderLong')}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              update({ q: e.target.value }, true);
            }}
            data-search="primary"
            autoComplete="off"
            spellCheck={false}
            autoFocus={!q}
          />
        </div>
        <div className="filters">
          <label className="filter">
            <span className="filter-label">{t('search.filterType')}</span>
            <select
              className="input select"
              value={typeParam === 'all' || typeParam === null ? (impliedActive ? outcome.impliedType ?? '' : '') : typeParam}
              onChange={(e) => update({ type: e.target.value === '' ? 'all' : (e.target.value as DocKind) })}
            >
              <option value="">{t('search.typeAll')}</option>
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {t(TYPE_LABEL_KEYS[k])}
                </option>
              ))}
            </select>
          </label>
          <label className="filter">
            <span className="filter-label">{t('search.filterPlugin')}</span>
            <select
              className="input select"
              value={plugin ?? ''}
              onChange={(e) => update({ plugin: e.target.value || null })}
            >
              <option value="">{t('search.pluginAll')}</option>
              {pluginNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          {hasFilters ? (
            <button type="button" className="button button-ghost" onClick={() => navigate(routes.search(q), false)}>
              {t('search.clearFilters')}
            </button>
          ) : null}
        </div>
      </form>

      <div className="search-summary" role="status" aria-live="polite">
        <span>
          {q.trim()
            ? tn('search.resultsFor', outcome.hits.length, { query: q.trim() })
            : tn('search.results', outcome.hits.length)}
        </span>
        {impliedActive && outcome.impliedType ? (
          <span className="implied">
            {t('search.impliedType', { type: t(TYPE_NOUN_KEYS[outcome.impliedType]) })}{' '}
            <button type="button" className="link-button" onClick={() => update({ type: 'all' })}>
              {t('search.showAllTypes')}
            </button>
          </span>
        ) : null}
      </div>

      {index.plugins.length === 0 ? (
        <EmptyState title={t('home.emptyTitle')} body={t('home.emptyBody')} />
      ) : outcome.hits.length === 0 ? (
        <EmptyState title={t('search.noResultsTitle', { query: q.trim() })} body={t('search.noResultsBody')}>
          {hasFilters ? (
            <button type="button" className="button" onClick={() => navigate(routes.search(q))}>
              {t('search.clearFilters')}
            </button>
          ) : null}
        </EmptyState>
      ) : (
        <div className="card-grid results">
          {outcome.hits.map((hit) => (
            <ResultCard key={hit.key} hit={hit} />
          ))}
        </div>
      )}
    </>
  );
}
