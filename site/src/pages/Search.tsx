import { useEffect, useMemo, useState } from 'react';
import { ResultCard } from '../components/Cards';
import { PageBody, PageHeader } from '../components/PageHeader';
import { t, tn } from '../i18n';
import type { Catalog } from '../lib/data';
import { navigate, routes, type Route } from '../lib/router';
import { buildSearchIndex, runSearch } from '../lib/search';
import type { CatalogIndex, DocKind } from '../lib/types';
import { usePageTitle } from '../lib/usePageTitle';
import { Button, Card, Chip, EmptyState, Icon, SelectInput, TextInput } from '../ui';
import { TYPE_ICON } from '../components/TypeBadge';

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
  const activeType: DocKind | '' = typeParam === 'all' || typeParam === null ? (impliedActive ? outcome.impliedType ?? '' : '') : typeParam;

  return (
    <>
      <PageHeader title={t('search.title')} description={t('search.shortcutHint')} bordered />
      <PageBody>
        <form
          role="search"
          aria-label={t('search.label')}
          onSubmit={(e) => {
            e.preventDefault();
            update({ q: text.trim() });
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          <label htmlFor="search-page-input" className="visually-hidden">
            {t('search.label')}
          </label>
          <TextInput
            id="search-page-input"
            type="search"
            value={text}
            onChange={(value) => {
              setText(value);
              update({ q: value }, true);
            }}
            placeholder={t('search.placeholderLong')}
            data-search="primary"
            autoComplete="off"
            spellCheck={false}
            autoFocus={!q}
            enterKeyHint="search"
            prefix={<Icon.Search size={15} aria-hidden="true" style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
          />
          <div className="cat-filters">
            <div role="group" aria-label={t('search.filterType')} style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <Chip active={activeType === ''} onClick={() => update({ type: 'all' })}>
                {t('search.typeAll')}
              </Chip>
              {KINDS.map((k) => (
                <Chip key={k} icon={TYPE_ICON[k]} active={activeType === k} onClick={() => update({ type: k })}>
                  {t(TYPE_LABEL_KEYS[k])}
                </Chip>
              ))}
            </div>
            <div className="cat-filter-plugin">
              <SelectInput
                ariaLabel={t('search.filterPlugin')}
                value={plugin ?? ''}
                onChange={(value) => update({ plugin: value || null })}
                options={[{ value: '', label: t('search.pluginAll') }, ...pluginNames.map((name) => ({ value: name, label: name }))]}
              />
            </div>
            {hasFilters ? (
              <Button kind="tertiary" icon="X" onClick={() => navigate(routes.search(q), false)}>
                {t('search.clearFilters')}
              </Button>
            ) : null}
          </div>
        </form>

        <div
          role="status"
          aria-live="polite"
          style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 12px', margin: '18px 0 14px', fontSize: 13, color: 'var(--text-secondary)' }}
        >
          <span className="tnum">
            {q.trim() ? tn('search.resultsFor', outcome.hits.length, { query: q.trim() }) : tn('search.results', outcome.hits.length)}
          </span>
          {impliedActive && outcome.impliedType ? (
            <span style={{ color: 'var(--text-muted)' }}>
              {t('search.impliedType', { type: t(TYPE_NOUN_KEYS[outcome.impliedType]) })}{' '}
              <button type="button" className="cat-link-button" onClick={() => update({ type: 'all' })}>
                {t('search.showAllTypes')}
              </button>
            </span>
          ) : null}
        </div>

        {index.plugins.length === 0 ? (
          <Card>
            <EmptyState icon="Boxes" title={t('home.emptyTitle')} body={t('home.emptyBody')} />
          </Card>
        ) : outcome.hits.length === 0 ? (
          <Card>
            <EmptyState
              icon="SearchX"
              title={t('search.noResultsTitle', { query: q.trim() })}
              body={t('search.noResultsBody')}
              action={
                hasFilters ? (
                  <Button kind="secondary" icon="X" onClick={() => navigate(routes.search(q))}>
                    {t('search.clearFilters')}
                  </Button>
                ) : undefined
              }
            />
          </Card>
        ) : (
          <div className="cat-grid-cards">
            {outcome.hits.map((hit) => (
              <ResultCard key={hit.key} hit={hit} />
            ))}
          </div>
        )}
      </PageBody>
    </>
  );
}
