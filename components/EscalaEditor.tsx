"use client";

import { useState } from "react";
import type { EscalaItem } from "@/lib/escalas";
import { AccordionRow } from "@/components/Accordion";

type EditableItem = EscalaItem & { _uid: string };

function uid() {
  return Math.random().toString(36).slice(2);
}

const FIELD: React.CSSProperties = {
  background: "#0D0D0D",
  border: "1px solid rgba(200,161,90,.25)",
  borderRadius: 8,
  padding: "8px 11px",
  color: "#F5F2EB",
  font: "400 12px 'Plus Jakarta Sans',sans-serif",
  outline: "none",
};

// Client-side array editor for a Program's Medallón/Sabiduría/Contactos
// scale (PLAN.md Fase 9.4/9.5, + Fase Contactos 2026-09-16) — same shape
// as officeItems in MemberCardEditor: local state, one hidden JSON input,
// one save action for the whole list. Each tier collapses into a summary
// row (swatch/ícono + nombre) and opens one at a time to edit — only the
// "+ Agregar nivel" trigger and the tier you're touching are ever expanded
// (2026-09-16, rediseño en acordeón).
export default function EscalaEditor({
  type,
  initialItems,
  action,
}: {
  type: "medal" | "rank" | "contacts";
  initialItems: EscalaItem[];
  action: (formData: FormData) => Promise<void>;
}) {
  const [items, setItems] = useState<EditableItem[]>(() => initialItems.map((it) => ({ ...it, _uid: uid() })));
  const [openUid, setOpenUid] = useState<string | null>(null);
  const colorPlaceholder = type === "rank" ? "" : "#C8A15A";

  function addItem() {
    const newUid = uid();
    setItems((its) => [...its, { key: "", nombre: "", subtitulo: "", icono: "", color: "", descripcion: "", _uid: newUid }]);
    setOpenUid(newUid);
  }
  function updateItem(uidToUpdate: string, patch: Partial<EscalaItem>) {
    setItems((its) => its.map((it) => (it._uid === uidToUpdate ? { ...it, ...patch } : it)));
  }
  function removeItem(uidToRemove: string) {
    setItems((its) => its.filter((it) => it._uid !== uidToRemove));
    setOpenUid((cur) => (cur === uidToRemove ? null : cur));
  }

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input
        type="hidden"
        name="items"
        value={JSON.stringify(
          items.filter((it) => it.key.trim() && it.nombre.trim()).map(({ _uid, ...rest }) => rest)
        )}
      />

      {items.length === 0 && (
        <p style={{ margin: 0, font: "400 12px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
          Sin niveles propios todavía — tocá "Agregar nivel" para armar tu escala.
        </p>
      )}

      {items.map((item) => (
        <AccordionRow
          key={item._uid}
          open={openUid === item._uid}
          onToggle={() => setOpenUid((cur) => (cur === item._uid ? null : item._uid))}
          leading={
            type !== "rank" ? (
              <span style={{ flex: "none", width: 22, height: 22, borderRadius: 999, background: item.color || "#353534", border: "1px solid rgba(255,255,255,.15)" }} />
            ) : (
              <span className="material-symbols-outlined" style={{ flex: "none", fontSize: 19, color: "#C8A15A" }}>
                {item.icono || "military_tech"}
              </span>
            )
          }
          title={item.nombre || "(sin nombre)"}
          subtitle={item.key ? `clave: ${item.key}` : "sin clave"}
          trailing={
            <button
              type="button"
              onClick={() => removeItem(item._uid)}
              aria-label="Quitar"
              style={{ flex: "none", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", border: "none", borderRadius: 8, background: "rgba(229,146,138,.12)", color: "#e5928a", cursor: "pointer" }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>close</span>
            </button>
          }
        >
          <div style={{ display: "flex", gap: 8 }}>
            <input
              placeholder="Clave (ej. bronce)"
              value={item.key}
              onChange={(e) => updateItem(item._uid, { key: e.target.value })}
              style={{ ...FIELD, flex: 1, minWidth: 0, color: "#E5C378", font: "600 12px 'Plus Jakarta Sans',sans-serif" }}
            />
            <input
              placeholder="Nombre (ej. Bronce)"
              value={item.nombre}
              onChange={(e) => updateItem(item._uid, { nombre: e.target.value })}
              style={{ ...FIELD, flex: 1, minWidth: 0 }}
            />
          </div>
          <input
            placeholder="Subtítulo (ej. Honor)"
            value={item.subtitulo}
            onChange={(e) => updateItem(item._uid, { subtitulo: e.target.value })}
            style={{ ...FIELD, color: "#C2BEB5" }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            {type !== "rank" && (
              <label style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>Color</span>
                <input
                  placeholder={colorPlaceholder}
                  value={item.color}
                  onChange={(e) => updateItem(item._uid, { color: e.target.value })}
                  style={{ ...FIELD, width: "100%", color: "#C2BEB5" }}
                />
              </label>
            )}
            <label style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>Ícono (Material Symbols)</span>
              <input
                placeholder="military_tech"
                value={item.icono}
                onChange={(e) => updateItem(item._uid, { icono: e.target.value })}
                style={{ ...FIELD, width: "100%", color: "#C2BEB5" }}
              />
            </label>
          </div>
          <textarea
            placeholder="Descripción (aparece al tocar el distintivo en la tarjeta)"
            value={item.descripcion}
            onChange={(e) => updateItem(item._uid, { descripcion: e.target.value })}
            rows={2}
            style={{ ...FIELD, color: "#C2BEB5", resize: "vertical" }}
          />
        </AccordionRow>
      ))}

      <button
        type="button"
        onClick={addItem}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: 12, border: "1px dashed rgba(200,161,90,.4)", borderRadius: 12, background: "none", color: "#C8A15A", font: "700 11px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", cursor: "pointer" }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
        Agregar nivel
      </button>

      <button
        type="submit"
        style={{ padding: 13, border: "none", borderRadius: 10, background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)", color: "#0D0D0D", font: "700 11px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", cursor: "pointer" }}
      >
        Guardar Escala
      </button>
    </form>
  );
}
