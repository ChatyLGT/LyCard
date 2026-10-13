import { describe, it, expect } from "vitest";
import { parseSessionLog, nextSessionNumber, type SessionLogEntry } from "../sessionLog";

describe("sessionLog", () => {
  const validEntry: SessionLogEntry = {
    sessionNumber: 1,
    notes: "Primera sesión, fue bien.",
    loggedAt: "2026-10-12T12:00:00.000Z",
    loggedByAdminId: "admin-1",
    commissionUsd: 35,
  };

  describe("parseSessionLog", () => {
    it("devuelve [] si no es un array", () => {
      expect(parseSessionLog(null)).toEqual([]);
      expect(parseSessionLog(undefined)).toEqual([]);
      expect(parseSessionLog("no es un array")).toEqual([]);
      expect(parseSessionLog({})).toEqual([]);
    });

    it("devuelve [] para un array vacío", () => {
      expect(parseSessionLog([])).toEqual([]);
    });

    it("acepta entradas válidas tal cual", () => {
      expect(parseSessionLog([validEntry])).toEqual([validEntry]);
    });

    it("descarta entradas con forma inválida, conserva las válidas", () => {
      const invalida = { sessionNumber: "uno", notes: 123, loggedAt: null, loggedByAdminId: 5 };
      expect(parseSessionLog([validEntry, invalida, null, "basura"])).toEqual([validEntry]);
    });

    it("normaliza a 0 una sesión vieja, logueada antes de que existiera commissionUsd", () => {
      const { commissionUsd: _commissionUsd, ...entradaVieja } = validEntry;
      expect(parseSessionLog([entradaVieja])).toEqual([{ ...entradaVieja, commissionUsd: 0 }]);
    });

    it("descarta un commissionUsd de tipo inválido en vez de romper la entrada", () => {
      const entradaConComisionRota = { ...validEntry, commissionUsd: "35 dólares" };
      expect(parseSessionLog([entradaConComisionRota])).toEqual([{ ...validEntry, commissionUsd: 0 }]);
    });
  });

  describe("nextSessionNumber", () => {
    it("devuelve 1 para una bitácora vacía", () => {
      expect(nextSessionNumber([])).toBe(1);
    });

    it("devuelve el máximo + 1", () => {
      expect(nextSessionNumber([validEntry, { ...validEntry, sessionNumber: 3 }])).toBe(4);
    });

    it("no asume que vienen ordenadas", () => {
      const desordenadas = [
        { ...validEntry, sessionNumber: 5 },
        { ...validEntry, sessionNumber: 2 },
      ];
      expect(nextSessionNumber(desordenadas)).toBe(6);
    });
  });
});
