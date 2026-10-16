import type { ReactNode } from 'react';
import { CopyCommand } from '../components/CopyCommand';
import { PageBody, PageHeader } from '../components/PageHeader';
import { t } from '../i18n';
import type { Catalog } from '../lib/data';
import { routes } from '../lib/router';
import { usePageTitle } from '../lib/usePageTitle';
import { Card } from '../ui';

const bodyStyle = { fontSize: 14, lineHeight: 1.6, color: 'var(--text-secondary)' } as const;
const hintStyle = { fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-muted)' } as const;

/** Numbered step card (number tile + title + content). */
function Step({ n, id, title, children }: { n: number; id: string; title: string; children: ReactNode }) {
  return (
    <Card as="section" labelledBy={id} className="cat-step">
      <div style={{ display: 'flex', gap: 14, minWidth: 0 }}>
        <span
          className="mono"
          aria-hidden="true"
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            fontSize: 13,
            fontWeight: 600,
            background: 'var(--accent-bg)',
            color: 'var(--accent-text)',
            border: '1px solid var(--border)',
          }}
        >
          {n}
        </span>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 id={id} style={{ fontSize: 15, fontWeight: 600, lineHeight: '28px' }}>
            {title}
          </h2>
          {children}
        </div>
      </div>
    </Card>
  );
}

export function GettingStarted({ catalog }: { catalog: Catalog }) {
  const { index } = catalog;
  usePageTitle(t('gs.title'), index.marketplace.name);
  const marketplace = index.marketplace.name || t('gs.placeholderMarketplace');
  const repo = index.marketplace.repo || t('gs.placeholderRepo');
  const examplePlugin = [...index.plugins].sort((a, b) => a.name.localeCompare(b.name))[0];
  const plugin = examplePlugin?.name ?? t('gs.placeholderPlugin');
  const vars = { marketplace, repo, plugin };

  return (
    <>
      <PageHeader title={t('gs.title')} description={t('gs.lead')} bordered />
      <PageBody narrow>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Step n={1} id="gs-add" title={t('gs.addTitle')}>
            <p style={bodyStyle}>{t('gs.addBody', vars)}</p>
            <CopyCommand value={t('gs.addCommand', vars)} label={t('gs.addTitle')} />
          </Step>

          <Step n={2} id="gs-install" title={t('gs.installTitle')}>
            <p style={bodyStyle}>{t('gs.installBody', vars)}</p>
            <CopyCommand value={t('gs.installCommand', vars)} label={t('gs.installTitle')} caption={t('plugin.installSlash')} />
            <CopyCommand
              value={t('plugin.cliCommand', { name: plugin, marketplace })}
              label={t('plugin.installCliLabel')}
              caption={t('plugin.installCli')}
            />
            <p style={hintStyle}>
              {t('gs.installBrowse', vars)}{' '}
              <a className="cat-link" href={routes.search()}>
                {t('nav.search')}
              </a>
            </p>
          </Step>

          <Step n={3} id="gs-update" title={t('gs.updateTitle')}>
            <p style={bodyStyle}>{t('gs.updateBody', vars)}</p>
            <CopyCommand value={t('gs.updateCommand', vars)} label={t('gs.updateTitle')} />
            <CopyCommand
              value={t('gs.updatePluginCommand', vars)}
              label={t('gs.updatePluginLabel')}
              caption={t('gs.updatePluginCaption')}
            />
          </Step>

          <Step n={4} id="gs-auto" title={t('gs.autoTitle')}>
            <p style={bodyStyle}>{t('gs.autoBody', vars)}</p>
            <p style={bodyStyle}>{t('gs.teamBody', vars)}</p>
            <CopyCommand value={t('gs.teamSettings', vars)} label={t('gs.teamLabel')} caption={t('gs.teamCaption')} multiline />
          </Step>

          <Step n={5} id="gs-stable" title={t('gs.stableTitle')}>
            <p style={bodyStyle}>{t('gs.stableBody', vars)}</p>
            <CopyCommand value={t('gs.stableCommand', vars)} label={t('gs.stableTitle')} caption={t('gs.stableAddCaption')} />
            <CopyCommand
              value={t('gs.stableInstallCommand', vars)}
              label={t('gs.stableInstallLabel')}
              caption={t('gs.stableInstallCaption')}
            />
            <p style={hintStyle}>
              {t('gs.stableHint', vars)}{' '}
              <a className="cat-link" href={routes.whatsNew()}>
                {t('nav.whatsNew')}
              </a>
            </p>
          </Step>

          <Step n={6} id="gs-rollback" title={t('gs.rollbackTitle')}>
            <p style={bodyStyle}>{t('gs.rollbackBody', vars)}</p>
            <CopyCommand
              value={t('gs.rollbackScript', vars)}
              label={t('gs.rollbackScriptLabel')}
              caption={t('gs.rollbackScriptCaption')}
            />
            <CopyCommand value={t('gs.returnScript', vars)} label={t('gs.returnScriptLabel')} caption={t('gs.returnScriptCaption')} />
            <p style={hintStyle}>{t('gs.rollbackManual', vars)}</p>
            <CopyCommand
              value={t('gs.rollbackUninstall', vars)}
              label={t('gs.rollbackUninstallLabel')}
              caption={t('gs.rollbackStep1')}
            />
            <CopyCommand
              value={t('gs.stableInstallCommand', vars)}
              label={t('gs.stableInstallLabel')}
              caption={t('gs.rollbackStep2')}
            />
          </Step>
        </div>
      </PageBody>
    </>
  );
}
