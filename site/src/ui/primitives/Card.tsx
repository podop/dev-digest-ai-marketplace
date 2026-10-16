import React from "react";

export function Card({
  children,
  pad = true,
  style,
  hover,
  onClick,
  as: Tag = "div",
  className,
  labelledBy,
}: {
  children?: React.ReactNode;
  pad?: boolean;
  style?: React.CSSProperties;
  hover?: boolean;
  onClick?: () => void;
  /** Catalog adaptation: semantic element (article / section / li). */
  as?: "div" | "article" | "section" | "li";
  /** Catalog adaptation: class hook for responsive rules and stretched links. */
  className?: string;
  /** Catalog adaptation: aria-labelledby for sections. */
  labelledBy?: string;
}) {
  const [h, setH] = React.useState(false);
  return (
    <Tag
      className={className}
      aria-labelledby={labelledBy}
      onClick={onClick}
      onMouseEnter={() => hover && setH(true)}
      onMouseLeave={() => hover && setH(false)}
      style={{
        background: h ? "var(--bg-hover)" : "var(--bg-elevated)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: pad ? "var(--card-pad)" : 0,
        transition: "background .12s, border-color .12s",
        cursor: onClick ? "pointer" : undefined,
        minWidth: 0,
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}
