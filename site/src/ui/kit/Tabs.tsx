import React from "react";
import { Icon } from "../icons";
import { type TabDef } from "./types";

/* Vendored from DevDigest `@devdigest/ui`.
   Catalog adaptation: WAI-ARIA tabs pattern (role="tablist"/"tab", aria-selected,
   aria-controls, roving tabindex, Arrow/Home/End keys). Render the panel with
   `tabPanelProps(idBase, key)` so the ids line up. The strip scrolls horizontally
   on narrow screens (class "dd-tabs" in the catalog stylesheet). */

export function tabId(idBase: string, key: string): string {
  return `${idBase}-tab-${key}`;
}

export function tabPanelProps(idBase: string, key: string) {
  return {
    role: "tabpanel" as const,
    id: `${idBase}-panel-${key}`,
    "aria-labelledby": tabId(idBase, key),
    tabIndex: 0,
  };
}

export function Tabs({
  tabs,
  value,
  onChange,
  pad = "0 28px",
  label,
  idBase,
}: {
  tabs: TabDef[];
  value: string;
  onChange: (k: string) => void;
  pad?: string;
  /** Accessible name of the tab list — pass a translated label. */
  label: string;
  /** Prefix for tab / panel ids. */
  idBase: string;
}) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const keys = tabs.map((t) => (typeof t === "string" ? t : t.key));

  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = -1;
    if (event.key === "ArrowRight") next = (index + 1) % keys.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + keys.length) % keys.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = keys.length - 1;
    const k = keys[next];
    if (k === undefined) return;
    event.preventDefault();
    onChange(k);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className="dd-tabs"
      style={{ display: "flex", gap: 2, padding: pad, borderBottom: "1px solid var(--border)" }}
    >
      {tabs.map((t, i) => {
        const k = typeof t === "string" ? t : t.key;
        const tabLabel = typeof t === "string" ? t : t.label;
        const icon = typeof t === "object" ? t.icon : undefined;
        const on = value === k;
        const I = icon ? Icon[icon] : null;
        return (
          <button
            key={k}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={tabId(idBase, k)}
            aria-selected={on}
            aria-controls={tabPanelProps(idBase, k).id}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(k)}
            onKeyDown={(e) => onKeyDown(e, i)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 16px",
              border: "none",
              background: "transparent",
              borderBottom: "2px solid " + (on ? "var(--accent)" : "transparent"),
              marginBottom: -1,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: on ? 600 : 500,
              color: on ? "var(--text-primary)" : "var(--text-secondary)",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {I && <I size={14} aria-hidden="true" style={{ color: on ? "var(--accent)" : "var(--text-muted)" }} />}
            {tabLabel}
            {typeof t === "object" && t.count != null && (
              <span className="tnum" style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
