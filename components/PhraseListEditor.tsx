"use client";

import { useState, type CSSProperties } from "react";

function uid() {
  return Math.random().toString(36).slice(2);
}

const FIELD: CSSProperties = {
  background: "#0D0D0D",
  border: "1px solid rgba(200,161,90,.25)",
  borderRadius: 8,
  padding: "8px 11px",
  color: "#F5F2EB",
  font: "400 12px 'Plus Jakarta Sans',sans-serif",
  outline: "none",
  resize: "vertical",
};

type EditablePhrase = { _uid: string; text: string };

// Pool de frases motivacionales de un Programa (Fase E2, "Objetivo del Día")
// — el N0 las escribe a mano, el sistema rota una distinta por día
// (lib/oficinaExtras.ts#pickPhraseOfTheDay), nunca un modelo en vivo.
// Editor más simple que EscalaEditor/OfficeSkillsEditor porque acá cada
// ítem es un string plano, sin campos internos que abrir/cerrar.
export default function PhraseListEditor({
  initialPhrases,
  action,
}: {
  initialPhrases: string[];
  action: (formData: FormData) => Promise<void>;
}) {
  const [phrases, setPhrases] = useState<EditablePhrase[]>(() => initialPhrases.map((text) => ({ _uid: uid(), text })));

  function addPhrase() {
    setPhrases((ps) => [...ps, { _uid: uid(), text: "" }]);
  }
  function updatePhrase(u: string, text: string) {
    setPhrases((ps) => ps.map((p) => (p._uid === u ? { ...p, text } : p)));
  }
  function removePhrase(u: string) {
    setPhrases((ps) => ps.filter((p) => p._uid !== u));
  }

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input type="hidden" name="phrases" value={JSON.stringify(phrases.map((p) => p.text.trim()).filter(Boolean))} />

      {phrases.length === 0 && (
        <p style={{ margin: 0, font: "400 12px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
          Sin frases propias todavía — tocá &quot;Agregar frase&quot; para armar tu pool (mientras tanto se muestran 3 de
          ejemplo).
        </p>
      )}

      {phrases.map((p, i) => (
        <div key={p._uid} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <textarea
            placeholder="Ej. Tu legado no espera a que estés listo — empieza hoy."
            value={p.text}
            onChange={(e) => updatePhrase(p._uid, e.target.value)}
            rows={2}
            style={{ ...FIELD, flex: 1, minWidth: 0 }}
            aria-label={`Frase ${i + 1}`}
          />
          <button
            type="button"
            onClick={() => removePhrase(p._uid)}
            aria-label="Quitar"
            style={{ flex: "none", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", border: "none", borderRadius: 8, background: "rgba(229,146,138,.12)", color: "#e5928a", cursor: "pointer" }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>close</span>
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addPhrase}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: 12, border: "1px dashed rgba(200,161,90,.4)", borderRadius: 12, background: "none", color: "#C8A15A", font: "700 11px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", cursor: "pointer" }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
        Agregar frase
      </button>

      <button
        type="submit"
        style={{ padding: 13, border: "none", borderRadius: 10, background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)", color: "#0D0D0D", font: "700 11px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", cursor: "pointer" }}
      >
        Guardar Frases
      </button>
    </form>
  );
}
