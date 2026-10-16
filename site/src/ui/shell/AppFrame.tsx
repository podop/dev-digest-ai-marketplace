import React from "react";

/* Vendored from DevDigest `@devdigest/ui`.
   Catalog adaptation: the sidebar and topbar are passed as elements (they are
   built from the catalog index, not from a ShellContext), and the page scrolls
   with the window instead of an inner <main> scroller, so in-page anchors,
   scroll restoration and the "scroll to top on navigation" behave like a
   document site. The sidebar and topbar stay put via sticky positioning
   (classes "dd-sidebar" / "dd-topbar" in the catalog stylesheet). */
export function AppFrame({
  sidebar,
  topbar,
  overlay,
  children,
}: {
  sidebar: React.ReactNode;
  topbar: React.ReactNode;
  /** Rendered between the sidebar and the content (e.g. the mobile drawer backdrop). */
  overlay?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="dd-frame"
      style={{
        display: "flex",
        width: "100%",
        minHeight: "100vh",
        background: "var(--bg-primary)",
        alignItems: "stretch",
      }}
    >
      {sidebar}
      {overlay}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {topbar}
        <main id="main" tabIndex={-1} style={{ flex: 1, minWidth: 0, outline: "none" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
