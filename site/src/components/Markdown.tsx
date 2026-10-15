import { useMemo, type MouseEvent } from 'react';
import { t } from '../i18n';
import { useBody } from '../lib/data';
import { renderMarkdown, type MarkdownContext } from '../lib/markdown';
import { ErrorState, Loading } from './States';

function onAnchorClick(event: MouseEvent<HTMLDivElement>) {
  const target = event.target instanceof Element ? event.target.closest('a[data-anchor]') : null;
  if (!target) return;
  const anchor = target.getAttribute('data-anchor');
  const heading = anchor ? document.getElementById(anchor) : null;
  event.preventDefault();
  if (heading) {
    heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
  }
}

/** Renders untrusted markdown (sanitized in renderMarkdown). */
export function Markdown({ source, context }: { source: string; context: MarkdownContext }) {
  const html = useMemo(() => renderMarkdown(source, context), [source, context.repo, context.sourcePath]);
  // Safe: `html` was sanitized by DOMPurify in renderMarkdown.
  return <div className="markdown" onClick={onAnchorClick} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** Loads a generated body file and renders it. */
export function MarkdownBody({
  path,
  context,
  emptyText,
}: {
  path: string | null;
  context: MarkdownContext;
  emptyText: string;
}) {
  const body = useBody(path);
  if (body.status === 'loading') return <Loading label={t('common.loadingDocument')} />;
  if (body.status === 'error') return <ErrorState title={t('common.documentErrorTitle')} body={t('common.documentErrorBody')} />;
  if (!body.data || !body.data.trim()) return <p className="muted">{emptyText}</p>;
  return <Markdown source={body.data} context={context} />;
}
