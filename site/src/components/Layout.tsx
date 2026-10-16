import { useCallback, useEffect, useMemo, useState, type MouseEvent, type ReactNode } from 'react';
import { t, tn } from '../i18n';
import type { Catalog } from '../lib/data';
import { formatDateTime, githubCommitUrl, githubRepoUrl, shortSha } from '../lib/format';
import { routes, type Route } from '../lib/router';
import { useTheme } from '../lib/theme';
import { AppFrame, IconBtn, Icon, MonoLink, Sidebar, Topbar, type Crumb, type NavGroup } from '../ui';
import { TopbarSearch } from './TopbarSearch';

const SIDEBAR_ID = 'catalog-sidebar';
const MENU_BUTTON_ID = 'catalog-menu-button';

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/** `/` (or Ctrl/Cmd+K) focuses the most prominent search box on the page. */
function useSearchShortcut() {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const slash = event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !isTypingTarget(event.target);
      const palette = (event.key === 'k' || event.key === 'K') && (event.ctrlKey || event.metaKey) && !event.altKey;
      if (!slash && !palette) return;
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

/** Breadcrumbs for the topbar, derived from the route. */
function useCrumbs(route: Route, catalog: Catalog | null): Crumb[] {
  return useMemo(() => {
    const home: Crumb = { label: catalog?.index.marketplace.name || t('app.name'), href: routes.home(), mono: true };
    const [section = '', param] = route.segments;
    switch (section) {
      case '':
        return [home];
      case 'search':
        return [home, { label: t('nav.search') }];
      case 'whats-new':
        return [home, { label: t('nav.whatsNew') }];
      case 'getting-started':
        return [home, { label: t('nav.gettingStarted') }];
      case 'plugin':
        return param
          ? [home, { label: t('nav.sectionPlugins'), href: routes.search('', 'plugin') }, { label: param, mono: true }]
          : [home, { label: t('notFound.title') }];
      case 'artifact': {
        const artifact = param ? catalog?.artifactsById.get(param) : undefined;
        if (!artifact) return [home, { label: param ?? t('notFound.title'), mono: Boolean(param) }];
        return [
          home,
          { label: artifact.plugin, href: routes.plugin(artifact.plugin), mono: true },
          { label: artifact.name, mono: true },
        ];
      }
      default:
        return [home, { label: t('notFound.title') }];
    }
  }, [route, catalog]);
}

function activeNavKey(route: Route, catalog: Catalog | null): string {
  const [section = '', param] = route.segments;
  if (section === 'plugin' && param) return `plugin:${param}`;
  if (section === 'artifact' && param) {
    const artifact = catalog?.artifactsById.get(param);
    return artifact ? `plugin:${artifact.plugin}` : '';
  }
  return section === '' ? 'home' : section;
}

const footerRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  width: '100%',
  padding: '8px 14px',
  borderRadius: 6,
  border: 'none',
  background: 'transparent',
  color: 'var(--text-secondary)',
  fontSize: 13.5,
  fontWeight: 500,
  textAlign: 'left',
} as const;

function SidebarFooter({ catalog, theme, onToggleTheme }: { catalog: Catalog | null; theme: 'dark' | 'light'; onToggleTheme: () => void }) {
  const repo = catalog?.index.marketplace.repo ?? null;
  const repoUrl = githubRepoUrl(repo);
  const commit = catalog?.index.commit ?? null;
  const commitUrl = githubCommitUrl(repo, commit);
  const themeLabel = theme === 'dark' ? t('theme.toLight') : t('theme.toDark');
  const ThemeIcon = theme === 'dark' ? Icon.Sun : Icon.Moon;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <button type="button" className="cat-row-hover" style={footerRowStyle} onClick={onToggleTheme} aria-label={themeLabel}>
        <ThemeIcon size={16} aria-hidden="true" />
        <span>{themeLabel}</span>
      </button>
      {repoUrl ? (
        <a className="cat-row-hover" style={footerRowStyle} href={repoUrl} target="_blank" rel="noopener noreferrer">
          <Icon.Github size={16} aria-hidden="true" />
          <span style={{ flex: 1 }}>{t('footer.source')}</span>
          <Icon.ExternalLink size={13} aria-hidden="true" style={{ color: 'var(--text-muted)' }} />
        </a>
      ) : null}
      {commit ? (
        <div style={{ ...footerRowStyle, paddingTop: 4, color: 'var(--text-muted)', fontSize: 12 }}>
          <Icon.GitCommit size={16} aria-hidden="true" />
          {commitUrl ? (
            <MonoLink href={commitUrl}>{t('footer.commit', { commit: shortSha(commit) })}</MonoLink>
          ) : (
            <span className="mono">{t('footer.commit', { commit: shortSha(commit) })}</span>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function Layout({ route, catalog, children }: { route: Route; catalog: Catalog | null; children: ReactNode }) {
  const [theme, toggleTheme] = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  useSearchShortcut();
  const crumbs = useCrumbs(route, catalog);
  const section = route.segments[0] ?? '';
  const index = catalog?.index ?? null;

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const closeDrawerAndRefocus = useCallback(() => {
    setDrawerOpen(false);
    document.getElementById(MENU_BUTTON_ID)?.querySelector('button')?.focus();
  }, []);

  // Close the drawer when the route changes; Escape closes it too.
  useEffect(() => setDrawerOpen(false), [route.path]);
  useEffect(() => {
    if (!drawerOpen) return;
    const firstLink = document.querySelector<HTMLElement>(`#${SIDEBAR_ID} nav a`);
    firstLink?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeDrawerAndRefocus();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen, closeDrawerAndRefocus]);

  const groups: NavGroup[] = useMemo(() => {
    const plugins = [...(index?.plugins ?? [])].sort((a, b) => a.name.localeCompare(b.name));
    const result: NavGroup[] = [
      {
        section: t('nav.sectionCatalog'),
        items: [
          { key: 'home', label: t('nav.home'), icon: 'Home', href: routes.home() },
          { key: 'search', label: t('nav.search'), icon: 'Search', href: routes.search() },
          { key: 'whats-new', label: t('nav.whatsNew'), icon: 'History', href: routes.whatsNew() },
          { key: 'getting-started', label: t('nav.gettingStarted'), icon: 'BookOpen', href: routes.gettingStarted() },
        ],
      },
    ];
    if (plugins.length > 0) {
      result.push({
        section: t('nav.sectionPlugins'),
        items: plugins.map((p) => {
          const count = p.components.skills.length + p.components.agents.length;
          return {
            key: `plugin:${p.name}`,
            label: p.name,
            icon: 'Boxes',
            href: routes.plugin(p.name),
            badge: String(count),
            badgeLabel: tn('nav.pluginCount', count),
          };
        }),
      });
    }
    return result;
  }, [index]);

  function skipToContent(event: MouseEvent<HTMLAnchorElement>) {
    // The hash is reserved for routing, so move focus instead of following the link.
    event.preventDefault();
    document.getElementById('main')?.focus();
  }

  return (
    <>
      <a className="skip-link" href={routes.home()} onClick={skipToContent}>
        {t('app.skipToContent')}
      </a>
      <AppFrame
        sidebar={
          <Sidebar
            id={SIDEBAR_ID}
            brand={{ name: index?.marketplace.name || t('app.name'), href: routes.home() }}
            groups={groups}
            activeKey={activeNavKey(route, catalog)}
            navLabel={t('nav.label')}
            open={drawerOpen}
            onClose={closeDrawerAndRefocus}
            closeLabel={t('nav.close')}
            footer={<SidebarFooter catalog={catalog} theme={theme} onToggleTheme={toggleTheme} />}
          />
        }
        overlay={<div className="dd-backdrop" data-open={drawerOpen ? 'true' : 'false'} onClick={closeDrawer} aria-hidden="true" />}
        topbar={
          <Topbar
            crumb={crumbs}
            crumbLabel={t('common.breadcrumb')}
            leading={
              <span id={MENU_BUTTON_ID} className="dd-menu-button">
                <IconBtn
                  icon="Menu"
                  label={drawerOpen ? t('nav.close') : t('nav.open')}
                  expanded={drawerOpen}
                  controls={SIDEBAR_ID}
                  onClick={() => setDrawerOpen((open) => !open)}
                />
              </span>
            }
            search={section === 'search' ? null : <TopbarSearch />}
          />
        }
      >
        {children}
        <footer className="cat-footer">
          <p>{t('footer.note')}</p>
          {index?.generatedAt ? <p>{t('footer.generated', { date: formatDateTime(index.generatedAt) })}</p> : null}
        </footer>
      </AppFrame>
    </>
  );
}
