import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const messages = JSON.parse(readFileSync(new URL('./src/i18n/en.json', import.meta.url), 'utf8')) as Record<string, string>;

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Fills index.html placeholders from en.json, so no UI text lives outside it. */
function htmlStrings(): Plugin {
  const values: Record<string, string> = {
    APP_TITLE: messages['app.htmlTitle'] ?? '',
    APP_DESCRIPTION: messages['app.htmlDescription'] ?? '',
    APP_NOSCRIPT: messages['app.noscript'] ?? '',
  };
  return {
    name: 'catalog-html-strings',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => html.replace(/%(APP_[A-Z_]+)%/g, (match, key: string) => escapeHtml(values[key] ?? match)),
    },
  };
}

// `base: './'` keeps every asset path relative, so the build works under
// https://<owner>.github.io/<repo>/ (and any fork) without configuration.
export default defineConfig({
  base: './',
  plugins: [react(), htmlStrings()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Mermaid's chunks are large but loaded on demand, only on pages that contain a diagram.
    chunkSizeWarningLimit: 800,
  },
});
