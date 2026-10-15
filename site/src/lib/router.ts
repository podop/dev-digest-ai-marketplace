import { useMemo, useSyncExternalStore } from 'react';
import type { DocKind } from './types';

// Tiny hash router: routes look like `#/plugin/<name>` or `#/search?q=...`.

export interface Route {
  path: string;
  segments: string[];
  query: URLSearchParams;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

const getHash = () => window.location.hash;

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, '');
  const qIndex = raw.indexOf('?');
  const pathPart = (qIndex === -1 ? raw : raw.slice(0, qIndex)) || '/';
  const path = pathPart.startsWith('/') ? pathPart : `/${pathPart}`;
  const segments = path
    .split('/')
    .filter(Boolean)
    .map((s) => {
      try {
        return decodeURIComponent(s);
      } catch {
        return s;
      }
    });
  return { path, segments, query: new URLSearchParams(qIndex === -1 ? '' : raw.slice(qIndex + 1)) };
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getHash, getHash);
  return useMemo(() => parseHash(hash), [hash]);
}

function withQuery(path: string, query: Record<string, string | null | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value) params.set(key, value);
  const qs = params.toString();
  return `#${path}${qs ? `?${qs}` : ''}`;
}

export const routes = {
  home: () => '#/',
  search: (q?: string, type?: DocKind | 'all' | null, plugin?: string | null) => withQuery('/search', { q, type, plugin }),
  plugin: (name: string) => `#/plugin/${encodeURIComponent(name)}`,
  artifact: (id: string) => `#/artifact/${encodeURIComponent(id)}`,
  whatsNew: () => '#/whats-new',
  gettingStarted: () => '#/getting-started',
};

/** Navigates to a hash route. `replace` avoids adding a history entry (used while typing). */
export function navigate(to: string, replace = false): void {
  if (replace) window.location.replace(to);
  else window.location.hash = to.replace(/^#/, '');
}
