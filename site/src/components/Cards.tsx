import type { ReactNode } from 'react';
import { t, tn } from '../i18n';
import { routes } from '../lib/router';
import type { SearchHit } from '../lib/search';
import type { Plugin } from '../lib/types';
import { Badge, Card, Icon, SectionLabel, type IconName } from '../ui';
import { Highlight } from './Highlight';
import { TypeBadge } from './TypeBadge';

/** Small icon + text count used on cards. */
export function Count({ icon, children }: { icon: IconName; children: ReactNode }) {
  const I = Icon[icon];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text-secondary)' }}>
      <I size={13} aria-hidden="true" style={{ color: 'var(--text-muted)' }} />
      {children}
    </span>
  );
}

/** Mono version chip ("v1.2.0"). */
export function VersionChip({ version }: { version: string }) {
  return (
    <Badge mono color="var(--text-secondary)" bg="var(--bg-hover)" style={{ fontWeight: 500, padding: '1px 8px' }}>
      {t('plugin.versionValue', { version })}
    </Badge>
  );
}

/** Mono chip that links to a plugin (dependencies, dependents). */
export function PluginChip({ name, href, suffix }: { name: string; href?: string; suffix?: string }) {
  const style = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '2px 8px',
    borderRadius: 5,
    fontSize: 12,
    border: '1px solid var(--border)',
    background: 'var(--bg-surface)',
    color: 'var(--text-secondary)',
    maxWidth: '100%',
  } as const;
  const inner = (
    <>
      <Icon.Boxes size={12} aria-hidden="true" style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
      {suffix ? <span style={{ color: 'var(--text-muted)' }}>{suffix}</span> : null}
    </>
  );
  return href ? (
    <a href={href} className="mono cat-raise cat-chip-link" style={style}>
      {inner}
    </a>
  ) : (
    <span className="mono" style={style}>
      {inner}
    </span>
  );
}

export function PluginCard({ plugin, known }: { plugin: Plugin; known: (name: string) => boolean }) {
  const { skills, agents } = plugin.components;
  const titleId = `plugin-card-${plugin.name}`;
  return (
    <Card as="article" hover className="cat-link-card" labelledBy={titleId} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <span
          aria-hidden="true"
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            display: 'grid',
            placeItems: 'center',
            background: 'var(--accent-bg)',
            color: 'var(--accent-text)',
            flexShrink: 0,
          }}
        >
          <Icon.Boxes size={15} />
        </span>
        <h3 id={titleId} style={{ fontSize: 15, fontWeight: 600, minWidth: 0, flex: 1, overflowWrap: 'anywhere' }}>
          <a className="cat-stretch" href={routes.plugin(plugin.name)}>
            {plugin.name}
          </a>
        </h3>
        {plugin.version ? <VersionChip version={plugin.version} /> : null}
      </div>
      <p className="cat-clamp-3" style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
        {plugin.description || t('common.noDescription')}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginTop: 'auto' }}>
        <Count icon="Sparkles">{tn('count.skills', skills.length)}</Count>
        <Count icon="Cpu">{tn('count.agents', agents.length)}</Count>
        {plugin.components.evals > 0 ? <Count icon="FlaskConical">{tn('count.evals', plugin.components.evals)}</Count> : null}
      </div>
      {plugin.dependencies.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 2 }}>{t('home.dependsOn')}</span>
          {plugin.dependencies.map((d) => (
            <PluginChip key={d.name} name={d.name} href={known(d.name) ? routes.plugin(d.name) : undefined} />
          ))}
        </div>
      ) : null}
    </Card>
  );
}

export function ResultCard({ hit }: { hit: SearchHit }) {
  const href = hit.kind === 'plugin' ? routes.plugin(hit.id) : routes.artifact(hit.id);
  const titleId = `result-${hit.key}`;
  return (
    <Card as="article" hover className="cat-link-card" labelledBy={titleId} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, minWidth: 0 }}>
        <TypeBadge kind={hit.kind} />
        <h3 id={titleId} className="mono" style={{ fontSize: 14, fontWeight: 600, minWidth: 0, overflowWrap: 'anywhere' }}>
          <a className="cat-stretch" href={href}>
            <Highlight text={hit.name} terms={hit.terms} />
          </a>
        </h3>
      </div>
      {hit.kind !== 'plugin' ? (
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span>{t('search.inPlugin')}</span>
          <PluginChip name={hit.plugin} href={routes.plugin(hit.plugin)} />
        </p>
      ) : null}
      <p className="cat-clamp-3" style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
        {hit.description ? <Highlight text={hit.description} terms={hit.terms} /> : t('common.noDescription')}
      </p>
    </Card>
  );
}

/** Small totals card (SectionLabel + big number); links to a filtered search when `href` is set. */
export function StatCard({ icon, label, value, href }: { icon: IconName; label: string; value: number; href: string | null }) {
  return (
    <Card hover={Boolean(href)} className={href ? 'cat-link-card' : undefined} style={{ padding: '14px 16px' }}>
      <SectionLabel icon={icon}>
        {href ? (
          <a className="cat-stretch" href={href}>
            {label}
          </a>
        ) : (
          label
        )}
      </SectionLabel>
      <div className="tnum" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1, marginTop: -4 }}>
        {value}
      </div>
    </Card>
  );
}
