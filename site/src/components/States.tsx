import type { ReactNode } from 'react';
import { t } from '../i18n';

export function Loading({ label }: { label?: string }) {
  return (
    <div className="state state-loading" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>{label ?? t('common.loading')}</span>
    </div>
  );
}

export function ErrorState({ title, body, detail }: { title: string; body: string; detail?: string }) {
  return (
    <div className="state state-error" role="alert">
      <h2>{title}</h2>
      <p>{body}</p>
      {detail ? <pre className="state-detail">{detail}</pre> : null}
    </div>
  );
}

export function EmptyState({ title, body, children }: { title: string; body?: string; children?: ReactNode }) {
  return (
    <div className="state state-empty">
      <h2>{title}</h2>
      {body ? <p>{body}</p> : null}
      {children}
    </div>
  );
}
