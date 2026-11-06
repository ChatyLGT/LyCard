"use client";

import { useActionState, useState } from "react";
import { programJsonAction } from "@/app/admin/programs/json-actions";
import { EMPTY_PROGRAM_JSON_STATE, type ProgramJsonState } from "@/lib/programJsonState";

const MAX_BYTES = 256 * 1024;

const LABEL = { font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", color: "#C2BEB5" } as const;
const BTN = { padding: "10px 18px", border: "none", borderRadius: 10, font: "700 11px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", cursor: "pointer" } as const;

// Subir un .json (o pegar el texto) para armar un Programa y todas sus
// tarjetas de una vez. Dos pasos: "Validar" muestra qué va a pasar (sin
// escribir nada) y recién entonces se habilita "Importar".
export default function ProgramJsonPanel({ canImport, exportHref }: { canImport: boolean; exportHref?: string }) {
  const [state, formAction, pending] = useActionState<ProgramJsonState, FormData>(programJsonAction, EMPTY_PROGRAM_JSON_STATE);
  const [text, setText] = useState("");
  // Texto exacto que se validó sin errores: Importar solo se habilita si no cambió.
  const [validatedText, setValidatedText] = useState<string | null>(null);
  const [fileError, setFileError] = useState("");

  const shownValid = state.status === "valid" || state.status === "imported";
  const canRunImport = canImport && state.status === "valid" && validatedText === text && !pending;

  async function onFile(file: File | undefined) {
    setFileError("");
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setFileError(`El archivo pesa ${(file.size / 1024).toFixed(0)} KB y el máximo es ${MAX_BYTES / 1024} KB.`);
      return;
    }
    setText(await file.text());
    setValidatedText(null);
  }

  return (
    <form
      action={(fd) => {
        if (fd.get("intent") === "validate") setValidatedText(text);
        formAction(fd);
      }}
      data-testid="program-json-panel"
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
    >
      <p style={{ margin: 0, font: "400 12px/1.5 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>
        Subí un archivo <b>.json</b> o pegá el texto. Primero <b>Validar</b>: te muestra qué se va a crear o cambiar, sin guardar nada. Después <b>Importar</b>.
        Lo que no viene en el JSON no se toca, y cada importación queda guardada como una versión.
      </p>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={LABEL}>Archivo .json</span>
        <input type="file" accept=".json,application/json" data-testid="program-json-file" onChange={(e) => onFile(e.target.files?.[0])} style={{ color: "#C2BEB5", font: "400 12px 'Plus Jakarta Sans',sans-serif" }} />
      </label>
      {fileError && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>{fileError}</p>}
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={LABEL}>…o pegá el JSON</span>
        <textarea
          name="json"
          data-testid="program-json-text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setValidatedText(null);
          }}
          rows={10}
          spellCheck={false}
          placeholder='{ "schema": "lycard.program/1", "program": { "name": "..." }, "cards": [] }'
          style={{ background: "#0D0D0D", border: "1px solid rgba(200,161,90,.3)", borderRadius: 10, padding: "10px 14px", color: "#F5F2EB", font: "400 12px ui-monospace,Menlo,monospace", outline: "none", resize: "vertical" }}
        />
      </label>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button type="submit" name="intent" value="validate" disabled={pending || !text.trim()} data-testid="program-json-validate" style={{ ...BTN, background: "#2a2927", color: "#E5C378", border: "1px solid rgba(200,161,90,.4)", opacity: pending || !text.trim() ? 0.5 : 1 }}>
          Validar
        </button>
        {canImport && (
          <button type="submit" name="intent" value="import" disabled={!canRunImport} data-testid="program-json-import" style={{ ...BTN, background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)", color: "#0D0D0D", opacity: canRunImport ? 1 : 0.4, cursor: canRunImport ? "pointer" : "not-allowed" }}>
            Importar
          </button>
        )}
        {exportHref && (
          <a href={exportHref} data-testid="program-json-export" style={{ color: "#C8A15A", font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase" }}>
            Exportar este Programa (.json) ↓
          </a>
        )}
        {pending && <span style={{ color: "#8a8378", font: "400 11px 'Plus Jakarta Sans',sans-serif" }}>Procesando…</span>}
      </div>
      {canImport && state.status === "valid" && validatedText !== text && (
        <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#C8A15A" }}>Cambiaste el texto: volvé a Validar para poder Importar.</p>
      )}
      <Report state={state} shownValid={shownValid} />
    </form>
  );
}

function Report({ state, shownValid }: { state: ProgramJsonState; shownValid: boolean }) {
  if (state.status === "idle") return null;
  return (
    <div data-testid="program-json-report" role="status" style={{ background: "#171717", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 10, border: `1px solid ${state.status === "error" ? "rgba(229,146,138,.4)" : "rgba(143,209,158,.35)"}` }}>
      {state.status === "error" && (
        <>
          <p style={{ margin: 0, font: "700 12px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>No se puede importar: hay {state.errors.length} {state.errors.length === 1 ? "problema" : "problemas"}. No se guardó nada.</p>
          <ul data-testid="program-json-errors" style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
            {state.errors.map((e, i) => (
              <li key={i} style={{ font: "400 12px/1.5 'Plus Jakarta Sans',sans-serif", color: "#F5F2EB" }}>
                <code style={{ color: "#e5928a" }}>{e.path}</code> — {e.message}
              </li>
            ))}
          </ul>
        </>
      )}
      {shownValid && (
        <>
          <p data-testid="program-json-headline" style={{ margin: 0, font: "700 12px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>{state.headline}</p>
          {state.lines.length > 0 && (
            <ul data-testid="program-json-lines" style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 3 }}>
              {state.lines.map((l, i) => (
                <li key={i} style={{ font: "400 11.5px/1.5 'Plus Jakarta Sans',sans-serif", color: "#F5F2EB" }}>{l}</li>
              ))}
            </ul>
          )}
          {state.lines.length === 0 && <p style={{ margin: 0, font: "400 12px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>No hay cambios: el Programa ya está igual que el archivo.</p>}
        </>
      )}
      {state.discarded.length > 0 && (
        <div data-testid="program-json-discarded">
          <p style={{ margin: "0 0 4px", font: "700 11px 'Plus Jakarta Sans',sans-serif", color: "#E5C378" }}>Se descartó o ignoró ({state.discarded.length}):</p>
          <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 3 }}>
            {state.discarded.map((d, i) => (
              <li key={i} style={{ font: "400 11.5px/1.5 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>
                <code style={{ color: "#E5C378" }}>{d.path}</code> — {d.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
      {state.warnings.length > 0 && (
        <ul data-testid="program-json-warnings" style={{ margin: 0, paddingLeft: 18 }}>
          {state.warnings.map((w, i) => (
            <li key={i} style={{ font: "400 11.5px/1.5 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>{w}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
