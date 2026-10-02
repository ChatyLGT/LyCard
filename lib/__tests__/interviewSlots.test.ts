import { describe, expect, it } from "vitest";
import { generateLegacySlots, slotById, isSlotUpcoming, upcomingSlots } from "../interviewSlots";

// Reescrito 2026-10-02: los slots eran una lista fija de fechas de
// calendario que quedó vencida sola (hallazgo real armando PASO 6 de la
// tarjeta Rogelio -- ver PLAN.md). Ahora se generan relativos a `now`, así
// que los tests fijan un `now` de referencia e inyectan ese mismo `now`
// en cada assert, en vez de comparar contra fechas hardcodeadas.

const NOW = new Date("2026-10-02T12:00:00Z"); // viernes

describe("generateLegacySlots", () => {
  it("genera 4 slots ordenados por fecha real, no por el orden en que se calculan", () => {
    const slots = generateLegacySlots(NOW);
    expect(slots).toHaveLength(4);
    // `now` es viernes 2/10 -- el sábado 3/10 cae antes que el martes 6/10
    // y el jueves 8/10, aunque se calcule después en el código.
    expect(slots.map((s) => s.date)).toEqual(["2026-10-03", "2026-10-06", "2026-10-08", "2026-10-13"]);
    expect(slots[0].label).toBe("Sábado 3 de octubre");
    expect(slots[1].label).toBe("Martes 6 de octubre");
    expect(slots[1].labelEn).toBe("Tuesday, October 6");
  });

  it("un slot de hoy mismo (now cae en el día objetivo) sigue siendo upcoming, no se salta al siguiente", () => {
    const tuesday = new Date("2026-10-06T08:00:00Z");
    const slots = generateLegacySlots(tuesday);
    expect(slots[0].date).toBe("2026-10-06");
  });

  it("nunca devuelve una fecha pasada, sea cual sea `now`", () => {
    const farFuture = new Date("2027-03-15T00:00:00Z");
    const slots = generateLegacySlots(farFuture);
    for (const s of slots) {
      expect(s.date >= "2027-03-15").toBe(true);
    }
  });
});

describe("slotById", () => {
  it("resuelve un slot real por id contra el `now` dado", () => {
    expect(slotById("s1", NOW)?.date).toBe("2026-10-03");
  });

  it("devuelve null ante un id que no existe", () => {
    expect(slotById("no-existe", NOW)).toBeNull();
  });
});

describe("isSlotUpcoming / upcomingSlots", () => {
  it("un slot generado siempre es upcoming respecto al mismo `now`", () => {
    const slot = generateLegacySlots(NOW)[0];
    expect(isSlotUpcoming(slot, NOW)).toBe(true);
  });

  it("un slot queda vencido si `now` avanza más allá de su fecha", () => {
    const slot = generateLegacySlots(NOW)[0]; // 2026-10-06
    expect(isSlotUpcoming(slot, new Date("2026-10-07T00:00:00Z"))).toBe(false);
  });

  it("upcomingSlots devuelve los 4, nunca un array vacío por vencimiento -- se regeneran solos", () => {
    const result = upcomingSlots(NOW);
    expect(result).toHaveLength(4);
  });
});
