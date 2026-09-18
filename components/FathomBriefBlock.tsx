import type { CSSProperties } from "react";
import type { FathomBrief } from "@/lib/fathom";

const panelStyle: CSSProperties = {
  padding: 14,
  borderRadius: 12,
  background: "rgba(255,255,255,.03)",
  border: "1px solid rgba(200,161,90,.18)",
};

// Cara "App" real del superpoder Fathom Brief — conecta a la API pública
// de Fathom (lib/fathom.ts), lista las últimas reuniones, un resumen
// corto de cada una y un link directo a Fathom para abrirla. Extraído a
// su propio archivo (2026-09-18) para poder vivir dentro del modal de
// "Superpoderes" (components/OfficeSkillsBlock.tsx, client component) sin
// duplicar la lógica de fetch, que sigue pasando server-side en
// app/c/[slug]/oficina/page.tsx.
export default function FathomBriefBlock({ brief }: { brief: FathomBrief }) {
  if (!brief.enabled) {
    return (
      <p style={{ margin: 0, font: "400 11px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
        Todavía sin conectar a Fathom — próximamente.
      </p>
    );
  }
  if (brief.error) {
    return (
      <p style={{ margin: 0, font: "400 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>
        No se pudo conectar a Fathom ahora mismo. Probá de nuevo en un rato.
      </p>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <span style={{ font: "400 8px 'Plus Jakarta Sans',sans-serif", color: "#6b6459" }}>
          {brief.totalCount > brief.meetings.length
            ? `Mostrando ${brief.meetings.length} de ${brief.totalCount} · vía Fathom`
            : `${brief.totalCount} reunión${brief.totalCount === 1 ? "" : "es"} · vía Fathom`}
        </span>
      </div>
      {brief.meetings.length === 0 ? (
        <p style={{ margin: 0, font: "400 11px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
          Sin reuniones grabadas todavía en esta cuenta de Fathom.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {brief.meetings.map((m) => (
            <a
              key={m.recordingId}
              href={m.url}
              target="_blank"
              rel="noreferrer"
              style={{ ...panelStyle, display: "flex", flexDirection: "column", gap: 4, textDecoration: "none", color: "inherit" }}
            >
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                <span style={{ font: "700 12px 'Plus Jakarta Sans',sans-serif" }}>{m.title}</span>
                <span style={{ font: "400 9px 'Plus Jakarta Sans',sans-serif", color: "#756c5e", flexShrink: 0 }}>
                  {new Date(m.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}
                </span>
              </div>
              {m.summaryPreview && (
                <span style={{ font: "400 11px/1.4 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>{m.summaryPreview}</span>
              )}
              <span style={{ font: "600 9.5px 'Plus Jakarta Sans',sans-serif", color: "#C8A15A" }}>Ver en Fathom →</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
