import { sparklinePoints, sparklineLastPoint } from "@/lib/sparkline";

// SVG a mano, sin librería (mismo criterio que MallaGraph) — mark specs
// de la skill de dataviz de esta sesión: línea 2px en el tono de
// "de-énfasis" (gris, no el acento — el acento se reserva para "hoy"), el
// último punto con un marcador de r>=4 en el color de acento + un anillo
// de 2px en el color de superficie para que no se pierda si cruza la
// línea.
export default function Sparkline({
  trend,
  accent,
  width = 64,
  height = 24,
  surface = "#0B0B0A",
}: {
  trend: number[];
  accent: string;
  width?: number;
  height?: number;
  surface?: string;
}) {
  if (trend.length === 0) return null;
  const points = sparklinePoints(trend, width, height);
  const last = sparklineLastPoint(trend, width, height);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline points={points} fill="none" stroke="#5A5A5A" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {last && (
        <>
          <circle cx={last.x} cy={last.y} r={5} fill={surface} />
          <circle cx={last.x} cy={last.y} r={4} fill={accent} />
        </>
      )}
    </svg>
  );
}
