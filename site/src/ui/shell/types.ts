import type React from "react";

/** Minimal Link contract (Next's <Link> satisfied it upstream; the catalog uses plain hash links). */
export type LinkLike = React.ComponentType<{
  href: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  onClick?: () => void;
  "aria-current"?: "page";
  "aria-label"?: string;
  title?: string;
}>;

export interface Crumb {
  label: string;
  mono?: boolean;
  href?: string;
}
