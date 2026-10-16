import React from "react";
import { Icon, type IconName } from "../icons";

export function IconBtn({
  icon,
  label,
  size = 30,
  active,
  onClick,
  danger,
  expanded,
  controls,
  className,
}: {
  icon: IconName;
  /** Accessible name and tooltip — pass a translated label. */
  label: string;
  size?: number;
  active?: boolean;
  onClick?: () => void;
  danger?: boolean;
  /** Catalog adaptation: aria-expanded for disclosure buttons (e.g. the mobile menu). */
  expanded?: boolean;
  /** Catalog adaptation: aria-controls target id. */
  controls?: string;
  className?: string;
}) {
  const I = Icon[icon];
  const [h, setH] = React.useState(false);
  return (
    <button
      type="button"
      className={className}
      title={label}
      aria-label={label}
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        display: "inline-grid",
        placeItems: "center",
        borderRadius: 6,
        border: "1px solid transparent",
        background: h ? "var(--bg-hover)" : active ? "var(--bg-hover)" : "transparent",
        color: danger && h ? "var(--crit)" : active || h ? "var(--text-primary)" : "var(--text-secondary)",
        transition: "background .12s, color .12s",
        padding: 0,
      }}
    >
      <I size={Math.round(size * 0.52)} aria-hidden="true" />
    </button>
  );
}
