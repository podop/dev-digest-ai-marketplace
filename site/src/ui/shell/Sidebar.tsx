import React from "react";
import { Icon } from "../icons";
import { type NavGroup } from "../nav";
import { IconBtn } from "../primitives";
import { DefaultLink } from "./DefaultLink";
import type { LinkLike } from "./types";
import { NavItem } from "./NavItem";

/* Vendored from DevDigest `@devdigest/ui`.
   Catalog adaptation: no RepoSwitcher and no hard-coded NAV / wordmark — the
   brand name, nav groups, labels and footer come from props. The aside carries
   the "dd-sidebar" class so the catalog stylesheet can make it sticky on desktop
   and an off-canvas drawer on narrow screens (data-open toggles it). */
export function Sidebar({
  id,
  brand,
  groups,
  activeKey,
  footer,
  navLabel,
  open,
  onClose,
  closeLabel,
  Link = DefaultLink,
}: {
  id?: string;
  brand: { name: string; href: string };
  groups: NavGroup[];
  activeKey?: string;
  footer?: React.ReactNode;
  /** Accessible name of the <nav> — pass a translated label. */
  navLabel: string;
  /** Drawer state on narrow screens. */
  open?: boolean;
  onClose?: () => void;
  /** Accessible name of the drawer close button — pass a translated label. */
  closeLabel: string;
  Link?: LinkLike;
}) {
  return (
    <aside
      id={id}
      className="dd-sidebar"
      data-open={open ? "true" : "false"}
      style={{
        width: 264,
        flexShrink: 0,
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        padding: "20px 14px 14px",
        gap: 2,
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 5px 16px" }}>
        <Link
          href={brand.href}
          onClick={onClose}
          title={brand.name}
          style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              background: "var(--text-primary)",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <Icon.Layers size={15} style={{ color: "var(--bg-primary)" }} />
          </span>
          <span
            style={{
              fontSize: 14.5,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: 1.25,
              minWidth: 0,
              // Catalog adaptation: marketplace names are long; wrap (at hyphens) instead of truncating.
              overflowWrap: "anywhere",
            }}
          >
            {brand.name}
          </span>
        </Link>
        <IconBtn icon="X" label={closeLabel} onClick={onClose} className="dd-sidebar-close" />
      </div>
      <nav
        aria-label={navLabel}
        style={{ overflowY: "auto", flex: 1, margin: "4px -5px 0 -13px", padding: "0 5px 0 13px" }}
      >
        {groups.map((grp) => (
          <div key={grp.section} style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                padding: "0 14px",
                marginBottom: 8,
              }}
            >
              {grp.section}
            </div>
            {grp.items.map((it) => (
              <NavItem key={it.key} item={it} active={activeKey === it.key} Link={Link} onNavigate={onClose} />
            ))}
          </div>
        ))}
      </nav>
      {footer && (
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: 2 }}>{footer}</div>
      )}
    </aside>
  );
}
