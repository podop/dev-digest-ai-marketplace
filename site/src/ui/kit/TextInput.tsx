import React from "react";

/** REAL controlled text input (prototype TextInput was display-only).
    Catalog adaptation: optional `prefix` slot (e.g. a search icon) and a
    "dd-field" class so the wrapper shows a focus ring (:focus-within) even
    though the inner input has no outline. */
export function TextInput({
  value,
  onChange,
  placeholder,
  mono,
  type = "text",
  prefix,
  suffix,
  ...rest
}: {
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
  type?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "size" | "prefix">) {
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
        minWidth: 0,
      }}
    >
      {prefix}
      <input
        {...rest}
        type={type}
        className={mono ? "mono" : undefined}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 14,
          color: "var(--text-primary)",
          background: "transparent",
          border: "none",
          outline: "none",
          padding: 0,
        }}
      />
      {suffix}
    </div>
  );
}
