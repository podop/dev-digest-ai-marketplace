import type { ReactNode } from 'react';

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Wraps matched search terms (word prefixes) in <mark>; never injects HTML. */
export function Highlight({ text, terms }: { text: string; terms: string[] }) {
  const usable = [...new Set(terms.map((term) => term.trim()).filter((term) => term.length > 1))].sort(
    (a, b) => b.length - a.length,
  );
  if (usable.length === 0 || !text) return <>{text}</>;
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])(${usable.map(escapeRegExp).join('|')})`, 'giu');
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > last) parts.push(text.slice(last, start));
    parts.push(<mark key={start}>{match[0]}</mark>);
    last = start + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}
