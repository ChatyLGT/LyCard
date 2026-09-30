"use client";

import { useState, type CSSProperties } from "react";
import type { Consulta } from "@/generated/prisma/client";

const PANEL: CSSProperties = { padding: 12, borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(200,161,90,.16)", display: "flex", flexDirection: "column", gap: 8 };
const TEXTAREA: CSSProperties = { background: "#0D0D0D", border: "1px solid rgba(200,161,90,.25)", borderRadius: 8, padding: "8px 11px", color: "#F5F2EB", font: "400 12px 'Plus Jakarta Sans',sans-serif", outline: "none", resize: "vertical" };
const SAVE_BTN: CSSProperties = { padding: 9, border: "none", borderRadius: 8, background: "#353534", color: "#F5F2EB", font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".06em", textTransform: "uppercase", cursor: "pointer" };

// Inbox "preguntas que tu gemelo no supo responder" -- solo consultas
// con respuesta null (ver lib/expertos.ts#matchCodiceEntry, que dejó a
// estas sin match). Responder + tildar "aprobar" las suma al Códice
// real de esta persona (Consulta → CodiceEntry, ver experto-actions.ts).
export default function ExpertoInboxBlock({
  pending,
  answerAction,
}: {
  pending: Consulta[];
  answerAction: (consultaId: string, formData: FormData) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(pending[0]?.id ?? null);

  if (pending.length === 0) {
    return <p style={{ margin: 0, font: "400 12px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>Sin preguntas pendientes -- tu Gemelo Digital respondió todo lo que le preguntaron hasta ahora.</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {pending.map((c) => (
        <div key={c.id} style={PANEL}>
          <button type="button" onClick={() => setOpenId(openId === c.id ? null : c.id)} style={{ background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer" }}>
            <p style={{ margin: 0, font: "700 12.5px/1.5 'Plus Jakarta Sans',sans-serif", color: "#F5F2EB" }}>{c.pregunta}</p>
          </button>
          {openId === c.id && (
            <form action={answerAction.bind(null, c.id)} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <textarea name="respuesta" placeholder="Tu respuesta" rows={3} required style={TEXTAREA} />
              <label style={{ display: "flex", alignItems: "center", gap: 8, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>
                <input type="checkbox" name="aprobar" />
                Sumar esta respuesta a mi Códice (tu Gemelo Digital la va a poder reusar en preguntas parecidas)
              </label>
              <button type="submit" style={SAVE_BTN}>Responder</button>
            </form>
          )}
        </div>
      ))}
    </div>
  );
}
