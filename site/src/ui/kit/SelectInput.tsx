import { Icon } from "../icons";

/** REAL controlled <select>.
    Catalog adaptation: `id` / `aria-label` pass-through and the "dd-field"
    focus-within ring (the native select has no outline). */
export function SelectInput({
  value,
  onChange,
  options,
  mono = true,
  id,
  ariaLabel,
}: {
  value: string;
  onChange?: (v: string) => void;
  options: (string | { value: string; label: string })[];
  mono?: boolean;
  id?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      className="dd-field"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 7,
        border: "1px solid var(--border-strong)",
        background: "var(--bg-elevated)",
        position: "relative",
        minWidth: 0,
      }}
    >
      <select
        id={id}
        aria-label={ariaLabel}
        className={mono ? "mono" : undefined}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 14,
          color: "var(--text-primary)",
          background: "transparent",
          border: "none",
          outline: "none",
          appearance: "none",
          cursor: "pointer",
        }}
      >
        {options.map((o) => {
          const v = typeof o === "string" ? o : o.value;
          const l = typeof o === "string" ? o : o.label;
          return (
            <option key={v} value={v}>
              {l}
            </option>
          );
        })}
      </select>
      <Icon.ChevronsUpDown size={14} aria-hidden="true" style={{ color: "var(--text-muted)", pointerEvents: "none" }} />
    </div>
  );
}
