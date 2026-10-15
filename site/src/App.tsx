import { useEffect } from 'react';
import { Layout } from './components/Layout';
import { ErrorState, Loading } from './components/States';
import { t } from './i18n';
import { useCatalog } from './lib/data';
import { useRoute, type Route } from './lib/router';
import type { Catalog } from './lib/data';
import { ArtifactPage } from './pages/ArtifactPage';
import { GettingStarted } from './pages/GettingStarted';
import { Home } from './pages/Home';
import { NotFound } from './pages/NotFound';
import { PluginPage } from './pages/PluginPage';
import { Search } from './pages/Search';
import { WhatsNew } from './pages/WhatsNew';

function Page({ route, catalog }: { route: Route; catalog: Catalog }) {
  const [section = '', param, ...rest] = route.segments;
  const marketplace = catalog.index.marketplace.name;
  if (rest.length > 0) return <NotFound marketplace={marketplace} />;
  switch (section) {
    case '':
      return <Home catalog={catalog} />;
    case 'search':
      return param === undefined ? <Search catalog={catalog} route={route} /> : <NotFound marketplace={marketplace} />;
    case 'plugin':
      return param ? <PluginPage catalog={catalog} name={param} /> : <NotFound marketplace={marketplace} />;
    case 'artifact':
      return param ? <ArtifactPage catalog={catalog} id={param} /> : <NotFound marketplace={marketplace} />;
    case 'whats-new':
      return param === undefined ? <WhatsNew catalog={catalog} /> : <NotFound marketplace={marketplace} />;
    case 'getting-started':
      return param === undefined ? <GettingStarted catalog={catalog} /> : <NotFound marketplace={marketplace} />;
    default:
      return <NotFound marketplace={marketplace} />;
  }
}

export function App() {
  const route = useRoute();
  const state = useCatalog();

  // New screen: start at the top. Search keeps its position while typing (query changes only).
  const screen = route.path;
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);

  return (
    <Layout route={route} index={state.status === 'ready' ? state.data.index : null}>
      {state.status === 'loading' ? (
        <Loading />
      ) : state.status === 'error' ? (
        <ErrorState title={t('common.errorTitle')} body={t('common.errorBody')} detail={state.error.message} />
      ) : (
        <Page route={route} catalog={state.data} />
      )}
    </Layout>
  );
}
