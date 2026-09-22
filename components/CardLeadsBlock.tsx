"use client";

import { useEffect, useState } from "react";
import {
  listLeadsAction,
  createLeadManualAction,
  setLeadStageAction,
  updateLeadNotesAction,
} from "@/app/c/[slug]/oficina/leads-actions";
import { LEAD_STAGES, LEAD_STAGE_LABEL, LEAD_STAGE_COLOR, LEAD_SOURCE_LABEL, type LeadStage, type LeadSource } from "@/lib/leads";

export type CardLeadSummary = {
  id: string;
  name: string;
  contact: string;
  source: string;
  stage: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

function sourceLabel(source: string): string {
  return LEAD_SOURCE_LABEL[source as LeadSource] ?? source;
}
function stageLabel(stage: string): string {
  return LEAD_STAGE_LABEL[stage as LeadStage] ?? stage;
}
function stageColor(stage: string): string {
  return LEAD_STAGE_COLOR[stage as LeadStage] ?? "#5A5A5A";
}

// "Seguimiento" — pedido explícito de Gunnar (2026-09-23): a quién le
// compartiste esta Card puntual y qué pasó después. Se llena solo desde
// 4 puntos reales de la app (ver lib/leads.ts#upsertLead); acá el dueño
// solo mira, mueve el estado a mano, agrega notas, o suma un contacto
// que conoció por fuera de la app. Estrictamente de ESTA Card — nunca
// mezclado con las otras 2 del mismo dueño.
export default function CardLeadsBlock({ cardId, initialLeads }: { cardId: string; initialLeads: CardLeadSummary[] }) {
  const [leads, setLeads] = useState(initialLeads);
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  // Mismo fix que VoiceNotesBlock (2026-09-23): este bloque también vive
  // detrás de un desmontaje al cerrar/abrir el superpoder — siempre trae
  // el estado real de la DB al montar, nunca confía en `initialLeads`.
  useEffect(() => {
    listLeadsAction(cardId)
      .then((fresh) => setLeads(fresh))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openLead = openLeadId ? leads.find((l) => l.id === openLeadId) ?? null : null;

  useEffect(() => {
    setNotesDraft(openLead?.notes ?? "");
  }, [openLead?.id, openLead?.notes]);

  async function handleStageChange(leadId: string, stage: LeadStage) {
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, stage } : l)));
    await setLeadStageAction(cardId, leadId, stage);
  }

  async function handleSaveNotes(leadId: string) {
    setSavingNotes(true);
    try {
      await updateLeadNotesAction(cardId, leadId, notesDraft);
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, notes: notesDraft.trim() || null } : l)));
    } finally {
      setSavingNotes(false);
    }
  }

  async function handleCreateManual(formData: FormData) {
    const result = await createLeadManualAction(cardId, formData);
    if (result.ok) {
      const fresh = await listLeadsAction(cardId);
      setLeads(fresh);
      setAdding(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ font: "600 8.5px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".16em", textTransform: "uppercase", color: "#756c5e" }}>
          Seguimiento{leads.length > 0 ? ` (${leads.length})` : ""}
        </span>
        <button
          type="button"
          onClick={() => setAdding(true)}
          style={{
            background: "none", border: "none", padding: 0, cursor: "pointer",
            font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".04em", color: "#C8A15A",
          }}
        >
          + Agregar a mano
        </button>
      </div>

      {leads.length === 0 ? (
        <p style={{ margin: 0, font: "400 11px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
          Todavía no compartiste esta tarjeta con nadie — cuando alguien la reciba o te escriba, aparece acá.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {leads.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setOpenLeadId(l.id)}
              style={{
                textAlign: "left", border: "1px solid rgba(200,161,90,.16)", background: "rgba(255,255,255,.02)",
                borderRadius: 12, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: 999, background: stageColor(l.stage), flex: "none" }} />
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                <span style={{ font: "700 12px 'Plus Jakarta Sans',sans-serif", color: "#F5F2EB", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {l.name || l.contact}
                </span>
                <span style={{ font: "400 10px 'Plus Jakarta Sans',sans-serif", color: "#756c5e" }}>{sourceLabel(l.source)}</span>
              </span>
              <span style={{ font: "600 9.5px 'Plus Jakarta Sans',sans-serif", color: stageColor(l.stage), flex: "none" }}>{stageLabel(l.stage)}</span>
            </button>
          ))}
        </div>
      )}

      {openLead && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 26 }}>
          <div onClick={() => setOpenLeadId(null)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.72)" }} />
          <div
            style={{
              position: "relative", width: "100%", maxWidth: 380, background: "#1c1b1b", border: "1px solid rgba(200,161,90,.35)",
              borderRadius: 18, padding: 20, display: "flex", flexDirection: "column", gap: 13, boxShadow: "0 24px 70px rgba(0,0,0,.65)",
              maxHeight: "80vh", overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                <span style={{ font: "700 8.5px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".14em", textTransform: "uppercase", color: "#E5C378" }}>
                  {sourceLabel(openLead.source)}
                </span>
                <span style={{ font: "600 16px 'Playfair Display',serif", color: "#F5F2EB" }}>{openLead.name || openLead.contact}</span>
                {openLead.name && <span style={{ font: "400 11px 'Plus Jakarta Sans',sans-serif", color: "#8a8378" }}>{openLead.contact}</span>}
              </div>
              <button
                type="button"
                onClick={() => setOpenLeadId(null)}
                aria-label="Cerrar"
                style={{ flex: "none", width: 26, height: 26, border: "none", borderRadius: 8, background: "rgba(255,255,255,.06)", color: "#C2BEB5", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ font: "700 9px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "#5A5A5A" }}>Estado</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {LEAD_STAGES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleStageChange(openLead.id, s)}
                    style={{
                      padding: "6px 10px", borderRadius: 999, cursor: "pointer",
                      border: `1px solid ${openLead.stage === s ? LEAD_STAGE_COLOR[s] : "rgba(255,255,255,.12)"}`,
                      background: openLead.stage === s ? `${LEAD_STAGE_COLOR[s]}22` : "transparent",
                      color: openLead.stage === s ? LEAD_STAGE_COLOR[s] : "#8a8378",
                      font: "600 10px 'Plus Jakarta Sans',sans-serif",
                    }}
                  >
                    {LEAD_STAGE_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ font: "700 9px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "#5A5A5A" }}>Notas</span>
              <textarea
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                placeholder="Anotá acá el seguimiento — qué hablaron, qué falta, etc."
                rows={4}
                style={{
                  resize: "vertical", borderRadius: 10, border: "1px solid rgba(200,161,90,.25)", background: "rgba(255,255,255,.03)",
                  color: "#F5F2EB", padding: "8px 10px", font: "400 12px/1.5 'Plus Jakarta Sans',sans-serif",
                }}
              />
              <button
                type="button"
                onClick={() => handleSaveNotes(openLead.id)}
                disabled={savingNotes}
                style={{
                  alignSelf: "flex-end", padding: "7px 14px", borderRadius: 999, border: "none", cursor: savingNotes ? "default" : "pointer",
                  background: "rgba(200,161,90,.18)", color: "#E5C378", font: "700 10.5px 'Plus Jakarta Sans',sans-serif",
                }}
              >
                {savingNotes ? "Guardando…" : "Guardar nota"}
              </button>
            </div>
          </div>
        </div>
      )}

      {adding && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 26 }}>
          <div onClick={() => setAdding(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.72)" }} />
          <form
            action={handleCreateManual}
            style={{
              position: "relative", width: "100%", maxWidth: 340, background: "#1c1b1b", border: "1px solid rgba(200,161,90,.35)",
              borderRadius: 18, padding: 20, display: "flex", flexDirection: "column", gap: 12, boxShadow: "0 24px 70px rgba(0,0,0,.65)",
            }}
          >
            <span style={{ font: "600 15px 'Playfair Display',serif", color: "#F5F2EB" }}>Agregar contacto a mano</span>
            <input
              name="name"
              placeholder="Nombre"
              style={{ borderRadius: 10, border: "1px solid rgba(200,161,90,.25)", background: "rgba(255,255,255,.03)", color: "#F5F2EB", padding: "9px 11px", font: "400 12.5px 'Plus Jakarta Sans',sans-serif" }}
            />
            <input
              name="contact"
              placeholder="Email o WhatsApp"
              required
              style={{ borderRadius: 10, border: "1px solid rgba(200,161,90,.25)", background: "rgba(255,255,255,.03)", color: "#F5F2EB", padding: "9px 11px", font: "400 12.5px 'Plus Jakarta Sans',sans-serif" }}
            />
            <textarea
              name="notes"
              placeholder="Notas (opcional)"
              rows={3}
              style={{ resize: "vertical", borderRadius: 10, border: "1px solid rgba(200,161,90,.25)", background: "rgba(255,255,255,.03)", color: "#F5F2EB", padding: "9px 11px", font: "400 12.5px/1.5 'Plus Jakarta Sans',sans-serif" }}
            />
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
