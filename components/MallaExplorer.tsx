"use client";

import { useState, type CSSProperties } from "react";
import MallaGraph from "@/components/MallaGraph";
import type { MallaGraphData } from "@/lib/mallaReal";

const PROGRAM_PREFIX = "program-";

const panelStyle: CSSProperties = {
  padding: 14,
  borderRadius: 12,
  background: "rgba(255,255,255,.04)",
  border: "1px solid rgba(200,161,90,.28)",
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

// Envuelve MallaGraph (el motor 3D, que ya traía el click-to-select
// armado pero sin nadie escuchándolo) con dos cosas nuevas: un panel que
// muestra la info real del nodo tocado, y — solo en la Malla raíz — la
// posibilidad de "entrar" a un Programa (N3) y ver SU propio fractal por
// dentro, ida y vuelta. `subGraphs` viene pre-calculado del servidor
// (una consulta por Programa real, nunca miles — a esta escala no hace
// falta un fetch por click); si un Programa no tiene su propio grafo acá
// (sin memberships reales todavía), el click solo muestra su info, sin
// botón de entrar.
export default function MallaExplorer({
  root,
  subGraphs,
  height = 210,
  camRadius = 165,
  maxRadius,
  haloScale,
  accent = "#C8A15A",
}: {
  root: MallaGraphData;
  subGraphs: Record<string, MallaGraphData>;
  height?: number;
  camRadius?: number;
  maxRadius?: number;
  haloScale?: number;
  accent?: string;
}) {
  const [view, setView] = useState<{ level: "root" } | { level: "sub"; programId: string }>({ level: "root" });
  const [selected, setSelected] = useState<string | null>(null);

  const current = view.level === "root" ? root : subGraphs[view.programId];
  const selectedInfo = selected ? current?.info[selected] : null;
  const canEnter = view.level === "root" && selected?.startsWith(PROGRAM_PREFIX) && Boolean(subGraphs[selected.slice(PROGRAM_PREFIX.length)]);

  function backToRoot() {
    setView({ level: "root" });
    setSelected(null);
  }

  if (!current) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {view.level === "sub" && (
        <button
          type="button"
          onClick={backToRoot}
          style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", padding: 0, color: accent, font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", cursor: "pointer" }}
        >
          ← Volver a Legacy
        </button>
      )}

      <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(200,161,90,.18)", background: "#0B0B0A" }}>
        <MallaGraph
          nodes={current.nodes}
          edges={current.edges}
          ghosts={current.ghosts}
          height={height}
          camRadius={camRadius}
          maxRadius={maxRadius}
          haloScale={haloScale}
          onSelect={setSelected}
        />
      </div>

      {selectedInfo && (
        <div style={panelStyle}>
          <span style={{ font: "700 13px 'Playfair Display',serif", color: "#F3F0E9" }}>{selectedInfo.title}</span>
          {selectedInfo.subtitle && (
            <span style={{ font: "600 9.5px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".06em", textTransform: "uppercase", color: accent }}>
              {selectedInfo.subtitle}
            </span>
          )}
          {selectedInfo.body && <span style={{ font: "400 11.5px/1.5 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>{selectedInfo.body}</span>}
          {canEnter && (
            <button
              type="button"
              onClick={() => {
                setView({ level: "sub", programId: selected!.slice(PROGRAM_PREFIX.length) });
                setSelected(null);
              }}
              style={{ alignSelf: "flex-start", marginTop: 4, padding: "6px 12px", borderRadius: 8, border: "none", background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)", color: "#0D0D0D", font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".06em", textTransform: "uppercase", cursor: "pointer" }}
            >
              Entrar a este Programa →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
