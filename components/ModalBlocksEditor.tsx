"use client";

import { useState } from "react";
import type { ModalBlock, ModalBlockKind } from "@/lib/modalBlocks";
import { MODAL_BLOCK_KINDS, MODAL_BLOCK_LABELS, parseModalBlocks } from "@/lib/modalBlocks";
import { AccordionRow, AccordionAddRow } from "@/components/Accordion";

type EditableBlock = ModalBlock & { _uid: string };

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
  width: "100%",
};

const BLOCK_ICON: Record<ModalBlockKind, string> = {
  texto: "notes",
  imagen: "image",
  video_audio: "movie",
  archivo_link: "attach_file",
  kpi: "insights",
};

// Editor de Modales (2026-10-04, pedido de Gunnar: "podamos crear un
// editor de modales.. no solo el contenido sino tambien los
// elementos.. como el editor de un formulario"). Array de ModalBlock
// editado a mano (un hidden input con el JSON completo), mismo patrón
// que VaultSourcesEditor/EscalaEditor -- sin <form> propio, se embebe
// dentro del form del modal que lo use (hoy, Bóveda Legacy).
// Reordenar es con flechas arriba/abajo (decisión explícita de
// Gunnar, no drag&drop -- más simple y confiable en mobile).
export default function ModalBlocksEditor({
  name,
  initialBlocks,
  templates,
}: {
  name: string;
  initialBlocks: ModalBlock[];
  // Librería "elegir o armar" (2026-10-07, Fase 2) -- opcional: sin
  // templates cargados en /admin/slot-templates, la sección "Elegir"
  // simplemente no se muestra.
  templates?: { id: string; nombre: string; descripcion: string; payload: unknown }[];
}) {
  const [items, setItems] = useState<EditableBlock[]>(() => initialBlocks.map((b) => ({ ...b, _uid: uid() })));
  const [openUid, setOpenUid] = useState<string | null>(null);

  // "Elegir de la librería" -- reemplaza TODOS los bloques por los del
  // template elegido, mismo criterio "reemplaza, no suma". No hay
  // submit propio acá (este editor vive embebido en el <form> del modal
  // que lo use) -- el N0 todavía tiene que tocar "Guardar" afuera.
  function applyTemplate(payload: unknown) {
    const parsed = parseModalBlocks(payload);
    setItems(parsed.map((b) => ({ ...b, _uid: uid() })));
    setOpenUid(null);
  }

  function addItem() {
    const newUid = uid();
    setItems((its) => [...its, { id: uid(), kind: "texto", heading: "", body: "", mediaUrl: "", mediaType: "video", linkLabel: "", kpiValue: "", kpiSub: "", _uid: newUid }]);
    setOpenUid(newUid);
  }
  function updateItem(uidToUpdate: string, patch: Partial<ModalBlock>) {
    setItems((its) => its.map((it) => (it._uid === uidToUpdate ? { ...it, ...patch } : it)));
  }
  function removeItem(uidToRemove: string) {
    setItems((its) => its.filter((it) => it._uid !== uidToRemove));
    setOpenUid((cur) => (cur === uidToRemove ? null : cur));
  }
  function move(uidToMove: string, dir: -1 | 1) {
    setItems((its) => {
      const idx = its.findIndex((it) => it._uid === uidToMove);
      const target = idx + dir;
      if (idx === -1 || target < 0 || target >= its.length) return its;
      const next = [...its];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <input type="hidden" name={name} value={JSON.stringify(items.map(({ _uid, ...rest }) => rest))} />

      <span style={{ font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", color: "#5A5A5A" }}>
        Contenido (bloques)
      </span>

      {items.length === 0 && (
        <p style={{ margin: 0, font: "400 12px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>Sin bloques todavía -- agregá el primero abajo.</p>
      )}

      {items.map((item, idx) => (
        <AccordionRow
          key={item._uid}
          open={openUid === item._uid}
          onToggle={() => setOpenUid((cur) => (cur === item._uid ? null : item._uid))}
          leading={
            <span className="material-symbols-outlined" style={{ flex: "none", fontSize: 18, color: "#C8A15A" }}>
              {BLOCK_ICON[item.kind]}
            </span>
          }
          title={MODAL_BLOCK_LABELS[item.kind]}
          subtitle={item.heading || item.body || item.mediaUrl || item.linkLabel || item.kpiValue || "(sin contenido)"}
          trailing={
            <div style={{ display: "flex", gap: 2 }}>
              <button
                type="button"
                onClick={() => move(item._uid, -1)}
                disabled={idx === 0}
                aria-label="Subir"
                style={{ flex: "none", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", border: "none", borderRadius: 8, background: "none", color: idx === 0 ? "#3a3a3a" : "#8a8378", cursor: idx === 0 ? "default" : "pointer" }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_upward</span>
              </button>
              <button
                type="button"
                onClick={() => move(item._uid, 1)}
                disabled={idx === items.length - 1}
                aria-label="Bajar"
                style={{ flex: "none", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", border: "none", borderRadius: 8, background: "none", color: idx === items.length - 1 ? "#3a3a3a" : "#8a8378", cursor: idx === items.length - 1 ? "default" : "pointer" }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_downward</span>
              </button>
              <button
                type="button"
                onClick={() => removeItem(item._uid)}
                aria-label="Quitar"
                style={{ flex: "none", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", border: "none", borderRadius: 8, background: "rgba(229,146,138,.12)", color: "#e5928a", cursor: "pointer" }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
              </button>
            </div>
          }
        >
          <select value={item.kind} onChange={(e) => updateItem(item._uid, { kind: e.target.value as ModalBlockKind })} style={FIELD}>
            {MODAL_BLOCK_KINDS.map((k) => (
              <option key={k} value={k}>
                {MODAL_BLOCK_LABELS[k]}
              </option>
            ))}
          </select>

          {item.kind === "texto" && (
            <>
              <input placeholder="Título (opcional)" value={item.heading} onChange={(e) => updateItem(item._uid, { heading: e.target.value })} style={FIELD} />
              <textarea placeholder="Texto" value={item.body} onChange={(e) => updateItem(item._uid, { body: e.target.value })} rows={3} style={{ ...FIELD, resize: "vertical" }} />
            </>
          )}

          {item.kind === "imagen" && (
            <>
              <input placeholder="https://... (URL de la imagen)" value={item.mediaUrl} onChange={(e) => updateItem(item._uid, { mediaUrl: e.target.value })} style={FIELD} />
              <input placeholder="Leyenda (opcional)" value={item.body} onChange={(e) => updateItem(item._uid, { body: e.target.value })} style={FIELD} />
            </>
          )}

          {item.kind === "video_audio" && (
            <>
              <div style={{ display: "flex", gap: 8 }}>
                <select value={item.mediaType} onChange={(e) => updateItem(item._uid, { mediaType: e.target.value === "audio" ? "audio" : "video" })} style={{ ...FIELD, flex: "none", width: "auto" }}>
                  <option value="video">Video</option>
                  <option value="audio">Audio</option>
                </select>
                <input placeholder="https://... (YouTube/Vimeo o archivo directo)" value={item.mediaUrl} onChange={(e) => updateItem(item._uid, { mediaUrl: e.target.value })} style={{ ...FIELD, flex: 1 }} />
              </div>
              <input placeholder="Título (opcional)" value={item.heading} onChange={(e) => updateItem(item._uid, { heading: e.target.value })} style={FIELD} />
            </>
          )}

          {item.kind === "archivo_link" && (
            <>
              <input placeholder="https://... (el link o archivo que abre)" value={item.mediaUrl} onChange={(e) => updateItem(item._uid, { mediaUrl: e.target.value })} style={FIELD} />
              <input placeholder="Texto del botón (ej. Abrir mi cuaderno)" value={item.linkLabel} onChange={(e) => updateItem(item._uid, { linkLabel: e.target.value })} style={FIELD} />
            </>
          )}

          {item.kind === "kpi" && (
            <>
              <input placeholder="Etiqueta (ej. Miembros activos)" value={item.heading} onChange={(e) => updateItem(item._uid, { heading: e.target.value })} style={FIELD} />
              <input placeholder="Valor (ej. 128)" value={item.kpiValue} onChange={(e) => updateItem(item._uid, { kpiValue: e.target.value })} style={FIELD} />
              <input placeholder="Aclaración chica (opcional)" value={item.kpiSub} onChange={(e) => updateItem(item._uid, { kpiSub: e.target.value })} style={FIELD} />
            </>
          )}
        </AccordionRow>
      ))}

      <button
        type="button"
        onClick={addItem}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: 10, border: "1px dashed rgba(200,161,90,.4)", borderRadius: 10, background: "none", color: "#C8A15A", font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".06em", textTransform: "uppercase", cursor: "pointer" }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>
        Agregar bloque
      </button>

      {templates && templates.length > 0 && (
        <AccordionAddRow label="Elegir de la librería (reemplaza todos los bloques)">
          <p style={{ margin: 0, font: "400 11px/1.5 'Plus Jakarta Sans',sans-serif", color: "#8a8378" }}>
            Plantillas armadas por MasterN0 en <code>/admin/slot-templates</code>.
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
    </div>
  );
}
