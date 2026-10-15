import { PluginCard } from '../components/Cards';
import { SearchForm } from '../components/SearchForm';
import { EmptyState } from '../components/States';
import { t, tn } from '../i18n';
import type { Catalog } from '../lib/data';
import { formatDate } from '../lib/format';
import { routes } from '../lib/router';
import { usePageTitle } from '../lib/usePageTitle';

export function Home({ catalog }: { catalog: Catalog }) {
  const { index, releases } = catalog;
  usePageTitle(null, index.marketplace.name);
  const skills = index.artifacts.filter((a) => a.type === 'skill').length;
  const agents = index.artifacts.filter((a) => a.type === 'agent').length;
  const evals = index.plugins.reduce((n, p) => n + p.components.evals, 0);
  const stats = [
    { key: 'plugins', label: tn('stat.plugins', index.plugins.length), value: index.plugins.length, href: routes.search('', 'plugin') },
    { key: 'skills', label: tn('stat.skills', skills), value: skills, href: routes.search('', 'skill') },
    { key: 'agents', label: tn('stat.agents', agents), value: agents, href: routes.search('', 'agent') },
    { key: 'evals', label: tn('stat.evals', evals), value: evals, href: null },
  ];
  const latest = releases.slice(0, 3);

  return (
    <>
      <section className="hero">
        <h1 className="hero-title">{index.marketplace.name || t('app.name')}</h1>
        <p className="hero-lead">{index.marketplace.description || t('home.lead')}</p>
        <SearchForm variant="hero" />
        <p className="hint">{t('search.shortcutHint')}</p>
      </section>

      <section aria-label={t('home.statsLabel')}>
        <ul className="stats">
          {stats.map((s) => (
            <li key={s.key} className="stat">
              {s.href ? (
                <a href={s.href} className="stat-link">
                  <span className="stat-value">{s.value}</span>
                  <span className="stat-label">{s.label}</span>
                </a>
              ) : (
                <>
                  <span className="stat-value">{s.value}</span>
                  <span className="stat-label">{s.label}</span>
                </>
              )}
            </li>
          ))}
        </ul>
      </section>

      <div className="home-grid">
        <section className="home-plugins" aria-labelledby="home-plugins-title">
          <h2 id="home-plugins-title" className="section-title">
            {t('home.pluginsTitle')}
          </h2>
          {index.plugins.length === 0 ? (
            <EmptyState title={t('home.emptyTitle')} body={t('home.emptyBody')}>
              <a className="button" href={routes.gettingStarted()}>
                {t('home.emptyAction')}
              </a>
            </EmptyState>
          ) : (
            <div className="card-grid">
              {[...index.plugins]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((p) => (
                  <PluginCard key={p.name} plugin={p} />
                ))}
            </div>
          )}
        </section>

        <aside className="home-releases" aria-labelledby="home-releases-title">
          <h2 id="home-releases-title" className="section-title">
            {t('home.releasesTitle')}
          </h2>
          {latest.length === 0 ? (
            <p className="muted">{t('home.noReleases')}</p>
          ) : (
            <ul className="release-list">
              {latest.map((r) => (
                <li key={`${r.plugin}@${r.version}`} className="release-item">
                  <a href={routes.plugin(r.plugin)} className="release-plugin">
                    {r.plugin}
                  </a>
                  <span className="version">{t('plugin.versionValue', { version: r.version })}</span>
                  {r.untagged ? <span className="badge badge-muted">{t('releases.untagged')}</span> : null}
                  {r.date ? (
                    <time className="muted release-date" dateTime={r.date}>
                      {formatDate(r.date)}
                    </time>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          <a href={routes.whatsNew()} className="more-link">
            {t('home.allReleases')}
          </a>
        </aside>
      </div>
    </>
  );
}
