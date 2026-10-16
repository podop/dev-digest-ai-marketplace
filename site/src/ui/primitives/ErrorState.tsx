import React from "react";
import { Icon } from "../icons";
import { Button } from "./Button";

/** Full-screen / inline error (error UX taxonomy) with Retry.
    Catalog adaptation: no English defaults — `title` and `retryLabel` come from the caller. */
export function ErrorState({
  title,
  body,
  onRetry,
  retryLabel,
  fullScreen,
  detail,
}: {
  title: string;
  body?: React.ReactNode;
  onRetry?: () => void;
  /** Retry button text — pass a translated label (required with onRetry). */
  retryLabel?: string;
  fullScreen?: boolean;
  /** Catalog adaptation: optional technical detail shown in mono. */
  detail?: string;
}) {
  return (
    <div
      role="alert"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: 10,
        padding: fullScreen ? "80px 24px" : "40px 24px",
        minHeight: fullScreen ? "60vh" : undefined,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          display: "grid",
          placeItems: "center",
          background: "var(--crit-bg)",
          color: "var(--crit)",
          marginBottom: 5,
        }}
      >
        <Icon.AlertOctagon size={22} />
      </div>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{title}</h2>
      {body && (
        <div style={{ fontSize: 14, color: "var(--text-secondary)", maxWidth: 380, lineHeight: 1.5 }}>
          {body}
        </div>
      )}
      {detail && (
        <code
          className="mono"
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            maxWidth: "100%",
            overflowWrap: "anywhere",
          }}
        >
          {detail}
        </code>
      )}
      {onRetry && retryLabel && (
        <div style={{ marginTop: 12 }}>
          <Button kind="secondary" icon="RefreshCw" onClick={onRetry}>
            {retryLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
