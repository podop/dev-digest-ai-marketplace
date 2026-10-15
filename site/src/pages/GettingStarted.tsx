import { CopyCommand } from '../components/CopyCommand';
import { t } from '../i18n';
import type { Catalog } from '../lib/data';
import { routes } from '../lib/router';
import { usePageTitle } from '../lib/usePageTitle';

export function GettingStarted({ catalog }: { catalog: Catalog }) {
  const { index } = catalog;
  usePageTitle(t('gs.title'), index.marketplace.name);
  const marketplace = index.marketplace.name || t('gs.placeholderMarketplace');
  const repo = index.marketplace.repo || t('gs.placeholderRepo');
  const examplePlugin = [...index.plugins].sort((a, b) => a.name.localeCompare(b.name))[0];
  const plugin = examplePlugin?.name ?? t('gs.placeholderPlugin');
  const vars = { marketplace, repo, plugin };

  return (
    <article className="prose-page">
      <h1 className="page-title">{t('gs.title')}</h1>
      <p className="page-lead">{t('gs.lead')}</p>

      <section className="panel" aria-labelledby="gs-add">
        <h2 id="gs-add" className="panel-title">
          {t('gs.addTitle')}
        </h2>
        <p>{t('gs.addBody', vars)}</p>
        <CopyCommand value={t('gs.addCommand', vars)} label={t('gs.addTitle')} />
      </section>

      <section className="panel" aria-labelledby="gs-install">
        <h2 id="gs-install" className="panel-title">
          {t('gs.installTitle')}
        </h2>
        <p>{t('gs.installBody', vars)}</p>
        <CopyCommand value={t('gs.installCommand', vars)} label={t('gs.installTitle')} caption={t('plugin.installSlash')} />
        <CopyCommand value={t('plugin.cliCommand', { name: plugin, marketplace })} label={t('plugin.installCliLabel')} caption={t('plugin.installCli')} />
        <p className="hint">
          {t('gs.installBrowse', vars)} <a href={routes.search()}>{t('nav.search')}</a>
        </p>
      </section>

      <section className="panel" aria-labelledby="gs-update">
        <h2 id="gs-update" className="panel-title">
          {t('gs.updateTitle')}
        </h2>
        <p>{t('gs.updateBody', vars)}</p>
        <CopyCommand value={t('gs.updateCommand', vars)} label={t('gs.updateTitle')} />
        <CopyCommand value={t('gs.updatePluginCommand', vars)} label={t('gs.updatePluginLabel')} caption={t('gs.updatePluginCaption')} />
      </section>

      <section className="panel" aria-labelledby="gs-auto">
        <h2 id="gs-auto" className="panel-title">
          {t('gs.autoTitle')}
        </h2>
        <p>{t('gs.autoBody', vars)}</p>
        <p>{t('gs.teamBody', vars)}</p>
        <CopyCommand value={t('gs.teamSettings', vars)} label={t('gs.teamLabel')} caption={t('gs.teamCaption')} multiline />
      </section>

      <section className="panel" aria-labelledby="gs-stable">
        <h2 id="gs-stable" className="panel-title">
          {t('gs.stableTitle')}
        </h2>
        <p>{t('gs.stableBody', vars)}</p>
        <CopyCommand value={t('gs.stableCommand', vars)} label={t('gs.stableTitle')} caption={t('gs.stableAddCaption')} />
        <CopyCommand value={t('gs.stableInstallCommand', vars)} label={t('gs.stableInstallLabel')} caption={t('gs.stableInstallCaption')} />
        <p className="hint">
          {t('gs.stableHint', vars)} <a href={routes.whatsNew()}>{t('nav.whatsNew')}</a>
        </p>
      </section>

      <section className="panel" aria-labelledby="gs-rollback">
        <h2 id="gs-rollback" className="panel-title">
          {t('gs.rollbackTitle')}
        </h2>
        <p>{t('gs.rollbackBody', vars)}</p>
        <CopyCommand value={t('gs.rollbackScript', vars)} label={t('gs.rollbackScriptLabel')} caption={t('gs.rollbackScriptCaption')} />
        <CopyCommand value={t('gs.returnScript', vars)} label={t('gs.returnScriptLabel')} caption={t('gs.returnScriptCaption')} />
        <p className="hint">{t('gs.rollbackManual', vars)}</p>
        <CopyCommand value={t('gs.rollbackUninstall', vars)} label={t('gs.rollbackUninstallLabel')} caption={t('gs.rollbackStep1')} />
        <CopyCommand value={t('gs.stableInstallCommand', vars)} label={t('gs.stableInstallLabel')} caption={t('gs.rollbackStep2')} />
      </section>
    </article>
  );
}
