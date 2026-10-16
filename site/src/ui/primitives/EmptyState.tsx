import React from "react";
import { Icon, type IconName } from "../icons";
import { Button } from "./Button";

export function EmptyState({
  icon,
  title,
  body,
  cta,
  onCta,
  ctaLoading,
  action,
  headingLevel = 2,
}: {
  icon?: IconName;
  title: string;
  body?: React.ReactNode;
  cta?: string;
  onCta?: () => void;
  ctaLoading?: boolean;
  /** Catalog adaptation: arbitrary action (e.g. a link styled as a Button) instead of `cta`. */
  action?: React.ReactNode;
  /** Catalog adaptation: the title is a real heading. */
  headingLevel?: 1 | 2 | 3;
}) {
  const I = icon ? Icon[icon] : null;
  const H = `h${headingLevel}` as "h1" | "h2" | "h3";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "60px 28px",
        gap: 8,
      }}
    >
      {I && (
        <div
          aria-hidden="true"
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            display: "grid",
            placeItems: "center",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            color: "var(--text-muted)",
            marginBottom: 8,
          }}
        >
          <I size={22} />
        </div>
      )}
      <H style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>{title}</H>
      {body && (
        <div style={{ fontSize: 14, color: "var(--text-secondary)", maxWidth: 340, lineHeight: 1.5 }}>
          {body}
        </div>
      )}
      {cta && (
        <div style={{ marginTop: 12 }}>
          <Button kind="secondary" icon="ArrowRight" onClick={onCta} loading={ctaLoading}>
            {cta}
          </Button>
        </div>
      )}
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </div>
  );
}
