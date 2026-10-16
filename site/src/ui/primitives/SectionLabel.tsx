import React from "react";
import { Icon, type IconName } from "../icons";

export function SectionLabel({
  children,
  icon,
  right,
  as: Tag = "span",
  id,
}: {
  children?: React.ReactNode;
  icon?: IconName;
  right?: React.ReactNode;
  /** Catalog adaptation: render the label text as a heading (h2/h3) for document outline. */
  as?: "span" | "h2" | "h3";
  id?: string;
}) {
  const I = icon ? Icon[icon] : null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      {I && <I size={14} aria-hidden="true" style={{ color: "var(--text-muted)", flexShrink: 0 }} />}
      <Tag
        id={id}
        style={{
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          margin: 0,
        }}
      >
        {children}
      </Tag>
      {right && <div style={{ marginLeft: "auto" }}>{right}</div>}
    </div>
  );
}
