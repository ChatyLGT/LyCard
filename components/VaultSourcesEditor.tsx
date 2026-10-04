"use client";

import { useState } from "react";
import type { VaultSource } from "@/lib/podiumButtons";
import { AccordionRow } from "@/components/Accordion";

type EditableSource = VaultSource & { _uid: string };

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

// Fuentes de la Bóveda Legacy (2026-10-04) -- mismo patrón de array
// editado a mano (un hidden input con el JSON completo) que
// EscalaEditor/OfficeSkillsEditor, pero sin <form> propio: se embebe
// DENTRO del form de Vault en el dashboard (un solo botón "Guardar"
// para título + palabra secreta + cuaderno + fuentes).
export default function VaultSourcesEditor({ initialItems }: { initialItems: VaultSource[] }) {
  const [items, setItems] = useState<EditableSource[]>(() => initialItems.map((it) => ({ ...it, _uid: uid() })));
  const [openUid, setOpenUid] = useState<string | null>(null);

  function addItem() {
    const newUid = uid();
    setItems((its) => [...its, { type: "link", label: "", value: "", _uid: newUid }]);
    setOpenUid(newUid);
  }
  function updateItem(uidToUpdate: string, patch: Partial<VaultSource>) {
    setItems((its) => its.map((it) => (it._uid === uidToUpdate ? { ...it, ...patch } : it)));
  }
  function removeItem(uidToRemove: string) {
    setItems((its) => its.filter((it) => it._uid !== uidToRemove));
    setOpenUid((cur) => (cur === uidToRemove ? null : cur));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <input type="hidden" name="vaultSources" value={JSON.stringify(items.filter((it) => it.value.trim()).map(({ _uid, ...rest }) => rest))} />

      <span style={{ font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", color: "#5A5A5A" }}>
        Fuentes (qué información usamos)
      </span>

      {items.length === 0 && (
        <p style={{ margin: 0, font: "400 12px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>Sin fuentes todavía.</p>
      )}

      {items.map((item) => (
        <AccordionRow
          key={item._uid}
          open={openUid === item._uid}
          onToggle={() => setOpenUid((cur) => (cur === item._uid ? null : item._uid))}
          leading={
            <span className="material-symbols-outlined" style={{ flex: "none", fontSize: 18, color: "#C8A15A" }}>
              {item.type === "link" ? "link" : "notes"}
            </span>
          }
          title={item.label || (item.type === "texto" ? item.value.slice(0, 30) || "(sin nota)" : item.value || "(sin link)")}
          subtitle={item.type === "link" ? "Link" : "Nota"}
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
            <select value={item.type} onChange={(e) => updateItem(item._uid, { type: e.target.value === "texto" ? "texto" : "link" })} style={{ ...FIELD, flex: "none" }}>
              <option value="link">Link</option>
              <option value="texto">Nota de texto</option>
            </select>
            <input
              placeholder="Etiqueta (opcional)"
              value={item.label}
              onChange={(e) => updateItem(item._uid, { label: e.target.value })}
              style={{ ...FIELD, flex: 1, minWidth: 0 }}
            />
          </div>
          {item.type === "link" ? (
            <input
              placeholder="https://..."
              value={item.value}
              onChange={(e) => updateItem(item._uid, { value: e.target.value })}
              style={{ ...FIELD, color: "#C2BEB5" }}
            />
          ) : (
            <textarea
              placeholder="Nota de texto"
              value={item.value}
              onChange={(e) => updateItem(item._uid, { value: e.target.value })}
              rows={2}
              style={{ ...FIELD, color: "#C2BEB5", resize: "vertical" }}
            />
          )}
        </AccordionRow>
      ))}

      <button
        type="button"
        onClick={addItem}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: 10, border: "1px dashed rgba(200,161,90,.4)", borderRadius: 10, background: "none", color: "#C8A15A", font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".06em", textTransform: "uppercase", cursor: "pointer" }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>
        Agregar fuente
      </button>
    </div>
  );
}
