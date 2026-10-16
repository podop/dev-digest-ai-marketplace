import { Count, PluginCard, StatCard, VersionChip } from '../components/Cards';
import { MetaItem, PageBody, PageHeader } from '../components/PageHeader';
import { Muted } from '../components/States';
import { t, tn } from '../i18n';
import type { Catalog } from '../lib/data';
import { formatDate, githubCommitUrl, githubRepoUrl, shortSha } from '../lib/format';
import { routes } from '../lib/router';
import { usePageTitle } from '../lib/usePageTitle';
import { Badge, Button, Card, EmptyState, Kbd, SectionLabel } from '../ui';

export function Home({ catalog }: { catalog: Catalog }) {
  const { index, releases } = catalog;
  usePageTitle(null, index.marketplace.name);
  const skills = index.artifacts.filter((a) => a.type === 'skill').length;
  const agents = index.artifacts.filter((a) => a.type === 'agent').length;
  const evals = index.plugins.reduce((n, p) => n + p.components.evals, 0);
  const stats = [
    { key: 'plugins', icon: 'Boxes', label: tn('stat.plugins', index.plugins.length), value: index.plugins.length, href: routes.search('', 'plugin') },
    { key: 'skills', icon: 'Sparkles', label: tn('stat.skills', skills), value: skills, href: routes.search('', 'skill') },
    { key: 'agents', icon: 'Cpu', label: tn('stat.agents', agents), value: agents, href: routes.search('', 'agent') },
    { key: 'evals', icon: 'FlaskConical', label: tn('stat.evals', evals), value: evals, href: null },
  ] as const;
  const latest = releases.slice(0, 3);
  const repo = index.marketplace.repo;
  const repoUrl = githubRepoUrl(repo);
  const commitUrl = githubCommitUrl(repo, index.commit);
  const known = (name: string) => catalog.pluginsByName.has(name);

  return (
    <>
      <PageHeader
        title={index.marketplace.name || t('app.name')}
        bordered
        meta={
          <>
            {index.marketplace.owner ? (
              <MetaItem icon="User" label={t('plugin.owner')}>
                {index.marketplace.owner}
              </MetaItem>
            ) : null}
            {repo ? (
              <MetaItem icon="Github" mono>
                {repo}
              </MetaItem>
            ) : null}
            {index.commit ? (
              <MetaItem icon="GitCommit" mono>
                {commitUrl ? (
                  <a className="cat-link" href={commitUrl} target="_blank" rel="noopener noreferrer">
                    {t('footer.commit', { commit: shortSha(index.commit) })}
                  </a>
                ) : (
                  t('footer.commit', { commit: shortSha(index.commit) })
                )}
              </MetaItem>
            ) : null}
          </>
        }
        description={index.marketplace.description || t('home.lead')}
        actions={
          <>
            <Button kind="secondary" icon="BookOpen" href={routes.gettingStarted()}>
              {t('nav.gettingStarted')}
            </Button>
            {repoUrl ? (
              <Button kind="primary" icon="Github" href={repoUrl} target="_blank">
                {t('common.viewOnGitHub')}
              </Button>
            ) : null}
          </>
        }
      />

      <PageBody>
        <p style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)', marginBottom: 18 }}>
          <Kbd>{t('search.kbd')}</Kbd>
          <span>{t('search.shortcutHint')}</span>
        </p>

        <section aria-label={t('home.statsLabel')} className="cat-grid-stats">
          {stats.map((s) => (
            <StatCard key={s.key} icon={s.icon} label={s.label} value={s.value} href={s.href} />
          ))}
        </section>

        <div className="cat-split" style={{ marginTop: 28 }}>
          <section aria-labelledby="home-plugins-title" style={{ minWidth: 0 }}>
            <SectionLabel icon="Boxes" as="h2" id="home-plugins-title" right={<span className="tnum" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{index.plugins.length}</span>}>
              {t('home.pluginsTitle')}
            </SectionLabel>
            {index.plugins.length === 0 ? (
              <Card>
                <EmptyState
                  icon="Boxes"
                  title={t('home.emptyTitle')}
                  body={t('home.emptyBody')}
                  headingLevel={3}
                  action={
                    <Button kind="secondary" icon="ArrowRight" href={routes.gettingStarted()}>
                      {t('home.emptyAction')}
                    </Button>
                  }
                />
              </Card>
            ) : (
              <div className="cat-grid-cards">
                {[...index.plugins]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((p) => (
                    <PluginCard key={p.name} plugin={p} known={known} />
                  ))}
              </div>
            )}
          </section>

          <aside aria-labelledby="home-releases-title" style={{ minWidth: 0 }}>
            <SectionLabel icon="Tag" as="h2" id="home-releases-title">
              {t('home.releasesTitle')}
            </SectionLabel>
            <Card pad={false}>
              {latest.length === 0 ? (
                <div style={{ padding: 'var(--card-pad)' }}>
                  <Muted>{t('home.noReleases')}</Muted>
                </div>
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {latest.map((r, i) => (
                    <li
                      key={`${r.plugin}@${r.version}`}
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: '6px 10px',
                        padding: '12px 16px',
                        borderTop: i === 0 ? undefined : '1px solid var(--border)',
                      }}
                    >
                      <a className="cat-link-plain mono" href={routes.plugin(r.plugin)} style={{ fontSize: 13, fontWeight: 600 }}>
                        {r.plugin}
                      </a>
                      <VersionChip version={r.version} />
                      {r.untagged ? (
                        <Badge color="var(--warn)" bg="var(--warn-bg)" title={t('releases.untaggedHint')}>
                          {t('releases.untagged')}
                        </Badge>
                      ) : null}
                      {r.date ? (
                        <span style={{ flexBasis: '100%' }}>
                          <Count icon="Calendar">
                            <time dateTime={r.date}>{formatDate(r.date)}</time>
                          </Count>
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
              <div style={{ borderTop: '1px solid var(--border)', padding: '10px 16px' }}>
                <a className="cat-link" href={routes.whatsNew()} style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {t('home.allReleases')}
                </a>
              </div>
            </Card>
          </aside>
        </div>
      </PageBody>
    </>
  );
}
