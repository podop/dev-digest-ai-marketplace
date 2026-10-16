# `src/ui` — vendored DevDigest design system

A copy of the components the catalog uses from DevDigest's `@devdigest/ui`
(`dev-digest/client/src/vendor/ui/`), taken at DevDigest commit **`18311f8`**.
The layer layout, component APIs and the inline-style-on-CSS-variables
approach are kept, so the catalog looks and behaves like the DevDigest app.

Import surface: `import { Button, Card, Sidebar } from '../ui'` (barrel `index.ts`).
Tokens and base rules: `tokens.css`, imported once in `src/main.tsx`.

| Layer | Files | Copied from |
|---|---|---|
| Tokens | `tokens.css` | `styles.css` (dark + light via `data-theme`, base rules, keyframes, `.skeleton`) |
| Icons | `icons.tsx` | `icons.tsx` (lucide-react registry, subset) |
| Nav types | `nav.ts` | `nav.ts` (types only) |
| Primitives | `primitives/` Button, IconBtn, Badge, Chip, Card, EmptyState, ErrorState, Skeleton, Kbd, SectionLabel, MonoLink | `primitives/` |
| Kit | `kit/` Tabs, TextInput, SelectInput | `kit/` |
| Shell | `shell/` AppFrame, Sidebar, Topbar, NavItem, DefaultLink | `shell/` |

Not copied: charts (recharts), command palette, RepoSwitcher, Dropdown, Drawer, Modal,
form kit, Avatar, severity/category tokens, DevDigest's `Markdown` (react-markdown) —
the catalog renders markdown with its own marked + DOMPurify pipeline and styles it
with `.dd-md` rules adapted from DevDigest's `globals.css` (in `src/styles.css`).

## What was adapted

- **No Tailwind.** `@import "tailwindcss"` and the `@theme` block are removed from the
  tokens; fonts are exposed as `--font-sans` / `--font-mono` (Inter and JetBrains Mono,
  self-hosted from `@fontsource/*` in `main.tsx`).
- **No Next.js.** Links are plain anchors with hash hrefs (`DefaultLink`); `Button` takes
  an optional `href` / `target` and renders an `<a>` with the same look.
- **No hard-coded English.** `ErrorState` has no default title / retry label; `Sidebar`,
  `Topbar`, `IconBtn` and `Tabs` take their labels (brand name, nav groups, aria-labels)
  as props. DevDigest's `NAV` / `SHORTCUTS` constants are not copied.
- **Shell.** `Sidebar` takes `brand`, `groups`, `footer` and drawer props (`open`,
  `onClose`) instead of a `ShellContext`; `Topbar` takes `crumb`, `leading`, `search`,
  `actions` slots (no command palette, notifications or avatar); `AppFrame` takes the
  sidebar / topbar elements and lets the window scroll (sticky sidebar and topbar via the
  `dd-sidebar` / `dd-topbar` classes in `src/styles.css`, which also turn the sidebar into
  an off-canvas drawer at ≤ 900 px).
- **Accessibility.** `Tabs` implements the WAI-ARIA tabs pattern (roles, `aria-selected`,
  roving tabindex, Arrow/Home/End) and exports `tabPanelProps()`; `Chip` exposes
  `aria-pressed`; `IconBtn` has `type="button"` and optional `aria-expanded` /
  `aria-controls`; `TextInput` / `SelectInput` get a `dd-field` class for a
  `:focus-within` ring and pass through `id` / `aria-label`; decorative icons are
  `aria-hidden`; `NavItem` sets `aria-current="page"`; `EmptyState` / `ErrorState`
  titles are headings.
- **Small extensions.** `Card` (`as`, `className`, `labelledBy`), `Badge` (`title`),
  `SectionLabel` (`as`, `id`), `EmptyState` (`action` slot), `ErrorState` (`detail`),
  `TextInput` (`prefix` slot). React 18 compatible (no React 19-only APIs are used).

## Updating from DevDigest

1. `git -C <dev-digest> log --oneline -- client/src/vendor/ui` since `18311f8` to see what changed.
2. Diff each copied file against its upstream counterpart and port the visual changes,
   keeping the adaptations above (labels as props, ARIA, no Tailwind / Next.js).
3. Keep `lucide-react` on the same version as DevDigest (`site/package.json`, exact pin).
4. Update the commit hash at the top of this file, then run `npm run build` and the
   browser checks described in `site/README.md`.
