import DOMPurify from 'dompurify';

// Diagrams in README / SKILL.md / agent bodies are untrusted input. Mermaid is loaded only when
// a page has a ```mermaid block, runs with securityLevel "strict" (no HTML labels, no click
// handlers, no scripts), and its SVG output is sanitized once more before it touches the DOM.

type MermaidApi = typeof import('mermaid')['default'];

let loader: Promise<MermaidApi> | null = null;
let counter = 0;

function loadMermaid(): Promise<MermaidApi> {
  loader ??= import('mermaid').then((m) => m.default);
  return loader;
}

/**
 * Mermaid "base" theme fed with the DevDigest design tokens of the active theme
 * (`data-theme` dark | light), so diagrams match the surrounding cards.
 */
function themeConfig() {
  const root = document.documentElement;
  const css = getComputedStyle(root);
  const token = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  const dark = root.getAttribute('data-theme') !== 'light';
  const surface = token('--bg-surface', dark ? '#141414' : '#fafafa');
  const elevated = token('--bg-elevated', dark ? '#1c1c1c' : '#ffffff');
  const hover = token('--bg-hover', dark ? '#242424' : '#f2f2f2');
  const border = token('--border-strong', dark ? '#3a3a3a' : '#d4d4d4');
  const text = token('--text-primary', dark ? '#ededed' : '#18181b');
  const secondary = token('--text-secondary', dark ? '#999999' : '#595964');
  return {
    theme: 'base' as const,
    themeVariables: {
      darkMode: dark,
      background: surface,
      fontFamily: token('--font-sans', 'sans-serif'),
      fontSize: '14px',
      primaryColor: hover,
      primaryTextColor: text,
      primaryBorderColor: border,
      secondaryColor: elevated,
      secondaryTextColor: text,
      secondaryBorderColor: border,
      tertiaryColor: surface,
      tertiaryTextColor: text,
      tertiaryBorderColor: border,
      mainBkg: hover,
      nodeBorder: border,
      nodeTextColor: text,
      textColor: text,
      titleColor: text,
      lineColor: secondary,
      clusterBkg: elevated,
      clusterBorder: border,
      edgeLabelBackground: surface,
      noteBkgColor: elevated,
      noteTextColor: text,
      noteBorderColor: border,
      actorBkg: hover,
      actorBorder: border,
      actorTextColor: text,
      signalColor: secondary,
      signalTextColor: text,
      labelBoxBkgColor: hover,
      labelBoxBorderColor: border,
      labelTextColor: text,
    },
  };
}

const SVG_SANITIZE = {
  USE_PROFILES: { svg: true, svgFilters: true },
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'a'],
  FORBID_ATTR: ['onclick', 'onload', 'onerror', 'href', 'xlink:href'],
};

/**
 * Replaces every `<pre><code class="language-mermaid">` inside `root` with a rendered diagram.
 * Blocks that fail to parse stay as code with a short note. Returns when all blocks are done.
 */
export async function renderMermaidIn(root: HTMLElement, failedNote: string): Promise<void> {
  const blocks = Array.from(root.querySelectorAll<HTMLElement>('pre > code.language-mermaid'));
  if (!blocks.length) return;

  const mermaid = await loadMermaid();
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    ...themeConfig(),
    htmlLabels: false,
    flowchart: { htmlLabels: false, useMaxWidth: true, wrappingWidth: 400 },
  });

  for (const code of blocks) {
    const pre = code.parentElement;
    if (!pre || !root.contains(pre)) continue;
    const source = code.textContent ?? '';
    try {
      const { svg } = await mermaid.render(`mermaid-${++counter}`, source);
      const figure = document.createElement('figure');
      figure.className = 'mermaid-diagram';
      figure.dataset.source = source;
      figure.innerHTML = DOMPurify.sanitize(svg, SVG_SANITIZE);
      pre.replaceWith(figure);
    } catch {
      pre.classList.add('mermaid-failed');
      pre.setAttribute('data-note', failedNote);
      // mermaid leaves its error container in <body> when render fails
      document.getElementById(`dmermaid-${counter}`)?.remove();
    }
  }
}

/** Turns rendered diagrams back into code blocks so they can be re-rendered (theme change). */
export function resetMermaidIn(root: HTMLElement): void {
  for (const figure of Array.from(root.querySelectorAll<HTMLElement>('figure.mermaid-diagram'))) {
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.className = 'language-mermaid';
    code.textContent = figure.dataset.source ?? '';
    pre.appendChild(code);
    figure.replaceWith(pre);
  }
}
