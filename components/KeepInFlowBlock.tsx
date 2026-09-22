import type { CSSProperties } from "react";

const kicker: CSSProperties = {
  font: "600 8.5px 'Plus Jakarta Sans',sans-serif",
  letterSpacing: ".16em",
  textTransform: "uppercase",
  color: "#756c5e",
};

// Banner animado — mismo gleam que ya usa LyCardView.tsx (Sweep(),
// animation: sweepGleam de app/globals.css) en vez de inventar una nueva
// coreografía: una franja de luz que cruza el panel cada 4s, sutil, no un
// marquee de texto scrolleando (un carrusel de UNA sola frase por día no
// tiene nada que desplazar).
function Sweep() {
  return (
    <span
      style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(90deg,transparent,rgba(255,255,255,.14),transparent)",
        animation: "sweepGleam 4s cubic-bezier(.4,0,.2,1) infinite",
        pointerEvents: "none",
      }}
    />
  );
}

// Fase E3 — "Keep in Flow": el objetivo del día (texto libre del dueño,
// sin fallback inventado: vacío es vacío, cáscara honesta) + la frase
// motivacional del día (lib/oficinaExtras.ts#pickPhraseOfTheDay, rotación
// determinística, nunca un modelo en vivo). isDefaultPhrase marca cuando
// el Programa todavía no cargó las suyas y se está mostrando una de
// DEFAULT_MOTIVATIONAL_PHRASES — la etiqueta de "ejemplo" evita que se
// confunda con algo que el N0 sí escribió.
export default function KeepInFlowBlock({
  objetivo,
  phrase,
  isDefaultPhrase,
  accent,
}: {
  objetivo: string;
  phrase: string | null;
  isDefaultPhrase: boolean;
  accent: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span style={kicker}>Keep in Flow</span>
        {objetivo && <span style={{ font: "400 10px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>Objetivo del día</span>}
      </div>

      {objetivo ? (
        <p style={{ margin: 0, font: "600 14px/1.5 'Plus Jakarta Sans',sans-serif", color: "#F3F0E9" }}>{objetivo}</p>
      ) : (
        <p style={{ margin: 0, font: "400 12px/1.5 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
          Sin objetivo cargado todavía — editalo desde tu editor.
        </p>
      )}

      {phrase && (
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 12,
            padding: "12px 14px",
            background: `linear-gradient(135deg, ${accent}1a, rgba(255,255,255,.02))`,
            border: `1px solid ${accent}40`,
          }}
        >
          <Sweep />
          <p style={{ position: "relative", margin: 0, font: "italic 500 12.5px/1.5 'Playfair Display',serif", color: "#F3F0E9" }}>
            &ldquo;{phrase}&rdquo;
          </p>
          {isDefaultPhrase && (
            <span style={{ position: "relative", display: "block", marginTop: 6, font: "400 9px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
              Frase de ejemplo — tu Programa todavía no cargó las suyas.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
