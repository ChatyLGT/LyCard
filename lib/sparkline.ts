// Geometría pura de un sparkline — separado de components/Sparkline.tsx
// (que solo dibuja el SVG) para poder testearlo sin JSX/DOM, mismo
// criterio que el resto de lib/ en esta sesión (shift-left: la lógica
// vive en una función pura, testeada, el componente solo la usa).
export function sparklinePoints(values: number[], width: number, height: number, padding = 3): string {
  if (values.length === 0) return "";
  if (values.length === 1) {
    // Un solo punto no arma una línea — una raya horizontal al medio deja
    // claro que hay un valor pero no hay tendencia todavía para graficar.
    const y = height / 2;
    return `${padding},${y} ${width - padding},${y}`;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;

  return values
    .map((v, i) => {
      const x = padding + (i / (values.length - 1)) * usableWidth;
      // Todos los valores iguales (range === 0): línea recta al medio, en
      // vez de dividir por cero.
      const y = range === 0 ? height / 2 : padding + usableHeight - ((v - min) / range) * usableHeight;
      return `${x},${y}`;
    })
    .join(" ");
}

// El último punto de la polyline de arriba — es donde va el marcador
// (círculo) en el color de acento, "hoy" contra el resto del trend en gris.
export function sparklineLastPoint(values: number[], width: number, height: number, padding = 3): { x: number; y: number } | null {
  if (values.length === 0) return null;
  const points = sparklinePoints(values, width, height, padding).split(" ");
  const [x, y] = points[points.length - 1].split(",").map(Number);
  return { x, y };
}
