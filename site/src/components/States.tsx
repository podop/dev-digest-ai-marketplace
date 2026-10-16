import { t } from '../i18n';
import { Card, Skeleton } from '../ui';

/** Page-level loading placeholder (DevDigest Skeleton). */
export function Loading() {
  return (
    <div role="status" aria-live="polite" style={{ padding: '22px var(--page-pad-x)' }}>
      <span className="visually-hidden">{t('common.loading')}</span>
      <Skeleton width={280} height={26} style={{ maxWidth: '100%' }} />
      <Skeleton width="60%" height={14} style={{ marginTop: 14 }} />
      <div className="cat-grid-cards" style={{ marginTop: 28 }}>
        {[0, 1, 2, 3].map((i) => (
          <Card key={i}>
            <Skeleton width="45%" height={16} />
            <Skeleton height={12} style={{ marginTop: 14 }} />
            <Skeleton width="80%" height={12} style={{ marginTop: 8 }} />
          </Card>
        ))}
      </div>
    </div>
  );
}

/** Inline placeholder while a markdown document loads. */
export function DocumentLoading() {
  return (
    <div role="status" aria-live="polite">
      <span className="visually-hidden">{t('common.loadingDocument')}</span>
      <Skeleton width="40%" height={18} />
      <Skeleton height={12} style={{ marginTop: 16 }} />
      <Skeleton height={12} style={{ marginTop: 8 }} />
      <Skeleton width="70%" height={12} style={{ marginTop: 8 }} />
    </div>
  );
}

/** Muted one-line note (empty sections). */
export function Muted({ children }: { children: string }) {
  return <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>{children}</p>;
}
