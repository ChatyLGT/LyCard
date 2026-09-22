import { describe, it, expect } from "vitest";
import { sparklinePoints, sparklineLastPoint } from "@/lib/sparkline";

// components/Sparkline.tsx (Fase E3, "Check de Realidad") dibuja el trend
// de un KPI a mano en SVG — esta es la geometría pura detrás, separada
// para poder testearla sin JSX. Los casos borde importan de verdad acá:
// un trend vacío o de un solo punto no debería nunca tirar (dividir por
// cero al normalizar, o un .pop() de un array vacío).

describe("sparklinePoints", () => {
  it("happy path: normaliza una serie creciente al rango [padding, width-padding] x [padding, height-padding]", () => {
    const points = sparklinePoints([0, 5, 10], 100, 20, 4);
    const parsed = points.split(" ").map((p) => p.split(",").map(Number));
    expect(parsed).toHaveLength(3);
    // Primer punto: valor mínimo → abajo del todo (y = height - padding).
    expect(parsed[0]).toEqual([4, 16]);
    // Último punto: valor máximo → arriba del todo (y = padding).
    expect(parsed[2]).toEqual([96, 4]);
  });

  it("edge case: un solo punto no arma línea — devuelve una raya horizontal al medio, no crashea", () => {
    const points = sparklinePoints([42], 100, 20, 4);
    expect(points).toBe("4,10 96,10");
  });

  it("edge case: todos los valores iguales (range 0) da una línea recta al medio, sin dividir por cero", () => {
    const points = sparklinePoints([5, 5, 5], 100, 20, 4);
    const parsed = points.split(" ").map((p) => p.split(",").map(Number));
    expect(parsed.every(([, y]) => y === 10)).toBe(true);
  });

  it("caso de error: trend vacío devuelve string vacío en vez de crashear", () => {
    expect(sparklinePoints([], 100, 20)).toBe("");
  });
});

describe("sparklineLastPoint", () => {
  it("happy path: devuelve las coordenadas del último punto de la serie", () => {
    const last = sparklineLastPoint([0, 5, 10], 100, 20, 4);
    expect(last).toEqual({ x: 96, y: 4 });
  });

  it("caso de error: trend vacío devuelve null en vez de crashear con .pop() de un array vacío", () => {
    expect(sparklineLastPoint([], 100, 20)).toBeNull();
  });
});
