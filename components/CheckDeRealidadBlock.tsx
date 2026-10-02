import type { CSSProperties } from "react";
import type { RealityCheckKpi } from "@/lib/oficinaExtras";
import Sparkline from "@/components/Sparkline";

const kicker: CSSProperties = {
  font: "600 8.5px 'Plus Jakarta Sans',sans-serif",
  letterSpacing: ".16em",
  textTransform: "uppercase",
  color: "#756c5e",
};

// Fase E3 — "Chequeo de Realidad": los KPIs del día que el dueño (o el
// botón "Generar con IA (simulado)" del editor) inventó, cada uno con su
// sparkline de lib/sparkline.ts/components/Sparkline.tsx si tiene
// suficiente trend para dibujar una línea; uno con un solo punto (o sin
// trend) se muestra como cifra/comparativa plana, sin gráfico -- no es
// un tipo de KPI distinto, es el mismo shape (RealityCheckKpi), nomás
// con menos puntos de trend. isDefault marca cuando son los 6 de ejemplo
// de DEFAULT_REALITY_CHECK_KPIS (nadie cargó los propios todavía) —
// mismo criterio de "ejemplo, no dato real" que KeepInFlowBlock.
//
// Tope subido de 3 a 6 (2026-10-02, pedido de Gunnar) -- el editor
// (OficinaExtrasEditor.tsx) nunca tuvo límite, siempre fue este
// `.slice` el único tope artificial.
export default function CheckDeRealidadBlock({ kpis, isDefault, accent }: { kpis: RealityCheckKpi[]; isDefault: boolean; accent: string }) {
  if (kpis.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <span style={kicker}>Chequeo de Realidad</span>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(kpis.length, 3)},1fr)`, gap: 8 }}>
        {kpis.slice(0, 6).map((kpi) => (
          <div
            key={kpi.key}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4, textAlign: "center",
              padding: "12px 8px", borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(200,161,90,.16)",
            }}
          >
            <span style={{ font: "700 18px 'Playfair Display',serif", color: "#F3F0E9" }}>
              {kpi.value}
              {kpi.unit}
            </span>
            <span style={{ font: "500 9px 'Plus Jakarta Sans',sans-serif", color: "#A79E8E", lineHeight: 1.3 }}>{kpi.label}</span>
            {kpi.trend.length > 1 && <Sparkline trend={kpi.trend} accent={accent} />}
          </div>
        ))}
      </div>
      {isDefault && (
        <span style={{ font: "400 9px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
          KPIs de ejemplo — cargá los tuyos desde tu editor.
        </span>
      )}
    </div>
  );
}
