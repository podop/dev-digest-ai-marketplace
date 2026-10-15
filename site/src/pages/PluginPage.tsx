import { useEffect, useState } from 'react';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { CopyCommand } from '../components/CopyCommand';
import { MarkdownBody } from '../components/Markdown';
import { EmptyState } from '../components/States';
import { Tabs, type Tab } from '../components/Tabs';
import { TypeBadge } from '../components/TypeBadge';
import { t, tn } from '../i18n';
import type { Catalog } from '../lib/data';
import { formatBytes, githubTreeUrl } from '../lib/format';
import { routes } from '../lib/router';
import type { Artifact } from '../lib/types';
import { usePageTitle } from '../lib/usePageTitle';

function ComponentList({ ids, catalog, empty }: { ids: string[]; catalog: Catalog; empty: string }) {
  const items = ids.map((id) => catalog.artifactsById.get(id)).filter((a): a is Artifact => Boolean(a));
  if (items.length === 0) return <p className="muted">{empty}</p>;
  return (
    <ul className="component-list">
      {items.map((a) => (
        <li key={a.id} className="component-item">
          <div className="component-head">
            <TypeBadge kind={a.type} />
            <a href={routes.artifact(a.id)} className="component-name">
              {a.name}
            </a>
          </div>
          {a.description ? <p className="component-desc">{a.description}</p> : null}
        </li>
      ))}
    </ul>
  );
}

export function PluginPage({ catalog, name }: { catalog: Catalog; name: string }) {
  const { index } = catalog;
  const plugin = catalog.pluginsByName.get(name);
  usePageTitle(plugin ? plugin.name : t('plugin.notFoundTitle'), index.marketplace.name);
  const [tab, setTab] = useState('readme');
  useEffect(() => setTab('readme'), [name]);

  if (!plugin) {
    return (
      <EmptyState title={t('plugin.notFoundTitle')} body={t('plugin.notFoundBody', { name })}>
        <a className="button" href={routes.search(name)}>
          {t('plugin.searchInstead')}
        </a>
      </EmptyState>
    );
  }

  const repo = index.marketplace.repo;
  const marketplace = index.marketplace.name;
  const sourceUrl = githubTreeUrl(repo, plugin.sourcePath);
  const docContext = (file: string) => ({ repo, sourcePath: `${plugin.sourcePath}/${file}` });
  const tabs: Tab[] = [
    {
      id: 'readme',
      label: t('plugin.tabReadme'),
      render: () => <MarkdownBody path={plugin.readme} context={docContext('README.md')} emptyText={t('plugin.noReadme')} />,
    },
    {
      id: 'changelog',
      label: t('plugin.tabChangelog'),
      render: () => (
        <MarkdownBody path={plugin.changelog} context={docContext('CHANGELOG.md')} emptyText={t('plugin.noChangelog')} />
      ),
    },
  ];
  if (plugin.compatibilityDoc) {
    tabs.push({
      id: 'compatibility',
      label: t('plugin.tabCompatibility'),
      render: () => (
        <MarkdownBody path={plugin.compatibilityDoc} context={docContext('COMPATIBILITY.md')} emptyText={t('common.none')} />
      ),
    });
  }

  const meta: { label: string; value: string }[] = [
    { label: t('plugin.version'), value: plugin.version ?? t('common.notSpecified') },
    { label: t('plugin.owner'), value: plugin.owner || t('common.notSpecified') },
    { label: t('plugin.license'), value: plugin.license ?? t('common.notSpecified') },
    { label: t('plugin.compatibility'), value: plugin.compatibility ?? t('common.notSpecified') },
  ];
  if (plugin.category) meta.push({ label: t('plugin.category'), value: plugin.category });
  meta.push({ label: t('plugin.contextSize'), value: formatBytes(plugin.contextBytes) });

  return (
    <article className="detail">
      <Breadcrumbs items={[{ label: t('nav.home'), href: routes.home() }, { label: plugin.name }]} />
      <header className="detail-header">
        <div className="detail-title-row">
          <TypeBadge kind="plugin" />
          <h1 className="page-title">{plugin.name}</h1>
          {plugin.version ? <span className="version version-lg">{t('plugin.versionValue', { version: plugin.version })}</span> : null}
        </div>
        <p className="detail-lead">{plugin.description || t('common.noDescription')}</p>
        {plugin.keywords.length > 0 ? (
          <ul className="chips" aria-label={t('plugin.keywords')}>
            {plugin.keywords.map((k) => (
              <li key={k} className="chip">
                <a href={routes.search(k)}>{k}</a>
              </li>
            ))}
          </ul>
        ) : null}
      </header>

      <div className="detail-layout">
        <div className="detail-main">
          <section className="panel" aria-labelledby="install-title">
            <h2 id="install-title" className="panel-title">
              {t('plugin.install')}
            </h2>
            <CopyCommand value={plugin.install} label={t('plugin.installSlashLabel')} caption={t('plugin.installSlash')} />
            <CopyCommand
              value={t('plugin.cliCommand', { name: plugin.name, marketplace })}
              label={t('plugin.installCliLabel')}
              caption={t('plugin.installCli')}
            />
            <p className="hint">
              {t('plugin.installHint')} <a href={routes.gettingStarted()}>{t('nav.gettingStarted')}</a>
            </p>
          </section>

          <section className="panel" aria-labelledby="components-title">
            <h2 id="components-title" className="panel-title">
              {t('plugin.components')}
            </h2>
            <p className="component-counts">
              <span>{tn('count.skills', plugin.components.skills.length)}</span>
              <span>{tn('count.agents', plugin.components.agents.length)}</span>
              <span>{tn('count.hooks', plugin.components.hooks)}</span>
              <span>{tn('count.evals', plugin.components.evals)}</span>
            </p>
            <h3 className="subhead">{t('plugin.skills')}</h3>
            <ComponentList ids={plugin.components.skills} catalog={catalog} empty={t('plugin.noSkills')} />
            <h3 className="subhead">{t('plugin.agents')}</h3>
            <ComponentList ids={plugin.components.agents} catalog={catalog} empty={t('plugin.noAgents')} />
          </section>

          <section className="panel" aria-label={t('plugin.docsLabel')}>
            <Tabs tabs={tabs} active={tab} onChange={setTab} label={t('plugin.docsLabel')} />
          </section>
        </div>

        <aside className="detail-side">
          <section className="panel" aria-labelledby="details-title">
            <h2 id="details-title" className="panel-title">
              {t('plugin.details')}
            </h2>
            <dl className="meta">
              {meta.map((m) => (
                <div key={m.label} className="meta-row">
                  <dt>{m.label}</dt>
                  <dd>{m.value}</dd>
                </div>
              ))}
            </dl>
            <p className="hint">{t('plugin.contextHint')}</p>
            {sourceUrl ? (
              <a className="button button-block" href={sourceUrl} target="_blank" rel="noopener noreferrer">
                {t('common.viewSource')}
              </a>
            ) : null}
          </section>

          <section className="panel" aria-labelledby="deps-title">
            <h2 id="deps-title" className="panel-title">
              {t('plugin.dependencies')}
            </h2>
            {plugin.dependencies.length === 0 ? (
              <p className="muted">{t('plugin.noDependencies')}</p>
            ) : (
              <ul className="dep-list">
                {plugin.dependencies.map((d) => (
                  <li key={d.name}>
                    {catalog.pluginsByName.has(d.name) ? <a href={routes.plugin(d.name)}>{d.name}</a> : <span>{d.name}</span>}
                    <code className="dep-range">{d.version ?? t('plugin.anyVersion')}</code>
                    {!catalog.pluginsByName.has(d.name) ? <span className="muted">{t('plugin.depExternal')}</span> : null}
                  </li>
                ))}
              </ul>
            )}
            <h3 className="subhead">{t('plugin.dependents')}</h3>
            {plugin.dependents.length === 0 ? (
              <p className="muted">{t('plugin.noDependents')}</p>
            ) : (
              <ul className="dep-list">
                {plugin.dependents.map((d) => (
                  <li key={d}>
                    <a href={routes.plugin(d)}>{d}</a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </article>
  );
}
