import React from "react";
import { Icon } from "../icons";
import { type NavItemDef } from "../nav";
import { DefaultLink } from "./DefaultLink";
import type { LinkLike } from "./types";

/* Vendored from DevDigest `@devdigest/ui`.
   Catalog adaptation: the anchor itself is the styled row (block-level, so the
   focus ring wraps the whole item), aria-current marks the active route, long
   labels are truncated, and the badge can carry an accessible description. */
export function NavItem({
  item,
  active,
  Link = DefaultLink,
  onNavigate,
}: {
  item: NavItemDef;
  active?: boolean;
  Link?: LinkLike;
  onNavigate?: () => void;
}) {
  const I = Icon[item.icon];
  const [h, setH] = React.useState(false);
  return (
    <div onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}>
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        title={item.label}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "9px 14px",
          borderRadius: 6,
          fontSize: 14,
          fontWeight: active ? 600 : 500,
          cursor: "pointer",
          position: "relative",
          color: active ? "var(--text-primary)" : h ? "var(--text-primary)" : "var(--text-secondary)",
          background: active ? "var(--bg-hover)" : h ? "var(--bg-elevated)" : "transparent",
          transition: "background .12s, color .12s",
        }}
      >
        {active && (
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              left: -8,
              top: 7,
              bottom: 7,
              width: 2.5,
              borderRadius: 2,
              background: "var(--accent)",
            }}
          />
        )}
        <I size={16} aria-hidden="true" style={{ color: active ? "var(--accent)" : "inherit", flexShrink: 0 }} />
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.label}
        </span>
        {item.badge && (
          <span
            className="tnum"
            aria-hidden={item.badgeLabel ? true : undefined}
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-muted)",
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: 99,
              padding: "0 8px",
              minWidth: 18,
              textAlign: "center",
              flexShrink: 0,
            }}
          >
            {item.badge}
          </span>
        )}
        {item.badge && item.badgeLabel && <span className="visually-hidden">{item.badgeLabel}</span>}
      </Link>
    </div>
  );
}
