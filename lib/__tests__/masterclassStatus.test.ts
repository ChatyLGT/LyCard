import { describe, it, expect } from "vitest";
import { masterclassStatus, parseMasterclassLog, type MasterclassLogEntry } from "../masterclassStatus";

describe("masterclassStatus", () => {
  const now = new Date("2026-10-12T12:00:00Z");
  const entry = (previousDate: string): MasterclassLogEntry => ({
    type: "no_show_rescheduled",
    previousDate,
    loggedAt: "2026-10-01T00:00:00.000Z",
  });

  describe("parseMasterclassLog", () => {
    it("devuelve [] si no es un array", () => {
      expect(parseMasterclassLog(null)).toEqual([]);
      expect(parseMasterclassLog("basura")).toEqual([]);
    });

    it("acepta entradas válidas y descarta las inválidas", () => {
      const valida = entry("2026-09-01T00:00:00.000Z");
      const invalida = { type: "otra_cosa" };
      expect(parseMasterclassLog([valida, invalida, null])).toEqual([valida]);
    });
  });

  describe("masterclassStatus", () => {
    it("asistió gana por sobre cualquier otra señal", () => {
      expect(
        masterclassStatus({ attendedAt: new Date("2026-10-10T00:00:00Z"), masterclassLog: [entry("x"), entry("y")], slotDate: null }, now)
      ).toBe("asistio");
    });

    it("0 reagendados y slot futuro -- verde", () => {
      expect(masterclassStatus({ attendedAt: null, masterclassLog: [], slotDate: new Date("2026-10-15T00:00:00Z") }, now)).toBe("verde");
    });

    it("1 reagendado -- amarillo, sin importar la fecha del slot actual", () => {
      expect(masterclassStatus({ attendedAt: null, masterclassLog: [entry("2026-10-05T00:00:00Z")], slotDate: new Date("2026-10-20T00:00:00Z") }, now)).toBe(
        "amarillo"
      );
    });

    it("2 reagendados -- rojo", () => {
      expect(
        masterclassStatus(
          { attendedAt: null, masterclassLog: [entry("2026-09-20T00:00:00Z"), entry("2026-10-01T00:00:00Z")], slotDate: new Date("2026-10-15T00:00:00Z") },
          now
        )
      ).toBe("rojo");
    });

    it("0 reagendados pero la fecha del slot ya pasó sin asistencia -- rojo", () => {
      expect(masterclassStatus({ attendedAt: null, masterclassLog: [], slotDate: new Date("2026-10-01T00:00:00Z") }, now)).toBe("rojo");
    });

    it("sin InterviewSlot real (slotDate null) y sin reagendados -- verde honesto, no se inventa un vencimiento", () => {
      expect(masterclassStatus({ attendedAt: null, masterclassLog: [], slotDate: null }, now)).toBe("verde");
    });
  });
});
