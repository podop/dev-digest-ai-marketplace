import DOMPurify from 'dompurify';
import { Marked, type Tokens } from 'marked';

// README, SKILL.md and agent bodies come from pull requests: treat them as untrusted.
// Markdown is rendered with marked and ALWAYS sanitized with DOMPurify before use.

export interface MarkdownContext {
  /** GitHub `owner/repo`, used to rewrite relative links; null disables rewriting. */
  repo: string | null;
  /** Repository-relative path of the markdown file (relative links resolve against its folder). */
  sourcePath: string;
  /** Branch used for rewritten links. */
  branch?: string;
}

const HEADING_PREFIX = 'md-';
const SCHEME = /^[a-z][a-z0-9+.-]*:/i;

let slugCounts = new Map<string, number>();
let currentContext: MarkdownContext | null = null;

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .trim()
    .replace(/\s/g, '-');
}

function uniqueSlug(text: string): string {
  const base = slugify(text) || 'section';
  const seen = slugCounts.get(base) ?? 0;
  slugCounts.set(base, seen + 1);
  return seen === 0 ? base : `${base}-${seen}`;
}

const marked = new Marked({ gfm: true, breaks: false, async: false });
marked.use({
  renderer: {
    heading(token: Tokens.Heading) {
      const inner = this.parser.parseInline(token.tokens);
      return `<h${token.depth} id="${HEADING_PREFIX}${uniqueSlug(token.text)}">${inner}</h${token.depth}>\n`;
    },
  },
});

/** Resolves a repo-relative link against the markdown file's folder; returns null if it escapes the repo. */
export function resolveRepoPath(sourcePath: string, target: string): string | null {
  const [pathPart = ''] = target.split(/[?#]/);
  const baseParts = target.startsWith('/') ? [] : sourcePath.split('/').slice(0, -1);
  const parts = [...baseParts];
  for (const segment of pathPart.split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') {
      if (parts.length === 0) return null;
      parts.pop();
    } else parts.push(segment);
  }
  return parts.join('/');
}

function githubUrl(ctx: MarkdownContext, target: string, raw: boolean): string | null {
  if (!ctx.repo) return null;
  const repoPath = resolveRepoPath(ctx.sourcePath, target);
  if (repoPath === null) return null;
  const hashIndex = target.indexOf('#');
  const hash = !raw && hashIndex !== -1 ? target.slice(hashIndex) : '';
  const encoded = repoPath.split('/').map(encodeURIComponent).join('/');
  return `https://github.com/${ctx.repo}/blob/${ctx.branch ?? 'main'}/${encoded}${raw ? '?raw=true' : hash}`;
}

function isExternal(href: string): boolean {
  try {
    return new URL(href, window.location.href).origin !== window.location.origin;
  } catch {
    return false;
  }
}

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  const ctx = currentContext;
  if (node.tagName === 'A' && node.hasAttribute('href')) {
    const href = node.getAttribute('href') ?? '';
    if (href.startsWith('#')) {
      // In-page anchor: the hash is used for routing, so scrolling is handled in the Markdown component.
      node.setAttribute('data-anchor', `${HEADING_PREFIX}${slugify(decodeURIComponentSafe(href.slice(1)))}`);
      node.setAttribute('href', window.location.hash || '#/');
    } else if (!SCHEME.test(href) && !href.startsWith('//') && ctx) {
      const rewritten = githubUrl(ctx, href, false);
      if (rewritten) node.setAttribute('href', rewritten);
      else node.removeAttribute('href');
    }
    const finalHref = node.getAttribute('href');
    if (finalHref && !node.hasAttribute('data-anchor') && isExternal(finalHref)) {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    } else {
      node.removeAttribute('target');
    }
  }
  if (node.tagName === 'IMG' && node.hasAttribute('src')) {
    const src = node.getAttribute('src') ?? '';
    if (!SCHEME.test(src) && !src.startsWith('//') && ctx) {
      const rewritten = githubUrl(ctx, src, true);
      if (rewritten) node.setAttribute('src', rewritten);
      else node.removeAttribute('src');
    }
    node.setAttribute('loading', 'lazy');
    node.setAttribute('referrerpolicy', 'no-referrer');
  }
});

function decodeURIComponentSafe(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

export const SANITIZE_CONFIG = {
  USE_PROFILES: { html: true },
  FORBID_TAGS: ['style', 'form', 'input', 'button', 'textarea', 'select', 'iframe', 'frame', 'object', 'embed', 'base', 'meta', 'link'],
  FORBID_ATTR: ['style', 'srcset', 'formaction'],
  ADD_ATTR: ['target'],
  ALLOW_DATA_ATTR: false,
};

/** Renders untrusted markdown to sanitized HTML. */
export function renderMarkdown(source: string, ctx: MarkdownContext): string {
  slugCounts = new Map();
  const html = marked.parse(source) as string;
  currentContext = ctx;
  try {
    return DOMPurify.sanitize(html, SANITIZE_CONFIG);
  } finally {
    currentContext = null;
  }
}
