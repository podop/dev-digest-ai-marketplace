import { EmptyState } from '../components/States';
import { t } from '../i18n';
import { routes } from '../lib/router';
import { usePageTitle } from '../lib/usePageTitle';

export function NotFound({ marketplace }: { marketplace: string }) {
  usePageTitle(t('notFound.title'), marketplace);
  return (
    <EmptyState title={t('notFound.title')} body={t('notFound.body')}>
      <a className="button button-primary" href={routes.home()}>
        {t('notFound.home')}
      </a>
    </EmptyState>
  );
}
