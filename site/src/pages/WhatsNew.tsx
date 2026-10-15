import { Markdown } from '../components/Markdown';
import { EmptyState } from '../components/States';
import { t } from '../i18n';
import type { Catalog } from '../lib/data';
import { formatDate, githubTagUrl } from '../lib/format';
import { routes } from '../lib/router';
import type { Release } from '../lib/types';
import { usePageTitle } from '../lib/usePageTitle';

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

export function WhatsNew({ catalog }: { catalog: Catalog }) {
  const { index, releases } = catalog;
  usePageTitle(t('whatsNew.title'), index.marketplace.name);
  const repo = index.marketplace.repo;
  const groups = groupByDate(releases);

  return (
    <>
      <h1 className="page-title">{t('whatsNew.title')}</h1>
      <p className="page-lead">{t('whatsNew.lead')}</p>
      {groups.length === 0 ? (
        <EmptyState title={t('whatsNew.emptyTitle')} body={t('whatsNew.emptyBody')} />
      ) : (
        <ol className="timeline">
          {groups.map(([date, items]) => (
            <li key={date || 'undated'} className="timeline-group">
              <h2 className="timeline-date">
                {date ? <time dateTime={date}>{formatDate(date)}</time> : t('whatsNew.undated')}
              </h2>
              <ul className="timeline-items">
                {items.map((r) => {
                  const tagUrl = githubTagUrl(repo, r.tag);
                  const plugin = catalog.pluginsByName.get(r.plugin);
                  return (
                    <li key={`${r.plugin}@${r.version}`} className="card release-card">
                      <header className="card-head">
                        <h3 className="card-title">
                          <a href={routes.plugin(r.plugin)}>{r.plugin}</a>
                        </h3>
                        <span className="version">{t('plugin.versionValue', { version: r.version })}</span>
                        {r.untagged ? (
                          <span className="badge badge-muted" title={t('releases.untaggedHint')}>
                            {t('releases.untagged')}
                          </span>
                        ) : tagUrl ? (
                          <a className="badge badge-tag" href={tagUrl} target="_blank" rel="noopener noreferrer">
                            {r.tag}
                          </a>
                        ) : (
                          <span className="badge badge-tag">{r.tag}</span>
                        )}
                      </header>
                      {r.notes.trim() ? (
                        <Markdown
                          source={r.notes}
                          context={{ repo, sourcePath: `${plugin?.sourcePath ?? ''}/CHANGELOG.md` }}
                        />
                      ) : (
                        <p className="muted">{t('whatsNew.noNotes')}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
