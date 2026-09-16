"use client";

import { useState } from "react";
import type { EscalaItem } from "@/lib/escalas";

// Client-side array editor for a Program's Medallón/Sabiduría/Contactos
// scale (PLAN.md Fase 9.4/9.5, + Fase Contactos 2026-09-16) — same shape
// as officeItems in MemberCardEditor: local state, one hidden JSON input,
// one save action for the whole list. Color e Ícono se editan siempre los
// dos, para cualquier tipo de escala — antes solo uno era editable según
// `type`, dejando el ícono de Medallón/Contactos fijo en el badge.
export default function EscalaEditor({
  type,
  initialItems,
  action,
}: {
  type: "medal" | "rank" | "contacts";
  initialItems: EscalaItem[];
  action: (formData: FormData) => Promise<void>;
}) {
  const [items, setItems] = useState<EscalaItem[]>(initialItems);
  const colorPlaceholder = type === "rank" ? "" : "#C8A15A";

  function addItem() {
    setItems((its) => [...its, { key: "", nombre: "", subtitulo: "", icono: "", color: "", descripcion: "" }]);
  }
  function updateItem(i: number, patch: Partial<EscalaItem>) {
    setItems((its) => its.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function removeItem(i: number) {
    setItems((its) => its.filter((_, idx) => idx !== i));
  }

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input type="hidden" name="items" value={JSON.stringify(items.filter((it) => it.key.trim() && it.nombre.trim()))} />

      {items.map((item, i) => (
        <div key={i} style={{ background: "#151414", borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              placeholder="Clave (ej. bronce)"
              value={item.key}
              onChange={(e) => updateItem(i, { key: e.target.value })}
              style={{ flex: 1, minWidth: 0, background: "#0D0D0D", border: "1px solid rgba(200,161,90,.25)", borderRadius: 8, padding: "8px 11px", color: "#E5C378", font: "600 12px 'Plus Jakarta Sans',sans-serif", outline: "none" }}
            />
            <button
              type="button"
              onClick={() => removeItem(i)}
              aria-label="Quitar"
              style={{ flex: "none", width: 34, height: 34, border: "none", borderRadius: 8, background: "rgba(229,146,138,.15)", color: "#e5928a", cursor: "pointer" }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 17, display: "block" }}>close</span>
            </button>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              placeholder="Nombre (ej. Bronce)"
              value={item.nombre}
              onChange={(e) => updateItem(i, { nombre: e.target.value })}
              style={{ flex: 1, minWidth: 0, background: "#0D0D0D", border: "1px solid rgba(200,161,90,.25)", borderRadius: 8, padding: "8px 11px", color: "#F5F2EB", font: "400 12px 'Plus Jakarta Sans',sans-serif", outline: "none" }}
            />
            <input
              placeholder="Subtítulo (ej. Honor)"
              value={item.subtitulo}
              onChange={(e) => updateItem(i, { subtitulo: e.target.value })}
              style={{ flex: 1, minWidth: 0, background: "#0D0D0D", border: "1px solid rgba(200,161,90,.25)", borderRadius: 8, padding: "8px 11px", color: "#C2BEB5", font: "400 12px 'Plus Jakarta Sans',sans-serif", outline: "none" }}
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {type !== "rank" && (
              <label style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>Color</span>
                <input
                  placeholder={colorPlaceholder}
                  value={item.color}
                  onChange={(e) => updateItem(i, { color: e.target.value })}
                  style={{ background: "#0D0D0D", border: "1px solid rgba(200,161,90,.25)", borderRadius: 8, padding: "8px 11px", color: "#C2BEB5", font: "400 12px 'Plus Jakarta Sans',sans-serif", outline: "none" }}
                />
              </label>
            )}
            <label style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>Ícono (Material Symbols)</span>
              <input
                placeholder="military_tech"
                value={item.icono}
                onChange={(e) => updateItem(i, { icono: e.target.value })}
                style={{ background: "#0D0D0D", border: "1px solid rgba(200,161,90,.25)", borderRadius: 8, padding: "8px 11px", color: "#C2BEB5", font: "400 12px 'Plus Jakarta Sans',sans-serif", outline: "none" }}
              />
            </label>
          </div>
          <textarea
            placeholder="Descripción (aparece al tocar el distintivo en la tarjeta)"
            value={item.descripcion}
            onChange={(e) => updateItem(i, { descripcion: e.target.value })}
            rows={2}
            style={{ background: "#0D0D0D", border: "1px solid rgba(200,161,90,.25)", borderRadius: 8, padding: "8px 11px", color: "#C2BEB5", font: "400 12px 'Plus Jakarta Sans',sans-serif", outline: "none", resize: "vertical" }}
          />
        </div>
      ))}

      <button
        type="button"
        onClick={addItem}
        style={{ padding: 11, border: "1px dashed rgba(200,161,90,.4)", borderRadius: 10, background: "none", color: "#C8A15A", font: "700 11px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", cursor: "pointer" }}
      >
        + Agregar nivel
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
