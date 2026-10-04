"use client";

import { useState, useTransition } from "react";
import type { PodiumButtonConfig, PodiumButtonKind } from "@/lib/podiumButtons";
import { generatePodiumAiButtonAction } from "@/app/admin/programs/ai-agent-actions";

const KIND_LABEL: Record<PodiumButtonKind, string> = {
  info: "Info (el modal Info de siempre)",
  story: "Modal simple (el que antes abría \"Mi camino\")",
  invite: "Enviar Invitación Especial",
  vault: "Bóveda Legacy",
  ai_agent: "Agente de IA (funcionalidad a medida)",
};

const SELECT: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  background: "#0D0D0D",
  border: "1px solid rgba(200,161,90,.25)",
  borderRadius: 8,
  padding: "8px 11px",
  color: "#F5F2EB",
  font: "400 12px 'Plus Jakarta Sans',sans-serif",
  outline: "none",
};

const FIELD: React.CSSProperties = { ...SELECT, flex: "none", width: "100%" };

const SAVE_BTN: React.CSSProperties = {
  flex: "none",
  padding: "8px 14px",
  border: "none",
  borderRadius: 8,
  background: "#353534",
  color: "#F5F2EB",
  font: "700 10px 'Plus Jakarta Sans',sans-serif",
  letterSpacing: ".06em",
  textTransform: "uppercase",
  cursor: "pointer",
};

// Un slot del podio (izquierda o derecha) dentro de "Botones del Podio"
// (2026-10-04, pedido de Gunnar: "poder elegir desde el dashboard de
// cada programa los Botones que ibamos a colocar abajo"). El centro
// (QR) no entra acá -- queda siempre fijo, por decisión explícita.
export default function PodiumSlotEditor({
  programId,
  slot,
  current,
  setKindAction,
}: {
  programId: string;
  slot: "left" | "right";
  current: PodiumButtonConfig | null;
  setKindAction: (formData: FormData) => Promise<void>;
}) {
  const kind = current?.kind ?? "info";
  const [prompt, setPrompt] = useState(current?.aiPrompt ?? "");
  const [pending, startPending] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [justGenerated, setJustGenerated] = useState(false);

  function generate() {
    setError(null);
    setJustGenerated(false);
    if (!prompt.trim()) {
      setError("Describí qué querés que haga este botón.");
      return;
    }
    startPending(async () => {
      const res = await generatePodiumAiButtonAction(programId, slot, prompt);
      if (res.ok) {
        setJustGenerated(true);
      } else if (res.error === "not_configured") {
        setError("Falta configurar la clave de la IA (ANTHROPIC_API_KEY) -- avisale a Gunnar/Claude Code para activarla.");
      } else if (res.error === "empty_prompt") {
        setError("Describí qué querés que haga este botón.");
      } else if (res.error === "forbidden") {
        setError("No tenés permiso para editar este Programa.");
      } else {
        setError("No se pudo generar -- probá de nuevo en un momento.");
      }
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <form action={setKindAction} style={{ display: "flex", gap: 8 }}>
        <select name="kind" defaultValue={kind} style={SELECT}>
          {Object.entries(KIND_LABEL).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
        <button type="submit" style={SAVE_BTN}>
          Guardar Botón
        </button>
      </form>

      {kind === "ai_agent" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, borderRadius: 10, background: "#151414" }}>
          {current?.aiTitle && (
            <p style={{ margin: 0, font: "400 11px/1.5 'Plus Jakarta Sans',sans-serif", color: "#8a8378" }}>
              Último generado: <strong style={{ color: "#E5C378" }}>{current.aiTitle}</strong> (<code>{current.aiIcon}</code>) — {current.aiBody}
            </p>
          )}
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder='Describí qué querés que haga este botón (ej. "una calculadora de interés compuesto para mostrarle a los invitados el crecimiento de su aporte")'
            style={{ ...FIELD, resize: "vertical" }}
          />
          {error && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>{error}</p>}
          {justGenerated && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Generado y guardado.</p>}
          <button
            type="button"
            onClick={generate}
            disabled={pending}
            style={{
              padding: 11,
              border: "none",
              borderRadius: 8,
              background: pending ? "rgba(200,161,90,.3)" : "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)",
              color: "#0D0D0D",
              font: "700 11px 'Plus Jakarta Sans',sans-serif",
              letterSpacing: ".08em",
              textTransform: "uppercase",
              cursor: pending ? "default" : "pointer",
            }}
          >
            {pending ? "Generando..." : "Generar con IA"}
          </button>
        </div>
      )}
    </div>
  );
}
