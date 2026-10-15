import { t } from '../i18n';

const dateFormat = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' });
const dateTimeFormat = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' });
const decimalFormat = new Intl.NumberFormat('en', { maximumFractionDigits: 1 });

/** Formats a `YYYY-MM-DD` (or ISO) date without timezone drift. */
export function formatDate(value: string | null): string {
  if (!value) return '';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormat.format(date);
}

export function formatDateTime(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateTimeFormat.format(date);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return t('units.bytes', { value: decimalFormat.format(bytes) });
  return t('units.kilobytes', { value: decimalFormat.format(bytes / 1024) });
}

export function shortSha(sha: string | null): string {
  return sha ? sha.slice(0, 7) : '';
}

function encodePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

export function githubTreeUrl(repo: string | null, path: string): string | null {
  return repo ? `https://github.com/${repo}/tree/main/${encodePath(path)}` : null;
}

export function githubBlobUrl(repo: string | null, path: string): string | null {
  return repo ? `https://github.com/${repo}/blob/main/${encodePath(path)}` : null;
}

export function githubRepoUrl(repo: string | null): string | null {
  return repo ? `https://github.com/${repo}` : null;
}

export function githubCommitUrl(repo: string | null, sha: string | null): string | null {
  return repo && sha ? `https://github.com/${repo}/commit/${sha}` : null;
}

export function githubTagUrl(repo: string | null, tag: string | null): string | null {
  return repo && tag ? `https://github.com/${repo}/tree/${encodeURIComponent(tag)}` : null;
}

/** Parent folder of a repo-relative file path. */
export function dirname(path: string): string {
  const idx = path.lastIndexOf('/');
  return idx === -1 ? '' : path.slice(0, idx);
}
