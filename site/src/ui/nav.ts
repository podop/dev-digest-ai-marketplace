/* nav.ts — sidebar nav structure (vendored from DevDigest `@devdigest/ui`).
   Catalog adaptation: only the types are kept. DevDigest's NAV / SHORTCUTS
   constants and the :repoId resolver are not copied — the catalog builds its
   groups from the generated index and en.json at runtime. */
import type { IconName } from "./icons";

export interface NavItemDef {
  key: string;
  label: string;
  icon: IconName;
  /** Target href (a hash route in the catalog). */
  href: string;
  badge?: string;
  /** Catalog adaptation: accessible description of the badge (e.g. "5 skills and agents"). */
  badgeLabel?: string;
}

export interface NavGroup {
  section: string;
  items: NavItemDef[];
}
