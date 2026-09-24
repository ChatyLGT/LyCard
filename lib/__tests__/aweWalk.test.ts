import { describe, it, expect } from "vitest";
import { generateSimulatedAweIndex } from "@/lib/aweWalk";

describe("generateSimulatedAweIndex", () => {
  it("siempre devuelve un entero dentro de 40-85, nunca fuera de rango", () => {
    for (let i = 0; i < 200; i++) {
      const value = generateSimulatedAweIndex();
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(40);
      expect(value).toBeLessThanOrEqual(85);
    }
  });

  it("no siempre devuelve el mismo número (de verdad varía)", () => {
    const values = new Set(Array.from({ length: 50 }, () => generateSimulatedAweIndex()));
    expect(values.size).toBeGreaterThan(1);
  });
});
