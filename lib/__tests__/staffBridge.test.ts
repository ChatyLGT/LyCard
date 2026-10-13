import { describe, it, expect } from "vitest";
import { bridgeFromRoles } from "../staffBridge";

describe("bridgeFromRoles", () => {
  it("sin roles elevados no hay puente", () => {
    expect(bridgeFromRoles(false, [])).toBeNull();
    expect(bridgeFromRoles(false, [{ programId: "p", role: "admin" }])).toBeNull();
  });
  it("MasterN0 es owner global aunque tenga otros roles", () => {
    expect(bridgeFromRoles(true, [{ programId: "p", role: "oreja" }])).toEqual({ programId: null, adminRole: "owner" });
  });
  it("n0_programa gana sobre oreja y queda atado a su Programa", () => {
    expect(bridgeFromRoles(false, [{ programId: "a", role: "oreja" }, { programId: "b", role: "n0_programa" }])).toEqual({ programId: "b", adminRole: "owner" });
  });
  it("oreja es empleado de su Programa", () => {
    expect(bridgeFromRoles(false, [{ programId: "a", role: "oreja" }])).toEqual({ programId: "a", adminRole: "empleado" });
  });
});
