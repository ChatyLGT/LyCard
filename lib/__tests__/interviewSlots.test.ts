import { describe, expect, it } from "vitest";
import { INTERVIEW_SLOTS, slotById, isSlotUpcoming, upcomingSlots } from "../interviewSlots";

describe("slotById", () => {
  it("resuelve un slot real por id, incluido uno ya vencido -- una Registration vieja necesita poder seguir mostrando su nombre", () => {
    expect(slotById("s1")?.date).toBe("2026-09-22");
  });

  it("devuelve null ante un id que no existe", () => {
    expect(slotById("no-existe")).toBeNull();
  });
});

describe("isSlotUpcoming / upcomingSlots -- Auditoría 2026-09-23, hallazgo 2.1", () => {
  it("un slot con fecha pasada no es upcoming", () => {
    const slot = INTERVIEW_SLOTS[0]; // s1, 2026-09-22
    expect(isSlotUpcoming(slot, new Date("2026-09-23T12:00:00Z"))).toBe(false);
  });

  it("un slot de hoy mismo sigue siendo upcoming -- no se descarta el día de", () => {
    const slot = INTERVIEW_SLOTS[0]; // s1, 2026-09-22
    expect(isSlotUpcoming(slot, new Date("2026-09-22T00:00:00Z"))).toBe(true);
  });

  it("un slot futuro es upcoming", () => {
    const slot = INTERVIEW_SLOTS[3]; // s4, 2026-09-29
    expect(isSlotUpcoming(slot, new Date("2026-09-23T12:00:00Z"))).toBe(true);
  });

  it("upcomingSlots filtra los vencidos y conserva el resto en orden", () => {
    const result = upcomingSlots(new Date("2026-09-23T12:00:00Z"));
    expect(result.map((s) => s.id)).toEqual(["s2", "s3", "s4"]);
  });

  it("con todos los slots vencidos, devuelve un array vacío en vez de romper", () => {
    const result = upcomingSlots(new Date("2027-01-01T00:00:00Z"));
    expect(result).toEqual([]);
  });
});
