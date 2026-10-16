import type { ReactNode } from 'react';
import { Icon, type IconName } from '../ui';

/** DevDigest-style page header: title row, meta row (mono chips / badges), lead text, actions on the right. */
export function PageHeader({
  title,
  mono,
  prefix,
  suffix,
  meta,
  description,
  actions,
  bordered = false,
}: {
  title: string;
  mono?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
  meta?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Draw a bottom border (pages without tabs under the header). */
  bordered?: boolean;
}) {
  return (
    <header
      className="cat-page-header"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        gap: 16,
        padding: '22px var(--page-pad-x) 20px',
        borderBottom: bordered ? '1px solid var(--border)' : undefined,
      }}
    >
      <div style={{ flex: '1 1 420px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, minWidth: 0 }}>
          {prefix}
          <h1
            className={mono ? 'mono' : undefined}
            style={{
              fontSize: mono ? 20 : 22,
              fontWeight: 700,
              letterSpacing: mono ? '-0.01em' : '-0.02em',
              lineHeight: 1.25,
              color: 'var(--text-primary)',
              minWidth: 0,
              overflowWrap: 'anywhere',
            }}
          >
            {title}
          </h1>
          {suffix}
        </div>
        {meta ? (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '8px 16px',
              marginTop: 10,
              fontSize: 13,
              color: 'var(--text-secondary)',
            }}
          >
            {meta}
          </div>
        ) : null}
        {description ? (
          <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.55, color: 'var(--text-secondary)', maxWidth: 820 }}>
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="cat-page-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {actions}
        </div>
      ) : null}
    </header>
  );
}

/** One item of the header meta row: icon + text (optionally mono). */
export function MetaItem({ icon, children, mono, label }: { icon: IconName; children: ReactNode; mono?: boolean; label?: string }) {
  const I = Icon[icon];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }} title={label}>
      <I size={14} aria-hidden="true" style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
      {label ? <span className="visually-hidden">{label}</span> : null}
      <span className={mono ? 'mono' : undefined} style={{ fontSize: mono ? 12.5 : 13, overflowWrap: 'anywhere' }}>
        {children}
      </span>
    </span>
  );
}

/** Page content wrapper with the shared horizontal padding. */
export function PageBody({ children, narrow }: { children: ReactNode; narrow?: boolean }) {
  return (
    <div
      className="cat-page-body"
      style={{ padding: '24px var(--page-pad-x) 32px', maxWidth: narrow ? 920 : 1360, minWidth: 0 }}
    >
      {children}
    </div>
  );
}
