import { Breadcrumbs } from '../components/Breadcrumbs';
import { CopyCommand } from '../components/CopyCommand';
import { MarkdownBody } from '../components/Markdown';
import { EmptyState } from '../components/States';
import { TypeBadge } from '../components/TypeBadge';
import { t } from '../i18n';
import type { Catalog } from '../lib/data';
import { dirname, githubBlobUrl } from '../lib/format';
import { routes } from '../lib/router';
import type { Artifact } from '../lib/types';
import { usePageTitle } from '../lib/usePageTitle';

const isTrue = (value: string | undefined) => value?.toLowerCase() === 'true';
const isFalse = (value: string | undefined) => value?.toLowerCase() === 'false';

function SkillUsage({ artifact }: { artifact: Artifact }) {
  const command = t('artifact.slashCommand', { plugin: artifact.plugin, name: artifact.name });
  const args = artifact.fields['argument-hint'];
  const manualOnly = isTrue(artifact.fields['disable-model-invocation']);
  const hiddenFromMenu = isFalse(artifact.fields['user-invocable']);
  return (
    <>
      {hiddenFromMenu ? (
        <p>{t('artifact.autoOnly')}</p>
      ) : (
        <>
          <CopyCommand value={command} label={t('artifact.slashLabel')} caption={t('artifact.invokeSkill')} />
          {args ? (
            <p className="hint">
              {t('artifact.argumentHint')} <code>{args}</code>
            </p>
          ) : null}
          <p className="hint">{manualOnly ? t('artifact.manualOnly') : t('artifact.autoToo')}</p>
        </>
      )}
    </>
  );
}

function AgentUsage({ artifact }: { artifact: Artifact }) {
  const subagentType = t('artifact.subagentValue', { plugin: artifact.plugin, name: artifact.name });
  return (
    <>
      <CopyCommand value={subagentType} label={t('artifact.subagentLabel')} caption={t('artifact.invokeAgent')} />
      <dl className="meta">
        <div className="meta-row">
          <dt>{t('artifact.model')}</dt>
          <dd>{artifact.fields.model ?? t('artifact.modelDefault')}</dd>
        </div>
        <div className="meta-row">
          <dt>{t('artifact.tools')}</dt>
          <dd>{artifact.fields.tools ?? t('artifact.toolsAll')}</dd>
        </div>
      </dl>
    </>
  );
}

export function ArtifactPage({ catalog, id }: { catalog: Catalog; id: string }) {
  const { index } = catalog;
  const artifact = catalog.artifactsById.get(id);
  usePageTitle(artifact ? artifact.id : t('artifact.notFoundTitle'), index.marketplace.name);

  if (!artifact) {
    return (
      <EmptyState title={t('artifact.notFoundTitle')} body={t('artifact.notFoundBody', { id })}>
        <a className="button" href={routes.search(id.split(':').pop() ?? id)}>
          {t('plugin.searchInstead')}
        </a>
      </EmptyState>
    );
  }

  const repo = index.marketplace.repo;
  const sourceUrl = githubBlobUrl(repo, artifact.sourcePath);
  const fileBase = dirname(artifact.sourcePath);
  const fields = Object.entries(artifact.fields);

  return (
    <article className="detail">
      <Breadcrumbs
        items={[
          { label: t('nav.home'), href: routes.home() },
          { label: artifact.plugin, href: routes.plugin(artifact.plugin) },
          { label: artifact.name },
        ]}
      />
      <header className="detail-header">
        <div className="detail-title-row">
          <TypeBadge kind={artifact.type} />
          <h1 className="page-title page-title-mono">{artifact.id}</h1>
        </div>
        <p className="detail-plugin">
          {t('artifact.fromPlugin')} <a href={routes.plugin(artifact.plugin)}>{artifact.plugin}</a>
        </p>
        <p className="detail-lead">{artifact.description || t('common.noDescription')}</p>
      </header>

      <div className="detail-layout">
        <div className="detail-main">
          <section className="panel" aria-labelledby="usage-title">
            <h2 id="usage-title" className="panel-title">
              {t('artifact.usage')}
            </h2>
            {artifact.type === 'skill' ? <SkillUsage artifact={artifact} /> : <AgentUsage artifact={artifact} />}
          </section>
          <section className="panel" aria-labelledby="body-title">
            <h2 id="body-title" className="panel-title">
              {artifact.type === 'skill' ? t('artifact.bodySkill') : t('artifact.bodyAgent')}
            </h2>
            <MarkdownBody
              path={artifact.body}
              context={{ repo, sourcePath: artifact.sourcePath }}
              emptyText={t('artifact.noBody')}
            />
          </section>
        </div>

        <aside className="detail-side">
          <section className="panel" aria-labelledby="fields-title">
            <h2 id="fields-title" className="panel-title">
              {t('artifact.fields')}
            </h2>
            {fields.length === 0 ? (
              <p className="muted">{t('artifact.noFields')}</p>
            ) : (
              <dl className="meta meta-stacked">
                {fields.map(([key, value]) => (
                  <div key={key} className="meta-row">
                    <dt>
                      <code>{key}</code>
                    </dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            )}
            {sourceUrl ? (
              <a className="button button-block" href={sourceUrl} target="_blank" rel="noopener noreferrer">
                {t('common.viewSource')}
              </a>
            ) : null}
          </section>

          {artifact.type === 'skill' ? (
            <section className="panel" aria-labelledby="files-title">
              <h2 id="files-title" className="panel-title">
                {t('artifact.files')}
              </h2>
              {artifact.files.length === 0 ? (
                <p className="muted">{t('artifact.noFiles')}</p>
              ) : (
                <ul className="file-list">
                  {artifact.files.map((file) => {
                    const url = githubBlobUrl(repo, `${fileBase}/${file}`);
                    return (
                      <li key={file}>
                        {url ? (
                          <a href={url} target="_blank" rel="noopener noreferrer">
                            <code>{file}</code>
                          </a>
                        ) : (
                          <code>{file}</code>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ) : null}
        </aside>
      </div>
    </article>
  );
}
