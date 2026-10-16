import React from "react";
import { Icon } from "../icons";
import { DefaultLink } from "./DefaultLink";
import type { Crumb, LinkLike } from "./types";

/* Vendored from DevDigest `@devdigest/ui`.
   Catalog adaptation: no command palette, notifications or avatar. The search
   field, the leading slot (mobile menu button) and the trailing actions are
   passed in, so no English text is hard-coded here. Breadcrumbs are an ordered
   list inside a labelled <nav>; the last crumb carries aria-current="page". */
export function Topbar({
  crumb = [],
  crumbLabel,
  leading,
  search,
  actions,
  Link = DefaultLink,
}: {
  crumb?: Crumb[];
  /** Accessible name of the breadcrumb <nav> — pass a translated label. */
  crumbLabel: string;
  leading?: React.ReactNode;
  search?: React.ReactNode;
  actions?: React.ReactNode;
  Link?: LinkLike;
}) {
  return (
    <header
      className="dd-topbar"
      style={{
        height: 52,
        flexShrink: 0,
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-primary)",
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "0 var(--page-pad-x, 24px)",
      }}
    >
      {leading}
      <nav aria-label={crumbLabel} className="dd-crumbs" style={{ minWidth: 0, flex: "0 1 auto" }}>
        <ol
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            minWidth: 0,
            listStyle: "none",
            margin: 0,
            padding: 0,
          }}
        >
          {crumb.map((c, i) => {
            const last = i === crumb.length - 1;
            const text = (
              <span
                className={c.mono ? "mono" : undefined}
                style={{
                  fontSize: c.mono ? 13 : 14,
                  fontWeight: last ? 600 : 500,
                  color: last ? "var(--text-primary)" : "var(--text-secondary)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "block",
                }}
              >
                {c.label}
              </span>
            );
            return (
              <li
                key={i}
                className={last ? "dd-crumb dd-crumb-last" : "dd-crumb"}
                style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}
              >
                {i > 0 && (
                  <Icon.ChevronRight
                    size={13}
                    aria-hidden="true"
                    style={{ color: "var(--text-muted)", flexShrink: 0 }}
                  />
                )}
                {c.href && !last ? (
                  <Link href={c.href} style={{ minWidth: 0 }}>
                    {text}
                  </Link>
                ) : (
                  <span aria-current={last ? "page" : undefined} style={{ minWidth: 0 }}>
                    {text}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, minWidth: 0 }} className="dd-topbar-tools">
        {search}
        {actions}
      </div>
    </header>
  );
}
