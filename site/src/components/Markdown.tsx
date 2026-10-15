import { useEffect, useMemo, useRef, type MouseEvent } from 'react';
import { t } from '../i18n';
import { useBody } from '../lib/data';
import { renderMarkdown, type MarkdownContext } from '../lib/markdown';
import { renderMermaidIn, resetMermaidIn } from '../lib/mermaid';
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
  const ref = useRef<HTMLDivElement>(null);

  // Render ```mermaid blocks after the HTML is in the DOM; re-render when the theme changes.
  useEffect(() => {
    const root = ref.current;
    if (!root || !root.querySelector('pre > code.language-mermaid')) return;
    const note = t('common.diagramFailed');
    void renderMermaidIn(root, note);
    const observer = new MutationObserver(() => {
      resetMermaidIn(root);
      void renderMermaidIn(root, note);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, [html]);

  // Safe: `html` was sanitized by DOMPurify in renderMarkdown; diagrams are sanitized in renderMermaidIn.
  return <div ref={ref} className="markdown" onClick={onAnchorClick} dangerouslySetInnerHTML={{ __html: html }} />;
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
