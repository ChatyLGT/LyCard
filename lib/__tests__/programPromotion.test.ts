import { describe, it, expect } from "vitest";
import { buildPromotedAdminData } from "@/lib/programPromotion";

// Regla dura (2026-09-29, ver docs/02-ARQUITECTURA.md "Regla dura: quién
// puede volverse Admin/N0"): una promoción automática Chido→Programa
// nunca puede producir un MasterN0 (Admin.programId === null). El tipo
// de `buildPromotedAdminData` ya obliga esto en tiempo de compilación
// (programId: string, no string | null) -- este test confirma el
// comportamiento en runtime, para que la regla no dependa solo de que
// nadie afloje el tipo sin darse cuenta.
describe("buildPromotedAdminData", () => {
  it("el programId que devuelve nunca es null -- nunca produce un MasterN0", () => {
    const data = buildPromotedAdminData("member-1", "program-1");
    expect(data.programId).not.toBeNull();
    expect(data.programId).toBe("program-1");
  });

  it("siempre incluye el memberId tal cual -- la promoción queda linkeada al Member real, no a una cuenta nueva", () => {
    const data = buildPromotedAdminData("member-xyz", "program-abc");
    expect(data.memberId).toBe("member-xyz");
  });

  it("nunca agrega email/passwordHash -- un Admin promovido nunca tiene login propio", () => {
    const data = buildPromotedAdminData("member-1", "program-1");
    expect(Object.keys(data).sort()).toEqual(["memberId", "programId"]);
  });
});
