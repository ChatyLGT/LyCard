import { describe, expect, it } from "vitest";
import { buildFunnelStages, FUNNEL_STAGE_LABEL, FUNNEL_STAGE_ORDER } from "../funnel";
import type { FunnelCounts } from "../funnel";

describe("buildFunnelStages", () => {
  it("primer stage nunca tiene conversión (no hay previo)", () => {
    const counts: FunnelCounts = { shared: 100, registered: 40, interviewed: 20, active: 10, paid: 5 };
    const stages = buildFunnelStages(counts);
    expect(stages[0].key).toBe("shared");
    expect(stages[0].conversionFromPrevious).toBeNull();
  });

  it("calcula la conversión como count / previousCount para cada stage siguiente", () => {
    const counts: FunnelCounts = { shared: 100, registered: 40, interviewed: 20, active: 10, paid: 5 };
    const stages = buildFunnelStages(counts);
    expect(stages[1].conversionFromPrevious).toBeCloseTo(0.4);
    expect(stages[2].conversionFromPrevious).toBeCloseTo(0.5);
    expect(stages[3].conversionFromPrevious).toBeCloseTo(0.5);
    expect(stages[4].conversionFromPrevious).toBeCloseTo(0.5);
  });

  it("no capea en 100% -- una conversión mayor al previo se refleja tal cual", () => {
    const counts: FunnelCounts = { shared: 10, registered: 15, interviewed: 15, active: 15, paid: 15 };
    const stages = buildFunnelStages(counts);
    expect(stages[1].conversionFromPrevious).toBeCloseTo(1.5);
  });

  it("previo en cero da conversión null en vez de dividir por cero", () => {
    const counts: FunnelCounts = { shared: 0, registered: 0, interviewed: 3, active: 0, paid: 0 };
    const stages = buildFunnelStages(counts);
    expect(stages[1].conversionFromPrevious).toBeNull();
    expect(stages[2].conversionFromPrevious).toBeNull();
  });

  it("preserva el orden y trae cada label correcto", () => {
    const counts: FunnelCounts = { shared: 1, registered: 1, interviewed: 1, active: 1, paid: 1 };
    const stages = buildFunnelStages(counts);
    expect(stages.map((s) => s.key)).toEqual(FUNNEL_STAGE_ORDER);
    for (const stage of stages) {
      expect(stage.label).toBe(FUNNEL_STAGE_LABEL[stage.key]);
      expect(stage.count).toBe(1);
    }
  });
});
