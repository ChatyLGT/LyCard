"use client";

import { useState, type CSSProperties, type ReactNode } from "react";

const CHEVRON: CSSProperties = {
  fontSize: 20,
  color: "#8a8378",
  transition: "transform 240ms cubic-bezier(.4,0,.2,1)",
  flex: "none",
};

// Collapsible panel around a whole editing category — "Marca del Programa",
// "Distintivos & Honores", etc. Height is animated with the CSS grid-rows
// trick (0fr → 1fr) instead of measuring pixels: no JS height calc, no
// layout jump, works with content that changes size while open. Collapsed
// by default unless `defaultOpen` is set — callers open a section by
// default when a query-string flash message means the user needs to see
// its confirmation banner without an extra tap.
export function AccordionSection({
  title,
  subtitle,
  meta,
  defaultOpen = false,
  tone = "default",
  children,
}: {
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  defaultOpen?: boolean;
  tone?: "default" | "danger";
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: "#201f1f", borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,.05)" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "17px 18px",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
          <span
            style={{
              font: "600 14px 'Plus Jakarta Sans',sans-serif",
              letterSpacing: ".06em",
              textTransform: "uppercase",
              color: tone === "danger" ? "#e5928a" : "#F5F2EB",
            }}
          >
            {title}
          </span>
          {subtitle && (
            <span style={{ font: "400 11.5px/1.5 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>{subtitle}</span>
          )}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 10, flex: "none" }}>
          {meta}
          <span className="material-symbols-outlined" style={{ ...CHEVRON, transform: open ? "rotate(180deg)" : "none" }}>
            expand_more
          </span>
        </span>
      </button>
      <div style={{ display: "grid", gridTemplateRows: open ? "1fr" : "0fr", transition: "grid-template-rows 280ms cubic-bezier(.4,0,.2,1)" }}>
        <div style={{ overflow: "hidden" }}>
          <div
            style={{
              padding: "16px 18px 18px",
              borderTop: "1px solid rgba(255,255,255,.06)",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// Collapsible row for one item inside a list a category manages — one
// Puesto, one Escala tier, one Miembro, one item de Oficina Virtual: a
// compact summary line (swatch/icon + title + subtitle) that expands into
// its edit form. Pair with `AccordionAddRow` for the "add new" trigger.
export function AccordionRow({
  title,
  subtitle,
  leading,
  trailing,
  defaultOpen = false,
  open: openProp,
  onToggle: onToggleProp,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  defaultOpen?: boolean;
  // Both omitted → the row manages its own open state (fine standalone,
  // e.g. one Puesto/Miembro in a server-rendered list). Both given → the
  // parent coordinates it (e.g. EscalaEditor keeping only one tier open
  // at a time). Always pass the pair together, never just one.
  open?: boolean;
  onToggle?: () => void;
  children: ReactNode;
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = openProp ?? internalOpen;
  const onToggle = onToggleProp ?? (() => setInternalOpen((o) => !o));
  return (
    <div style={{ background: "#151414", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 12px" }}>
        {leading}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 1,
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <span style={{ font: "700 12.5px 'Plus Jakarta Sans',sans-serif", color: "#F5F2EB", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
            {title}
          </span>
          {subtitle && (
            <span style={{ font: "400 10.5px 'Plus Jakarta Sans',sans-serif", color: "#8a8378", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
              {subtitle}
            </span>
          )}
        </button>
        {trailing}
        <button
          type="button"
          onClick={onToggle}
          aria-label={open ? "Cerrar" : "Editar"}
          style={{ flex: "none", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", border: "none", borderRadius: 8, background: "none", cursor: "pointer" }}
        >
          <span className="material-symbols-outlined" style={{ ...CHEVRON, fontSize: 18, transform: open ? "rotate(180deg)" : "none" }}>
            expand_more
          </span>
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateRows: open ? "1fr" : "0fr", transition: "grid-template-rows 240ms cubic-bezier(.4,0,.2,1)" }}>
        <div style={{ overflow: "hidden" }}>
          <div style={{ padding: "2px 12px 12px", borderTop: "1px solid rgba(255,255,255,.06)", marginTop: 2, display: "flex", flexDirection: "column", gap: 8 }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// The "+ Agregar" trigger that opens into a blank create form — same shape
// as AccordionRow so the list reads as one consistent set of rows, styled
// dashed/accent to read as the "add" affordance instead of an existing item.
export function AccordionAddRow({
  label,
  defaultOpen = false,
  open: openProp,
  onToggle: onToggleProp,
  children,
}: {
  label: string;
  defaultOpen?: boolean;
  open?: boolean;
  onToggle?: () => void;
  children: ReactNode;
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = openProp ?? internalOpen;
  const onToggle = onToggleProp ?? (() => setInternalOpen((o) => !o));
  return (
    <div style={{ background: open ? "#151414" : "none", border: `1px dashed ${open ? "rgba(200,161,90,.4)" : "rgba(200,161,90,.35)"}`, borderRadius: 12, overflow: "hidden" }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 7,
          padding: 12,
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#C8A15A",
          font: "700 11px 'Plus Jakarta Sans',sans-serif",
          letterSpacing: ".08em",
          textTransform: "uppercase",
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16, transform: open ? "rotate(45deg)" : "none", transition: "transform 200ms" }}>
          add
        </span>
        {label}
      </button>
      <div style={{ display: "grid", gridTemplateRows: open ? "1fr" : "0fr", transition: "grid-template-rows 240ms cubic-bezier(.4,0,.2,1)" }}>
        <div style={{ overflow: "hidden" }}>
          <div style={{ padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
        </div>
      </div>
    </div>
  );
}
