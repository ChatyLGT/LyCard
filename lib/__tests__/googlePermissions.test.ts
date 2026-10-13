import { describe, it, expect } from "vitest";
import { GOOGLE_PERMISSIONS, GOOGLE_CONNECT_SCOPE_LIST } from "@/lib/googlePermissions";

describe("GOOGLE_PERMISSIONS", () => {
  it("expone exactamente los scopes que la app pide a Google", () => {
    expect(GOOGLE_CONNECT_SCOPE_LIST).toEqual([
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/tasks",
      "https://www.googleapis.com/auth/drive.file",
    ]);
  });

  it("cada permiso tiene key única y explicación de para qué y cuándo", () => {
    const keys = GOOGLE_PERMISSIONS.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const p of GOOGLE_PERMISSIONS) {
      expect(p.label.length).toBeGreaterThan(0);
      expect(p.para.length).toBeGreaterThan(0);
      expect(p.cuando.length).toBeGreaterThan(0);
      expect(p.scopes.length).toBeGreaterThan(0);
    }
  });

  it("no incluye gmail.send ni permisos de lectura de Gmail (eso se decide aparte)", () => {
    expect(GOOGLE_CONNECT_SCOPE_LIST.some((s) => s.includes("gmail"))).toBe(false);
  });
});
