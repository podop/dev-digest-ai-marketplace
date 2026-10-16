import { PageBody } from '../components/PageHeader';
import { t } from '../i18n';
import { routes } from '../lib/router';
import { usePageTitle } from '../lib/usePageTitle';
import { Button, EmptyState } from '../ui';

export function NotFound({ marketplace }: { marketplace: string }) {
  usePageTitle(t('notFound.title'), marketplace);
  return (
    <PageBody>
      <EmptyState
        icon="SearchX"
        headingLevel={1}
        title={t('notFound.title')}
        body={t('notFound.body')}
        action={
          <Button kind="primary" icon="Home" href={routes.home()}>
            {t('notFound.home')}
          </Button>
        }
      />
    </PageBody>
  );
}
