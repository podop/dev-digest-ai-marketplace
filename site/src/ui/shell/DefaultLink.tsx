import type { LinkLike } from "./types";

/** Fallback Link used when no router <Link> is provided. In the catalog every
    route is a hash href, so a plain anchor is the router link. */
export const DefaultLink: LinkLike = ({ href, children, style, onClick, className, ...aria }) => (
  <a href={href} style={style} onClick={onClick} className={className} {...aria}>
    {children}
  </a>
);
