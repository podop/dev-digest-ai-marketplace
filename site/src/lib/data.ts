import { useEffect, useState } from 'react';
import type { Artifact, CatalogIndex, Plugin, Release, ReleasesFile } from './types';

export interface Catalog {
  index: CatalogIndex;
  releases: Release[];
  pluginsByName: Map<string, Plugin>;
  artifactsById: Map<string, Artifact>;
}

export type LoadState<T> = { status: 'loading' } | { status: 'error'; error: Error } | { status: 'ready'; data: T };

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

function normalizeIndex(raw: Partial<CatalogIndex>): CatalogIndex {
  return {
    marketplace: raw.marketplace ?? { name: '', owner: '', description: '', repo: null },
    generatedAt: raw.generatedAt ?? '',
    commit: raw.commit ?? null,
    plugins: Array.isArray(raw.plugins) ? raw.plugins : [],
    artifacts: Array.isArray(raw.artifacts) ? raw.artifacts : [],
  };
}

let catalogPromise: Promise<Catalog> | null = null;

export function loadCatalog(): Promise<Catalog> {
  catalogPromise ??= (async () => {
    const [index, releases] = await Promise.all([
      fetchJson<Partial<CatalogIndex>>('./index.json').then(normalizeIndex),
      // Releases are optional: a missing file must not break the catalog.
      fetchJson<ReleasesFile>('./releases.json')
        .then((r) => (Array.isArray(r.releases) ? r.releases : []))
        .catch(() => [] as Release[]),
    ]);
    return {
      index,
      releases,
      pluginsByName: new Map(index.plugins.map((p) => [p.name, p])),
      artifactsById: new Map(index.artifacts.map((a) => [a.id, a])),
    };
  })();
  catalogPromise.catch(() => {
    catalogPromise = null; // allow a retry after a failed load
  });
  return catalogPromise;
}

export function useCatalog(): LoadState<Catalog> {
  const [state, setState] = useState<LoadState<Catalog>>({ status: 'loading' });
  useEffect(() => {
    let alive = true;
    loadCatalog().then(
      (data) => alive && setState({ status: 'ready', data }),
      (error: unknown) => alive && setState({ status: 'error', error: error instanceof Error ? error : new Error(String(error)) }),
    );
    return () => {
      alive = false;
    };
  }, []);
  return state;
}

const bodyCache = new Map<string, Promise<string>>();

function loadBody(path: string): Promise<string> {
  let promise = bodyCache.get(path);
  if (!promise) {
    promise = fetch(`./${path}`, { cache: 'no-cache' }).then((res) => {
      if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
      return res.text();
    });
    promise.catch(() => bodyCache.delete(path));
    bodyCache.set(path, promise);
  }
  return promise;
}

/** Loads a generated markdown body (`bodies/*.md`). A null path resolves to an empty ready state. */
export function useBody(path: string | null): LoadState<string | null> {
  const [state, setState] = useState<LoadState<string | null>>(
    path ? { status: 'loading' } : { status: 'ready', data: null },
  );
  useEffect(() => {
    if (!path) {
      setState({ status: 'ready', data: null });
      return;
    }
    let alive = true;
    setState({ status: 'loading' });
    loadBody(path).then(
      (data) => alive && setState({ status: 'ready', data }),
      (error: unknown) => alive && setState({ status: 'error', error: error instanceof Error ? error : new Error(String(error)) }),
    );
    return () => {
      alive = false;
    };
  }, [path]);
  return state;
}
