import { describe, it, expect } from "vitest";
import { computePayment, simulateNashMeshRun, normalizePsiTier, PSI_BY_TIER, type NashMeshParticipant } from "@/lib/nashMesh";

// NashMesh (pedido de Gunnar, 2026-09-23) — si esto reparte mal, alguien
// cobra de más o de menos por algo que sí hizo. Vale la pena cubrirlo a
// fondo aunque sea "solo simulación" — los números que ve el N0 tienen
// que ser matemáticamente correctos, no solo verse bien.

describe("computePayment", () => {
  it("Payment = totalValueUsd × phi × psi × (1-epsilon)", () => {
    expect(computePayment(1000, 0.5, 1, 0.05)).toBeCloseTo(475);
  });

  it("epsilon 0 = sin comisión, todo el valor proporcional pasa", () => {
    expect(computePayment(1000, 1, 1, 0)).toBe(1000);
  });

  it("phi o psi en 0 da payment 0, nunca negativo ni NaN", () => {
    expect(computePayment(1000, 0, 1, 0.05)).toBe(0);
    expect(computePayment(1000, 1, 0, 0.05)).toBe(0);
  });
});

describe("normalizePsiTier", () => {
  it("2 y 3 pasan tal cual", () => {
    expect(normalizePsiTier(2)).toBe(2);
    expect(normalizePsiTier(3)).toBe(3);
  });

  it("cualquier otra cosa (1, corrupto, fuera de rango, no-numérico) cae a 1", () => {
    expect(normalizePsiTier(1)).toBe(1);
    expect(normalizePsiTier(99)).toBe(1);
    expect(normalizePsiTier("no-es-un-numero")).toBe(1);
    expect(normalizePsiTier(undefined)).toBe(1);
  });
});

describe("simulateNashMeshRun", () => {
  it("un solo participante se lleva el 100% de phi", () => {
    const participants: NashMeshParticipant[] = [{ cardId: "a", name: "Ana", declaredContributionPct: 50, psiTier: 3 }];
    const outputs = simulateNashMeshRun(1000, 0.05, participants);
    expect(outputs).toHaveLength(1);
    expect(outputs[0].phi).toBe(1);
    expect(outputs[0].psi).toBe(PSI_BY_TIER[3]);
    expect(outputs[0].payment).toBeCloseTo(950);
  });

  it("reparte proporcional a la contribución declarada, no necesita sumar 100", () => {
    const participants: NashMeshParticipant[] = [
      { cardId: "a", name: "Ana", declaredContributionPct: 30, psiTier: 3 },
      { cardId: "b", name: "Beto", declaredContributionPct: 70, psiTier: 3 },
    ];
    const outputs = simulateNashMeshRun(1000, 0, participants);
    expect(outputs[0].phi).toBeCloseTo(0.3);
    expect(outputs[1].phi).toBeCloseTo(0.7);
    expect(outputs[0].payment + outputs[1].payment).toBeCloseTo(1000);
  });

  it("todos declararon 0 (o nadie declaró nada) reparte parejo, no divide por cero", () => {
    const participants: NashMeshParticipant[] = [
      { cardId: "a", name: "Ana", declaredContributionPct: 0, psiTier: 3 },
      { cardId: "b", name: "Beto", declaredContributionPct: 0, psiTier: 3 },
    ];
    const outputs = simulateNashMeshRun(1000, 0, participants);
    expect(outputs[0].phi).toBeCloseTo(0.5);
    expect(outputs[1].phi).toBeCloseTo(0.5);
  });

  it("un valor negativo declarado (dato corrupto) nunca resta a los demás", () => {
    const participants: NashMeshParticipant[] = [
      { cardId: "a", name: "Ana", declaredContributionPct: -50, psiTier: 3 },
      { cardId: "b", name: "Beto", declaredContributionPct: 50, psiTier: 3 },
    ];
    const outputs = simulateNashMeshRun(1000, 0, participants);
    expect(outputs[0].phi).toBe(0);
    expect(outputs[1].phi).toBe(1);
  });

  it("ψ distinto entre participantes con la misma contribución da payments distintos", () => {
    const participants: NashMeshParticipant[] = [
      { cardId: "a", name: "Ana", declaredContributionPct: 50, psiTier: 1 },
      { cardId: "b", name: "Beto", declaredContributionPct: 50, psiTier: 3 },
    ];
    const outputs = simulateNashMeshRun(1000, 0, participants);
    expect(outputs[1].payment).toBeGreaterThan(outputs[0].payment);
  });

  it("sin participantes, lista vacía en vez de crashear", () => {
    expect(simulateNashMeshRun(1000, 0.05, [])).toEqual([]);
  });

  it("cardId null (participante que no está en el sistema, ej. 'el Estado') se preserva tal cual", () => {
    const participants: NashMeshParticipant[] = [{ cardId: null, name: "El Estado", declaredContributionPct: 100, psiTier: 2 }];
    const outputs = simulateNashMeshRun(1000, 0.05, participants);
    expect(outputs[0].cardId).toBeNull();
    expect(outputs[0].name).toBe("El Estado");
  });
});
