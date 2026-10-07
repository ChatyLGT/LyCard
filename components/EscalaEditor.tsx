"use client";

import { useState } from "react";
import { type EscalaItem, parseEscala, parseImportedEscala } from "@/lib/escalas";
import { AccordionRow, AccordionAddRow } from "@/components/Accordion";

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

// Client-side array editor for a Program's Medallón de Resultados/Imán
// Badge/Badge de Valor scale (PLAN.md Fase 9.4/9.5, + Fase Contactos
// 2026-09-16, renombradas 2026-10-04) — same shape
// as officeItems in MemberCardEditor: local state, one hidden JSON input,
// one save action for the whole list. Each tier collapses into a summary
// row (swatch/ícono + nombre) and opens one at a time to edit — only the
// "+ Agregar nivel" trigger and the tier you're touching are ever expanded
// (2026-09-16, rediseño en acordeón).
export default function EscalaEditor({
  type,
  initialItems,
  templates,
  action,
}: {
  type: "medal" | "rank" | "contacts";
  initialItems: EscalaItem[];
  // Librería "elegir o armar" (2026-10-07) -- plantillas de slotType
  // "escala" que cualquier N0 puede aplicar con un click, en vez de
  // armar la suya desde cero. Opcional: si no llega (callers viejos, o
  // todavía no hay ninguna cargada en /admin/slot-templates), la sección
  // "Elegir" simplemente no se muestra.
  templates?: { id: string; nombre: string; descripcion: string; payload: unknown }[];
  action: (formData: FormData) => Promise<void>;
}) {
  const [items, setItems] = useState<EditableItem[]>(() => initialItems.map((it) => ({ ...it, _uid: uid() })));
  const [openUid, setOpenUid] = useState<string | null>(null);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const colorPlaceholder = "#C8A15A";

  const defaultIcon = type === "medal" ? "military_tech" : type === "rank" ? "hub" : "payments";

  function addItem() {
    const newUid = uid();
    setItems((its) => [...its, { key: "", nombre: "", subtitulo: "", icono: defaultIcon, color: "", descripcion: "", _uid: newUid }]);
    setOpenUid(newUid);
  }
  function updateItem(uidToUpdate: string, patch: Partial<EscalaItem>) {
    setItems((its) => its.map((it) => (it._uid === uidToUpdate ? { ...it, ...patch } : it)));
  }
  function removeItem(uidToRemove: string) {
    setItems((its) => its.filter((it) => it._uid !== uidToRemove));
    setOpenUid((cur) => (cur === uidToRemove ? null : cur));
  }
  // Pegar un bloque JSON (típicamente armado con un LLM, como hizo Gunnar
  // para "Medallón de Resultados"/"Medallón de Imán") reemplaza TODA la
  // escala de una -- más rápido que tipear cada nivel a mano en el
  // acordeón ("hacerlo manual es tardado", 2026-10-04). Reemplaza, no
  // suma: evita niveles duplicados si se pega dos veces por error.
  function runImport() {
    const parsed = parseImportedEscala(importText);
    if (parsed.length === 0) {
      setImportError("No se encontraron niveles válidos en ese JSON -- revisá que sea un array con clave/nombre en cada ítem.");
      return;
    }
    setItems(parsed.map((it) => ({ ...it, _uid: uid() })));
    setImportText("");
    setImportError(null);
    setOpenUid(null);
  }

  // "Elegir de la librería" (2026-10-07) -- mismo reemplazo que
  // runImport(), pero el JSON no lo pega el N0, lo elige de una
  // plantilla ya armada (ver /admin/slot-templates). parseEscala
  // sanitiza el payload (unknown, viene de Json de Prisma) igual que
  // cuando se carga medalScale/rankScale/contactsScale desde la DB.
  function applyTemplate(payload: unknown) {
    const parsed = parseEscala(payload);
    setItems(parsed.map((it) => ({ ...it, _uid: uid() })));
    setOpenUid(null);
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
          Sin niveles propios todavía — tocá &quot;Agregar nivel&quot; para armar tu escala.
        </p>
      )}

      {items.map((item) => (
        <AccordionRow
          key={item._uid}
          open={openUid === item._uid}
          onToggle={() => setOpenUid((cur) => (cur === item._uid ? null : item._uid))}
          leading={
            // Círculo de color + ícono adentro, siempre los dos juntos
            // (2026-10-04, pedido de Gunnar: "necesito en la tarjeta
            // ademas de verse el circulo de color se vea el icono..
            // esto en el dashboard"). Antes era color XOR ícono según
            // `type` -- ahora los 3 tipos (incluido Sabiduría/Imán, que
            // antes no tenía color en absoluto) se ven igual. El title
            // nativo muestra la descripción al pasar el mouse por
            // arriba, sin armar un tooltip propio.
            <span
              title={item.descripcion || undefined}
              style={{
                flex: "none",
                width: 26,
                height: 26,
                borderRadius: 999,
                background: item.color || "#353534",
                border: "1px solid rgba(255,255,255,.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 15, color: "#141414" }}>
                {item.icono || "military_tech"}
              </span>
            </span>
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
            <label style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>Color</span>
              <input
                placeholder={colorPlaceholder}
                value={item.color}
                onChange={(e) => updateItem(item._uid, { color: e.target.value })}
                style={{ ...FIELD, width: "100%", color: "#C2BEB5" }}
              />
            </label>
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

      {templates && templates.length > 0 && (
        <AccordionAddRow label="Elegir de la librería (reemplaza toda la escala)">
          <p style={{ margin: 0, font: "400 11px/1.5 'Plus Jakarta Sans',sans-serif", color: "#8a8378" }}>
            Plantillas armadas por MasterN0 en <code>/admin/slot-templates</code> -- un click reemplaza todos los
            niveles de acá abajo, igual que pegar un JSON a mano.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => applyTemplate(tpl.payload)}
                style={{ textAlign: "left", padding: "10px 12px", border: "1px solid rgba(200,161,90,.25)", borderRadius: 8, background: "rgba(200,161,90,.06)", cursor: "pointer" }}
              >
                <span style={{ display: "block", font: "700 12px 'Plus Jakarta Sans',sans-serif", color: "#E5C378" }}>{tpl.nombre}</span>
                {tpl.descripcion && (
                  <span style={{ display: "block", font: "400 11px/1.4 'Plus Jakarta Sans',sans-serif", color: "#8a8378" }}>{tpl.descripcion}</span>
                )}
              </button>
            ))}
          </div>
        </AccordionAddRow>
      )}

      <AccordionAddRow label="Importar JSON (reemplaza toda la escala)">
        <p style={{ margin: 0, font: "400 11px/1.5 'Plus Jakarta Sans',sans-serif", color: "#8a8378" }}>
          Pegá un array con clave/nombre/subtítulo/color/ícono/descripción por nivel (podés usar tildes -- Clave,
          Nombre, Subtítulo, Color, Ícono, Descripción -- o el shape sin tildes). Reemplaza todos los niveles de
          acá abajo.
        </p>
        <textarea
          placeholder='[{"clave":"bronce","nombre":"Bronce","subtitulo":"Honor","color":"#C8A15A","icono":"military_tech","descripcion":"..."}]'
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          rows={5}
          style={{ ...FIELD, color: "#C2BEB5", resize: "vertical", fontFamily: "monospace" }}
        />
        {importError && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>{importError}</p>}
        <button
          type="button"
          onClick={runImport}
          style={{ padding: 11, border: "none", borderRadius: 8, background: "rgba(200,161,90,.18)", color: "#E5C378", font: "700 11px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", cursor: "pointer" }}
        >
          Importar y reemplazar
        </button>
      </AccordionAddRow>

      <button
        type="submit"
        style={{ padding: 13, border: "none", borderRadius: 10, background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)", color: "#0D0D0D", font: "700 11px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", cursor: "pointer" }}
      >
        Guardar Escala
      </button>
    </form>
  );
}
