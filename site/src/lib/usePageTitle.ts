import { useEffect } from 'react';
import { t } from '../i18n';

/** Sets document.title; `page` null means the home page. */
export function usePageTitle(page: string | null, marketplace: string) {
  useEffect(() => {
    const site = marketplace || t('app.name');
    document.title = page ? t('title.page', { page, site }) : t('title.home', { site });
  }, [page, marketplace]);
}
