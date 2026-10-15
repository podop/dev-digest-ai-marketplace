import { useEffect, type MouseEvent, type ReactNode } from 'react';
import { t } from '../i18n';
import { formatDateTime, githubCommitUrl, githubRepoUrl, shortSha } from '../lib/format';
import { routes, type Route } from '../lib/router';
import { useTheme } from '../lib/theme';
import type { CatalogIndex } from '../lib/types';
import { SearchForm } from './SearchForm';

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/** `/` focuses the most prominent search box on the page. */
function useSearchShortcut() {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey || isTypingTarget(event.target)) return;
      const input =
        document.querySelector<HTMLInputElement>('[data-search="primary"]') ??
        document.querySelector<HTMLInputElement>('[data-search="header"]');
      if (!input) return;
      event.preventDefault();
      input.focus();
      input.select();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}

const NAV = [
  { href: routes.search(), match: 'search', key: 'nav.search' },
  { href: routes.whatsNew(), match: 'whats-new', key: 'nav.whatsNew' },
  { href: routes.gettingStarted(), match: 'getting-started', key: 'nav.gettingStarted' },
] as const;

export function Layout({ route, index, children }: { route: Route; index: CatalogIndex | null; children: ReactNode }) {
  const [theme, toggleTheme] = useTheme();
  useSearchShortcut();
  const section = route.segments[0] ?? '';
  const showHeaderSearch = section !== '' && section !== 'search';
  const repo = index?.marketplace.repo ?? null;
  const repoUrl = githubRepoUrl(repo);
  const commitUrl = githubCommitUrl(repo, index?.commit ?? null);

  function skipToContent(event: MouseEvent<HTMLAnchorElement>) {
    // The hash is reserved for routing, so move focus instead of following the link.
    event.preventDefault();
    document.getElementById('main')?.focus();
  }

  return (
    <div className="app">
      <a className="skip-link" href={routes.home()} onClick={skipToContent}>
        {t('app.skipToContent')}
      </a>
      <header className="site-header">
        <div className="container header-inner">
          <a className="brand" href={routes.home()}>
            <span className="brand-mark" aria-hidden="true" />
            <span className="brand-text">{index?.marketplace.name || t('app.name')}</span>
          </a>
          <nav className="nav" aria-label={t('nav.label')}>
            <ul>
              {NAV.map((item) => (
                <li key={item.match}>
                  <a href={item.href} aria-current={section === item.match ? 'page' : undefined}>
                    {t(item.key)}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="header-tools">
            {showHeaderSearch ? <SearchForm variant="header" /> : null}
            <button
              type="button"
              className="button button-ghost theme-toggle"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? t('theme.toLight') : t('theme.toDark')}
              title={theme === 'dark' ? t('theme.toLight') : t('theme.toDark')}
            >
              <span aria-hidden="true" className={`theme-icon theme-icon-${theme}`} />
            </button>
          </div>
        </div>
      </header>
      <main id="main" className="container main" tabIndex={-1}>
        {children}
      </main>
      <footer className="site-footer">
        <div className="container footer-inner">
          <p>{t('footer.note')}</p>
          {index ? (
            <p className="muted">
              {t('footer.generated', { date: formatDateTime(index.generatedAt) })}
              {index.commit ? (
                <>
                  {' '}
                  {commitUrl ? (
                    <a href={commitUrl} target="_blank" rel="noopener noreferrer">
                      {t('footer.commit', { commit: shortSha(index.commit) })}
                    </a>
                  ) : (
                    t('footer.commit', { commit: shortSha(index.commit) })
                  )}
                </>
              ) : null}
            </p>
          ) : null}
          {repoUrl ? (
            <p>
              <a href={repoUrl} target="_blank" rel="noopener noreferrer">
                {t('footer.source')}
              </a>
            </p>
          ) : null}
        </div>
      </footer>
    </div>
  );
}
