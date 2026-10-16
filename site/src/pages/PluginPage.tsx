import { useEffect, useState, type ReactNode } from 'react';
import { PluginChip, VersionChip } from '../components/Cards';
import { CopyButton, CopyCommand } from '../components/CopyCommand';
import { MarkdownBody } from '../components/Markdown';
import { MetaItem, PageBody, PageHeader } from '../components/PageHeader';
import { Muted } from '../components/States';
import { TypeBadge } from '../components/TypeBadge';
import { t, tn } from '../i18n';
import type { Catalog } from '../lib/data';
import { formatBytes, githubTreeUrl } from '../lib/format';
import { routes } from '../lib/router';
import type { Artifact, Plugin } from '../lib/types';
import { usePageTitle } from '../lib/usePageTitle';
import { Badge, Button, Card, EmptyState, Icon, SectionLabel, Tabs, tabPanelProps, type IconName, type TabDef } from '../ui';

const TABS_ID = 'plugin-tabs';

function ComponentList({ ids, catalog, empty }: { ids: string[]; catalog: Catalog; empty: string }) {
  const items = ids.map((id) => catalog.artifactsById.get(id)).filter((a): a is Artifact => Boolean(a));
  if (items.length === 0) return <Muted>{empty}</Muted>;
  return (
    <ul style={{ listStyle: 'none', margin: '0 calc(-1 * var(--card-pad))', padding: 0 }}>
      {items.map((a) => (
        <li key={a.id} className="cat-row" style={{ padding: '10px var(--card-pad)', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, minWidth: 0 }}>
            <TypeBadge kind={a.type} />
            <a href={routes.artifact(a.id)} className="cat-link-plain mono" style={{ fontSize: 13.5, fontWeight: 600, overflowWrap: 'anywhere' }}>
              {a.name}
            </a>
          </div>
          {a.description ? (
            <p className="cat-clamp-3" style={{ marginTop: 6, fontSize: 13, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
              {a.description}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** Label / value rows used in the Details card. */
function DetailRows({ rows }: { rows: { label: string; value: ReactNode; mono?: boolean }[] }) {
  return (
    <dl style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map((r) => (
        <div key={r.label} style={{ display: 'grid', gridTemplateColumns: 'minmax(96px, 40%) minmax(0, 1fr)', gap: 12, fontSize: 13 }}>
          <dt style={{ color: 'var(--text-muted)' }}>{r.label}</dt>
          <dd className={r.mono ? 'mono' : undefined} style={{ margin: 0, color: 'var(--text-primary)', fontSize: r.mono ? 12.5 : 13, overflowWrap: 'anywhere' }}>
            {r.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function CountTile({ icon, label }: { icon: IconName; label: string }) {
  const I = Icon[icon];
  return (
    <Card style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
      <I size={15} aria-hidden="true" style={{ color: 'var(--text-muted)' }} />
      <span className="tnum" style={{ fontSize: 13.5, fontWeight: 600 }}>
        {label}
      </span>
    </Card>
  );
}

function DependencyRows({ plugin, catalog }: { plugin: Plugin; catalog: Catalog }) {
  if (plugin.dependencies.length === 0) return <Muted>{t('plugin.noDependencies')}</Muted>;
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {plugin.dependencies.map((d) => {
        const known = catalog.pluginsByName.has(d.name);
        return (
          <li key={d.name} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            <PluginChip name={d.name} href={known ? routes.plugin(d.name) : undefined} />
            <Badge mono style={{ fontWeight: 500, padding: '1px 8px' }}>
              {d.version ?? t('plugin.anyVersion')}
            </Badge>
            {!known ? <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('plugin.depExternal')}</span> : null}
          </li>
        );
      })}
    </ul>
  );
}

function DependentRows({ plugin }: { plugin: Plugin }) {
  if (plugin.dependents.length === 0) return <Muted>{t('plugin.noDependents')}</Muted>;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {plugin.dependents.map((d) => (
        <PluginChip key={d} name={d} href={routes.plugin(d)} />
      ))}
    </div>
  );
}

export function PluginPage({ catalog, name }: { catalog: Catalog; name: string }) {
  const { index } = catalog;
  const plugin = catalog.pluginsByName.get(name);
  usePageTitle(plugin ? plugin.name : t('plugin.notFoundTitle'), index.marketplace.name);
  const [tab, setTab] = useState('overview');
  useEffect(() => setTab('overview'), [name]);

  if (!plugin) {
    return (
      <PageBody>
        <EmptyState
          icon="SearchX"
          headingLevel={1}
          title={t('plugin.notFoundTitle')}
          body={t('plugin.notFoundBody', { name })}
          action={
            <Button kind="secondary" icon="Search" href={routes.search(name)}>
              {t('plugin.searchInstead')}
            </Button>
          }
        />
      </PageBody>
    );
  }

  const repo = index.marketplace.repo;
  const marketplace = index.marketplace.name;
  const sourceUrl = githubTreeUrl(repo, plugin.sourcePath);
  const docContext = (file: string) => ({ repo, sourcePath: `${plugin.sourcePath}/${file}` });
  const { skills, agents, hooks, evals } = plugin.components;

  const tabs: TabDef[] = [
    { key: 'overview', label: t('plugin.tabOverview'), icon: 'FileText' },
    { key: 'components', label: t('plugin.components'), icon: 'Layers', count: skills.length + agents.length },
    { key: 'changelog', label: t('plugin.tabChangelog'), icon: 'History' },
    { key: 'dependencies', label: t('plugin.dependencies'), icon: 'Workflow', count: plugin.dependencies.length },
  ];
  if (plugin.compatibilityDoc) tabs.push({ key: 'compatibility', label: t('plugin.tabCompatibility'), icon: 'ShieldCheck' });
  const current = tabs.some((x) => typeof x !== 'string' && x.key === tab) ? tab : 'overview';

  let panel: ReactNode;
  switch (current) {
    case 'components':
      panel = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="cat-grid-stats">
            <CountTile icon="Sparkles" label={tn('count.skills', skills.length)} />
            <CountTile icon="Cpu" label={tn('count.agents', agents.length)} />
            <CountTile icon="Webhook" label={tn('count.hooks', hooks)} />
            <CountTile icon="FlaskConical" label={tn('count.evals', evals)} />
          </div>
          <Card as="section" labelledBy="plugin-skills-title">
            <SectionLabel icon="Sparkles" as="h2" id="plugin-skills-title">
              {t('plugin.skills')}
            </SectionLabel>
            <ComponentList ids={skills} catalog={catalog} empty={t('plugin.noSkills')} />
          </Card>
          <Card as="section" labelledBy="plugin-agents-title">
            <SectionLabel icon="Cpu" as="h2" id="plugin-agents-title">
              {t('plugin.agents')}
            </SectionLabel>
            <ComponentList ids={agents} catalog={catalog} empty={t('plugin.noAgents')} />
          </Card>
        </div>
      );
      break;
    case 'changelog':
      panel = (
        <Card style={{ padding: '20px 24px' }} className="cat-doc-card">
          <MarkdownBody path={plugin.changelog} context={docContext('CHANGELOG.md')} emptyText={t('plugin.noChangelog')} />
        </Card>
      );
      break;
    case 'dependencies':
      panel = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card as="section" labelledBy="plugin-deps-title">
            <SectionLabel icon="Workflow" as="h2" id="plugin-deps-title">
              {t('plugin.dependencies')}
            </SectionLabel>
            <DependencyRows plugin={plugin} catalog={catalog} />
          </Card>
          <Card as="section" labelledBy="plugin-dependents-title">
            <SectionLabel icon="CornerDownRight" as="h2" id="plugin-dependents-title">
              {t('plugin.dependents')}
            </SectionLabel>
            <DependentRows plugin={plugin} />
          </Card>
        </div>
      );
      break;
    case 'compatibility':
      panel = (
        <Card style={{ padding: '20px 24px' }} className="cat-doc-card">
          <MarkdownBody path={plugin.compatibilityDoc} context={docContext('COMPATIBILITY.md')} emptyText={t('common.none')} />
        </Card>
      );
      break;
    default:
      panel = (
        <Card style={{ padding: '20px 24px' }} className="cat-doc-card">
          <MarkdownBody path={plugin.readme} context={docContext('README.md')} emptyText={t('plugin.noReadme')} />
        </Card>
      );
  }

  const details: { label: string; value: ReactNode; mono?: boolean }[] = [
    { label: t('plugin.version'), value: plugin.version ?? t('common.notSpecified'), mono: Boolean(plugin.version) },
    { label: t('plugin.owner'), value: plugin.owner || t('common.notSpecified') },
    { label: t('plugin.license'), value: plugin.license ?? t('common.notSpecified') },
    { label: t('plugin.compatibility'), value: plugin.compatibility ?? t('common.notSpecified') },
  ];
  if (plugin.category) details.push({ label: t('plugin.category'), value: plugin.category });

  return (
    <>
      <PageHeader
        title={plugin.name}
        prefix={<TypeBadge kind="plugin" />}
        suffix={plugin.version ? <VersionChip version={plugin.version} /> : null}
        meta={
          <>
            <MetaItem icon="User" label={t('plugin.owner')}>
              {plugin.owner || t('common.notSpecified')}
            </MetaItem>
            {plugin.license ? (
              <MetaItem icon="Scale" label={t('plugin.license')}>
                {plugin.license}
              </MetaItem>
            ) : null}
            {plugin.compatibility ? (
              <MetaItem icon="ShieldCheck" mono label={t('plugin.compatibility')}>
                {plugin.compatibility}
              </MetaItem>
            ) : null}
            {plugin.category ? (
              <Badge color="var(--accent-text)" bg="var(--accent-bg)" icon="Tag" title={t('plugin.category')}>
                {plugin.category}
              </Badge>
            ) : null}
          </>
        }
        description={
          <>
            {plugin.description || t('common.noDescription')}
            {plugin.keywords.length > 0 ? (
              <span aria-label={t('plugin.keywords')} role="list" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                {plugin.keywords.map((k) => (
                  <a key={k} role="listitem" href={routes.search(k)} className="mono cat-chip-link" style={{ fontSize: 12, padding: '1px 8px', borderRadius: 5, border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                    {k}
                  </a>
                ))}
              </span>
            ) : null}
          </>
        }
        actions={
          <>
            <CopyButton value={plugin.install} label={t('plugin.installSlashLabel')}>
              {t('plugin.copyInstall')}
            </CopyButton>
            {sourceUrl ? (
              <Button kind="secondary" icon="Github" href={sourceUrl} target="_blank">
                {t('common.viewOnGitHub')}
              </Button>
            ) : null}
          </>
        }
      />
      <Tabs tabs={tabs} value={current} onChange={setTab} pad="0 var(--page-pad-x)" label={t('plugin.docsLabel')} idBase={TABS_ID} />

      <PageBody>
        <div className="cat-detail">
          <div {...tabPanelProps(TABS_ID, current)} style={{ minWidth: 0 }}>
            {panel}
          </div>

          <aside className="cat-aside">
            <Card as="section" labelledBy="install-title">
              <SectionLabel icon="Terminal" as="h2" id="install-title">
                {t('plugin.install')}
              </SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <CopyCommand value={plugin.install} label={t('plugin.installSlashLabel')} caption={t('plugin.installSlash')} />
                <CopyCommand
                  value={t('plugin.cliCommand', { name: plugin.name, marketplace })}
                  label={t('plugin.installCliLabel')}
                  caption={t('plugin.installCli')}
                />
                <p style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {t('plugin.installHint')}{' '}
                  <a className="cat-link" href={routes.gettingStarted()}>
                    {t('nav.gettingStarted')}
                  </a>
                </p>
              </div>
            </Card>

            <Card as="section" labelledBy="details-title">
              <SectionLabel icon="Info" as="h2" id="details-title">
                {t('plugin.details')}
              </SectionLabel>
              <DetailRows rows={details} />
              {sourceUrl ? (
                <div style={{ marginTop: 14 }}>
                  <Button kind="ghost" size="sm" icon="ExternalLink" href={sourceUrl} target="_blank" full>
                    {t('common.viewSource')}
                  </Button>
                </div>
              ) : null}
            </Card>

            <Card as="section" labelledBy="deps-title">
              <SectionLabel icon="Workflow" as="h2" id="deps-title">
                {t('plugin.dependencies')}
              </SectionLabel>
              <DependencyRows plugin={plugin} catalog={catalog} />
              <div style={{ marginTop: 16 }}>
                <SectionLabel icon="CornerDownRight" as="h3">
                  {t('plugin.dependents')}
                </SectionLabel>
                <DependentRows plugin={plugin} />
              </div>
            </Card>

            <Card as="section" labelledBy="context-title">
              <SectionLabel icon="Gauge" as="h2" id="context-title">
                {t('plugin.contextSize')}
              </SectionLabel>
              <div className="mono tnum" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}>
                {formatBytes(plugin.contextBytes)}
              </div>
              <p style={{ marginTop: 8, fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-muted)' }}>{t('plugin.contextHint')}</p>
            </Card>
          </aside>
        </div>
      </PageBody>
    </>
  );
}
