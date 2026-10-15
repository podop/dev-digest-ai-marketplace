import { t, tn } from '../i18n';
import { routes } from '../lib/router';
import type { SearchHit } from '../lib/search';
import type { Plugin } from '../lib/types';
import { Highlight } from './Highlight';
import { TypeBadge } from './TypeBadge';

export function PluginCard({ plugin }: { plugin: Plugin }) {
  const { skills, agents } = plugin.components;
  return (
    <article className="card plugin-card">
      <header className="card-head">
        <h3 className="card-title">
          <a className="card-link" href={routes.plugin(plugin.name)}>
            {plugin.name}
          </a>
        </h3>
        {plugin.version ? <span className="version">{t('plugin.versionValue', { version: plugin.version })}</span> : null}
      </header>
      <p className="card-desc">{plugin.description || t('common.noDescription')}</p>
      <footer className="card-meta">
        <span>{tn('count.skills', skills.length)}</span>
        <span>{tn('count.agents', agents.length)}</span>
        {plugin.owner ? <span>{plugin.owner}</span> : null}
      </footer>
      {plugin.keywords.length > 0 ? (
        <ul className="chips" aria-label={t('plugin.keywords')}>
          {plugin.keywords.slice(0, 5).map((k) => (
            <li key={k} className="chip">
              {k}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

export function ResultCard({ hit }: { hit: SearchHit }) {
  const href = hit.kind === 'plugin' ? routes.plugin(hit.id) : routes.artifact(hit.id);
  return (
    <article className="card result-card">
      <header className="card-head">
        <TypeBadge kind={hit.kind} />
        <h3 className="card-title">
          <a className="card-link" href={href}>
            <Highlight text={hit.name} terms={hit.terms} />
          </a>
        </h3>
      </header>
      {hit.kind !== 'plugin' ? (
        <p className="card-plugin">
          {t('search.inPlugin')} <a href={routes.plugin(hit.plugin)}>{hit.plugin}</a>
        </p>
      ) : null}
      <p className="card-desc">
        {hit.description ? <Highlight text={hit.description} terms={hit.terms} /> : t('common.noDescription')}
      </p>
    </article>
  );
}
