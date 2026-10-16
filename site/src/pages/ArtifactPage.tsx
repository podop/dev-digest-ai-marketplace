import { useEffect, useState } from 'react';
import { PluginChip } from '../components/Cards';
import { CopyCommand } from '../components/CopyCommand';
import { MarkdownBody } from '../components/Markdown';
import { PageBody, PageHeader } from '../components/PageHeader';
import { Muted } from '../components/States';
import { TypeBadge } from '../components/TypeBadge';
import { t } from '../i18n';
import type { Catalog } from '../lib/data';
import { dirname, githubBlobUrl } from '../lib/format';
import { routes } from '../lib/router';
import type { Artifact } from '../lib/types';
import { usePageTitle } from '../lib/usePageTitle';
import { Button, Card, EmptyState, Icon, SectionLabel, Tabs, tabPanelProps, type TabDef } from '../ui';

const TABS_ID = 'artifact-tabs';
const isTrue = (value: string | undefined) => value?.toLowerCase() === 'true';
const isFalse = (value: string | undefined) => value?.toLowerCase() === 'false';

const hintStyle = { fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-muted)' } as const;

function SkillUsage({ artifact }: { artifact: Artifact }) {
  const command = t('artifact.slashCommand', { plugin: artifact.plugin, name: artifact.name });
  const args = artifact.fields['argument-hint'];
  const manualOnly = isTrue(artifact.fields['disable-model-invocation']);
  const hiddenFromMenu = isFalse(artifact.fields['user-invocable']);
  if (hiddenFromMenu) return <p style={{ fontSize: 13.5, color: 'var(--text-secondary)' }}>{t('artifact.autoOnly')}</p>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <CopyCommand value={command} label={t('artifact.slashLabel')} caption={t('artifact.invokeSkill')} />
      {args ? (
        <p style={hintStyle}>
          {t('artifact.argumentHint')} <code className="mono cat-inline-code">{args}</code>
        </p>
      ) : null}
      <p style={hintStyle}>{manualOnly ? t('artifact.manualOnly') : t('artifact.autoToo')}</p>
    </div>
  );
}

function AgentUsage({ artifact }: { artifact: Artifact }) {
  const subagentType = t('artifact.subagentValue', { plugin: artifact.plugin, name: artifact.name });
  const rows = [
    { label: t('artifact.model'), value: artifact.fields.model ?? t('artifact.modelDefault') },
    { label: t('artifact.tools'), value: artifact.fields.tools ?? t('artifact.toolsAll') },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <CopyCommand value={subagentType} label={t('artifact.subagentLabel')} caption={t('artifact.invokeAgent')} />
      <dl style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map((r) => (
          <div key={r.label} style={{ display: 'grid', gridTemplateColumns: '72px minmax(0, 1fr)', gap: 12, fontSize: 13 }}>
            <dt style={{ color: 'var(--text-muted)' }}>{r.label}</dt>
            <dd style={{ margin: 0, overflowWrap: 'anywhere' }}>{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function ArtifactPage({ catalog, id }: { catalog: Catalog; id: string }) {
  const { index } = catalog;
  const artifact = catalog.artifactsById.get(id);
  usePageTitle(artifact ? artifact.id : t('artifact.notFoundTitle'), index.marketplace.name);
  const [tab, setTab] = useState('body');
  useEffect(() => setTab('body'), [id]);

  if (!artifact) {
    return (
      <PageBody>
        <EmptyState
          icon="SearchX"
          headingLevel={1}
          title={t('artifact.notFoundTitle')}
          body={t('artifact.notFoundBody', { id })}
          action={
            <Button kind="secondary" icon="Search" href={routes.search(id.split(':').pop() ?? id)}>
              {t('plugin.searchInstead')}
            </Button>
          }
        />
      </PageBody>
    );
  }

  const repo = index.marketplace.repo;
  const sourceUrl = githubBlobUrl(repo, artifact.sourcePath);
  const fileBase = dirname(artifact.sourcePath);
  const fields = Object.entries(artifact.fields);
  const bodyLabel = artifact.type === 'skill' ? t('artifact.bodySkill') : t('artifact.bodyAgent');
  const tabs: TabDef[] = [{ key: 'body', label: bodyLabel, icon: 'FileText' }];
  if (artifact.type === 'skill') tabs.push({ key: 'files', label: t('artifact.files'), icon: 'Folder', count: artifact.files.length });
  const current = artifact.type === 'skill' && tab === 'files' ? 'files' : 'body';

  return (
    <>
      <PageHeader
        title={artifact.id}
        mono
        prefix={<TypeBadge kind={artifact.type} />}
        meta={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span>{t('artifact.fromPlugin')}</span>
            <PluginChip name={artifact.plugin} href={routes.plugin(artifact.plugin)} />
          </span>
        }
        description={artifact.description || t('common.noDescription')}
        actions={
          sourceUrl ? (
            <Button kind="secondary" icon="Github" href={sourceUrl} target="_blank">
              {t('common.viewOnGitHub')}
            </Button>
          ) : null
        }
      />
      <Tabs tabs={tabs} value={current} onChange={setTab} pad="0 var(--page-pad-x)" label={t('plugin.docsLabel')} idBase={TABS_ID} />

      <PageBody>
        <div className="cat-detail">
          <div {...tabPanelProps(TABS_ID, current)} style={{ minWidth: 0 }}>
            {current === 'files' ? (
              <Card pad={false}>
                {artifact.files.length === 0 ? (
                  <div style={{ padding: 'var(--card-pad)' }}>
                    <Muted>{t('artifact.noFiles')}</Muted>
                  </div>
                ) : (
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                    {artifact.files.map((file, i) => {
                      const url = githubBlobUrl(repo, `${fileBase}/${file}`);
                      const inner = (
                        <>
                          <Icon.File size={14} aria-hidden="true" style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                          <span className="mono" style={{ fontSize: 13, overflowWrap: 'anywhere', flex: 1 }}>
                            {file}
                          </span>
                          {url ? <Icon.ExternalLink size={13} aria-hidden="true" style={{ color: 'var(--text-muted)', flexShrink: 0 }} /> : null}
                        </>
                      );
                      const rowStyle = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px' } as const;
                      return (
                        <li key={file} style={{ borderTop: i === 0 ? undefined : '1px solid var(--border)' }}>
                          {url ? (
                            <a className="cat-row-hover" href={url} target="_blank" rel="noopener noreferrer" style={rowStyle}>
                              {inner}
                            </a>
                          ) : (
                            <div style={rowStyle}>{inner}</div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
            ) : (
              <Card style={{ padding: '20px 24px' }} className="cat-doc-card">
                <MarkdownBody path={artifact.body} context={{ repo, sourcePath: artifact.sourcePath }} emptyText={t('artifact.noBody')} />
              </Card>
            )}
          </div>

          <aside className="cat-aside">
            <Card as="section" labelledBy="usage-title">
              <SectionLabel icon="Terminal" as="h2" id="usage-title">
                {t('artifact.usage')}
              </SectionLabel>
              {artifact.type === 'skill' ? <SkillUsage artifact={artifact} /> : <AgentUsage artifact={artifact} />}
            </Card>

            <Card as="section" labelledBy="fields-title" pad={false}>
              <div style={{ padding: 'var(--card-pad) var(--card-pad) 0' }}>
                <SectionLabel icon="Code" as="h2" id="fields-title">
                  {t('artifact.fields')}
                </SectionLabel>
              </div>
              {fields.length === 0 ? (
                <div style={{ padding: '0 var(--card-pad) var(--card-pad)' }}>
                  <Muted>{t('artifact.noFields')}</Muted>
                </div>
              ) : (
                <table className="cat-fields">
                  <tbody>
                    {fields.map(([key, value]) => (
                      <tr key={key}>
                        <th scope="row" className="mono">
                          {key}
                        </th>
                        <td>{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {sourceUrl ? (
                <div style={{ padding: '12px var(--card-pad) var(--card-pad)' }}>
                  <Button kind="ghost" size="sm" icon="ExternalLink" href={sourceUrl} target="_blank" full>
                    {t('common.viewSource')}
                  </Button>
                </div>
              ) : null}
            </Card>
          </aside>
        </div>
      </PageBody>
    </>
  );
}
