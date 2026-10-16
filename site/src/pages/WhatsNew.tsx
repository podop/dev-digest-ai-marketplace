import { VersionChip } from '../components/Cards';
import { Markdown } from '../components/Markdown';
import { PageBody, PageHeader } from '../components/PageHeader';
import { Muted } from '../components/States';
import { t } from '../i18n';
import type { Catalog } from '../lib/data';
import { formatDate, githubTagUrl } from '../lib/format';
import { routes } from '../lib/router';
import type { Release } from '../lib/types';
import { usePageTitle } from '../lib/usePageTitle';
import { Badge, Card, EmptyState, Icon } from '../ui';

function groupByDate(releases: Release[]): [string, Release[]][] {
  const groups = new Map<string, Release[]>();
  for (const r of releases) {
    const key = r.date ?? '';
    const list = groups.get(key) ?? [];
    list.push(r);
    groups.set(key, list);
  }
  // Releases arrive sorted newest first; undated ones go last.
  return [...groups.entries()].sort(([a], [b]) => (a === '' ? 1 : b === '' ? -1 : b.localeCompare(a)));
}

const tagStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '1px 8px',
  borderRadius: 5,
  fontSize: 12,
  border: '1px solid var(--border)',
  background: 'var(--bg-surface)',
  color: 'var(--text-secondary)',
  maxWidth: '100%',
  overflowWrap: 'anywhere',
} as const;

function TagChip({ tag, url }: { tag: string; url: string | null }) {
  const inner = (
    <>
      <Icon.Tag size={12} aria-hidden="true" style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
      {tag}
    </>
  );
  return url ? (
    <a className="mono cat-chip-link" href={url} target="_blank" rel="noopener noreferrer" style={tagStyle}>
      {inner}
    </a>
  ) : (
    <span className="mono" style={tagStyle}>
      {inner}
    </span>
  );
}

export function WhatsNew({ catalog }: { catalog: Catalog }) {
  const { index, releases } = catalog;
  usePageTitle(t('whatsNew.title'), index.marketplace.name);
  const repo = index.marketplace.repo;
  const groups = groupByDate(releases);

  return (
    <>
      <PageHeader title={t('whatsNew.title')} description={t('whatsNew.lead')} bordered />
      <PageBody narrow>
        {groups.length === 0 ? (
          <Card>
            <EmptyState icon="History" title={t('whatsNew.emptyTitle')} body={t('whatsNew.emptyBody')} />
          </Card>
        ) : (
          <ol className="cat-timeline">
            {groups.map(([date, items]) => (
              <li key={date || 'undated'} className="cat-timeline-group">
                <span className="cat-timeline-dot" aria-hidden="true" />
                <h2
                  className="mono"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}
                >
                  <Icon.Calendar size={13} aria-hidden="true" style={{ color: 'var(--text-muted)' }} />
                  {date ? <time dateTime={date}>{formatDate(date)}</time> : t('whatsNew.undated')}
                </h2>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {items.map((r) => {
                    const plugin = catalog.pluginsByName.get(r.plugin);
                    return (
                      <Card as="li" key={`${r.plugin}@${r.version}`}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          <h3 style={{ fontSize: 14.5, fontWeight: 600 }}>
                            <a className="cat-link-plain mono" href={routes.plugin(r.plugin)}>
                              {r.plugin}
                            </a>
                          </h3>
                          <VersionChip version={r.version} />
                          {r.untagged ? (
                            <Badge color="var(--warn)" bg="var(--warn-bg)" title={t('releases.untaggedHint')}>
                              {t('releases.untagged')}
                            </Badge>
                          ) : r.tag ? (
                            <TagChip tag={r.tag} url={githubTagUrl(repo, r.tag)} />
                          ) : null}
                        </div>
                        {r.notes.trim() ? (
                          <div className="cat-release-notes">
                            <Markdown source={r.notes} context={{ repo, sourcePath: `${plugin?.sourcePath ?? ''}/CHANGELOG.md` }} />
                          </div>
                        ) : (
                          <Muted>{t('whatsNew.noNotes')}</Muted>
                        )}
                      </Card>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </PageBody>
    </>
  );
}
