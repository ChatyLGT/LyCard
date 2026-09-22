import { describe, it, expect } from "vitest";
import { clampDemoCount, demoNameFor, MAX_DEMO_COUNT, DEMO_FIRST_NAMES } from "@/lib/demoData";

// Fase E5 — el ambiente de datos mock. clampDemoCount es la única
// validación real de entrada (el input de "cantidad" es un <input
// type="number"> del navegador, nunca confiable por su cuenta): sin esto,
// un cliente armado a mano podría mandar un count negativo o gigante e
// intentar generar una cantidad absurda de Programas/Cards de golpe.

describe("clampDemoCount", () => {
  it("happy path: un número válido dentro de rango se devuelve tal cual", () => {
    expect(clampDemoCount("5")).toBe(5);
    expect(clampDemoCount(5)).toBe(5);
  });

  it("edge case: clampea al mínimo (1) valores en cero, negativos, o decimales que redondean a menos de 1", () => {
    expect(clampDemoCount("0")).toBe(1);
    expect(clampDemoCount("-3")).toBe(1);
    expect(clampDemoCount("0.2")).toBe(1);
  });

  it("edge case: clampea al máximo un número gigante (protección real contra generar de más)", () => {
    expect(clampDemoCount("999999")).toBe(MAX_DEMO_COUNT);
  });

  it("caso de error: input no numérico (string vacío, texto, undefined) cae a 1 en vez de crashear o dar NaN", () => {
    expect(clampDemoCount("")).toBe(1);
    expect(clampDemoCount("abc")).toBe(1);
    expect(clampDemoCount(undefined)).toBe(1);
    expect(clampDemoCount(null)).toBe(1);
  });
});

describe("demoNameFor", () => {
  it("happy path: el índice 1 da el primer nombre del pool", () => {
    expect(demoNameFor(1)).toBe(DEMO_FIRST_NAMES[0]);
  });

  it("edge case: rota el pool en vez de romperse cuando el índice supera el largo del pool", () => {
    expect(demoNameFor(DEMO_FIRST_NAMES.length + 1)).toBe(DEMO_FIRST_NAMES[0]);
    expect(demoNameFor(DEMO_FIRST_NAMES.length)).toBe(DEMO_FIRST_NAMES[DEMO_FIRST_NAMES.length - 1]);
  });
});
