import { type IconName } from "../icons";

/* Vendored from DevDigest `@devdigest/ui`. The catalog has no severities or
   categories, so only ButtonProps is kept (SEV / CAT are not copied). */

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  kind?: "primary" | "secondary" | "tertiary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: IconName;
  iconRight?: IconName;
  active?: boolean;
  full?: boolean;
  /** Shows a spinning indicator and disables the button while a task runs. */
  loading?: boolean;
  /** Catalog adaptation: when set, renders an <a> with the same look (links styled as buttons). */
  href?: string;
  /** Used with `href`; external links get rel="noopener noreferrer". */
  target?: "_blank" | "_self";
  children?: React.ReactNode;
}
