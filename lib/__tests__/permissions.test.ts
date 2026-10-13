import { describe, it, expect } from "vitest";
import { PERMISSIONS, ROLE_PERMISSIONS, isGrantableRole, permissionsForRoles, hasPermission } from "../permissions";

describe("permissions", () => {
  it("toda membresía tiene los permisos de miembro aunque no tenga roles", () => {
    const p = permissionsForRoles([]);
    expect(p.has("card.edit_own")).toBe(true);
    expect(p.has("leads.claim")).toBe(false);
  });

  it("oreja suma lo operativo y no lo administrativo", () => {
    const p = permissionsForRoles(["oreja"]);
    expect(p.has("leads.claim")).toBe(true);
    expect(p.has("commission.view_own")).toBe(true);
    expect(p.has("schedule.edit")).toBe(false);
    expect(p.has("program.edit")).toBe(false);
  });

  it("n0_programa incluye todo lo de oreja más lo administrativo", () => {
    const p = permissionsForRoles(["n0_programa"]);
    for (const perm of ROLE_PERMISSIONS.oreja) expect(p.has(perm)).toBe(true);
    expect(p.has("schedule.edit")).toBe(true);
    expect(p.has("commission.view_all")).toBe(true);
  });

  it("ignora roles desconocidos o intentos de escalar con texto libre", () => {
    expect(permissionsForRoles(["masterN0", "admin", ""]).has("program.edit")).toBe(false);
    expect(isGrantableRole("masterN0")).toBe(false);
    expect(isGrantableRole("oreja")).toBe(true);
  });

  it("MasterN0 puede todo; el resto depende de sus roles", () => {
    for (const permission of PERMISSIONS) expect(hasPermission({ isMasterN0: true, roles: [], permission })).toBe(true);
    expect(hasPermission({ isMasterN0: false, roles: ["oreja"], permission: "program.edit" })).toBe(false);
    expect(hasPermission({ isMasterN0: false, roles: ["n0_programa"], permission: "program.edit" })).toBe(true);
  });
});
