"use client";

import { useEffect, useState } from "react";
import { listTagsAction, createTagAction, deleteTagAction } from "@/app/c/[slug]/oficina/tags-actions";
import { TAG_POLARITIES, TAG_POLARITY_LABEL, TAG_CATEGORY_SUGGESTIONS, type TagPolarity, type TagSummary } from "@/lib/tags";

const kicker = {
  font: "600 8.5px 'Plus Jakarta Sans',sans-serif" as const,
  letterSpacing: ".16em",
  textTransform: "uppercase" as const,
  color: "#756c5e",
};

function chipStyle(polarity: TagPolarity, accent: string) {
  return {
    display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 999,
    border: `1px solid ${polarity === "ofrezco" ? "rgba(111,207,122,.4)" : `${accent}55`}`,
    background: polarity === "ofrezco" ? "rgba(111,207,122,.1)" : `${accent}18`,
    color: polarity === "ofrezco" ? "#6FCF7A" : accent,
    font: "600 11px 'Plus Jakarta Sans',sans-serif",
  };
}

function TagGroup({
  polarity,
  items,
  accent,
  editable,
  onDelete,
}: {
  polarity: TagPolarity;
  items: TagSummary[];
  accent: string;
  editable: boolean;
  onDelete: (tagId: string) => void;
}) {
  if (items.length === 0 && !editable) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ ...kicker, fontSize: 7.5 }}>{TAG_POLARITY_LABEL[polarity]}</span>
      {items.length === 0 ? (
        <span style={{ font: "400 10.5px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>Todavía nada acá.</span>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {items.map((t) => (
            <span key={t.id} style={chipStyle(t.polarity, accent)}>
              {t.text}
              {editable && (
                <button
                  type="button"
                  onClick={() => onDelete(t.id)}
                  aria-label={`Borrar ${t.text}`}
                  style={{ background: "none", border: "none", padding: 0, margin: 0, cursor: "pointer", color: "inherit", font: "700 11px sans-serif", lineHeight: 1, opacity: 0.7 }}
                >
                  ✕
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// Janus (pedido de Gunnar, 2026-09-23) — "todos contra todos": cualquier
// Card marca lo que OFRECE y lo que BUSCA, texto libre. A diferencia de
// Seguimiento/KPIs esto es a propósito público (editable=false para un
// visitante, solo lectura) — el punto entero es que se pueda descubrir,
// desde una certificación industrial real hasta "tengo un sandwich de
// miga". lib/janus.ts cruza estos tags entre TODAS las Cards de la
// plataforma, no solo dentro de un Programa.
export default function TagsBlock({ cardId, initialTags, accent, editable }: { cardId: string; initialTags: TagSummary[]; accent: string; editable: boolean }) {
  const [tags, setTags] = useState(initialTags);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    listTagsAction(cardId)
      .then((fresh) => setTags(fresh))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ofrezco = tags.filter((t) => t.polarity === "ofrezco");
  const busco = tags.filter((t) => t.polarity === "busco");

  async function handleCreate(formData: FormData) {
    const result = await createTagAction(cardId, formData);
    if (result.ok) {
      const fresh = await listTagsAction(cardId);
      setTags(fresh);
      setAdding(false);
    }
  }

  async function handleDelete(tagId: string) {
    setTags((prev) => prev.filter((t) => t.id !== tagId));
    await deleteTagAction(cardId, tagId);
  }

  if (!editable && tags.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={kicker}>Ofrezco / Busco{tags.length > 0 ? ` (${tags.length})` : ""}</span>
        {editable && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".04em", color: accent }}
          >
            + Agregar
          </button>
        )}
      </div>

      <TagGroup polarity="ofrezco" items={ofrezco} accent={accent} editable={editable} onDelete={handleDelete} />
      <TagGroup polarity="busco" items={busco} accent={accent} editable={editable} onDelete={handleDelete} />

      {editable && (
        <p style={{ margin: 0, font: "400 9.5px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
          Esto lo ve cualquiera que visite tu Oficina — es lo que te conecta con el resto de la red.
        </p>
      )}

      {adding && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 26 }}>
          <div onClick={() => setAdding(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.72)" }} />
          <form
            action={handleCreate}
            style={{
              position: "relative", width: "100%", maxWidth: 340, background: "#1c1b1b", border: "1px solid rgba(200,161,90,.35)",
              borderRadius: 18, padding: 20, display: "flex", flexDirection: "column", gap: 12, boxShadow: "0 24px 70px rgba(0,0,0,.65)",
            }}
          >
            <span style={{ font: "600 15px 'Playfair Display',serif", color: "#F5F2EB" }}>Agregar tag</span>

            <div style={{ display: "flex", gap: 8 }}>
              {TAG_POLARITIES.map((p) => (
                <label key={p} style={{ display: "flex", alignItems: "center", gap: 5, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5", cursor: "pointer" }}>
                  <input type="radio" name="polarity" value={p} defaultChecked={p === "ofrezco"} />
                  {TAG_POLARITY_LABEL[p]}
                </label>
              ))}
            </div>

            <input
              name="text"
              placeholder="Ej: sandwich de miga, certificación ISO 9001..."
              required
              autoFocus
              style={{ borderRadius: 10, border: "1px solid rgba(200,161,90,.25)", background: "rgba(255,255,255,.03)", color: "#F5F2EB", padding: "9px 11px", font: "400 12.5px 'Plus Jakarta Sans',sans-serif" }}
            />

            <input
              name="category"
              placeholder="Categoría (opcional)"
              list="tag-category-suggestions"
              style={{ borderRadius: 10, border: "1px solid rgba(200,161,90,.25)", background: "rgba(255,255,255,.03)", color: "#F5F2EB", padding: "9px 11px", font: "400 12.5px 'Plus Jakarta Sans',sans-serif" }}
            />
            <datalist id="tag-category-suggestions">
              {TAG_CATEGORY_SUGGESTIONS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setAdding(false)}
                style={{ padding: "8px 14px", borderRadius: 999, border: "none", background: "rgba(255,255,255,.06)", color: "#C2BEB5", cursor: "pointer", font: "700 10.5px 'Plus Jakarta Sans',sans-serif" }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                style={{ padding: "8px 14px", borderRadius: 999, border: "none", background: "rgba(200,161,90,.18)", color: "#E5C378", cursor: "pointer", font: "700 10.5px 'Plus Jakarta Sans',sans-serif" }}
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
