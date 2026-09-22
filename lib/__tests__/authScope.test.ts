import { describe, it, expect } from "vitest";
import { isMasterN0Scope, canAccessProgram, type AdminScope } from "@/lib/authScope";

// Por qué estas dos funciones son las primeras del repo con tests reales
// (auditoría CQE, 2026-09-23): antes de extraerlas, el mismo booleano
// vivía copiado a mano en ~13 lugares distintos de app/admin/** — el
// punto de mayor daño potencial si se rompe (un N0 de un Programa viendo
// datos de otro). Ver docs/AUDITORIA-TECNICA-2026-09.md §3.3, que ya
// señalaba esto como la prioridad #1 de testing antes de que existiera
// ninguna suite en el repo.

describe("isMasterN0Scope", () => {
  it("happy path: programId null es MasterN0", () => {
    const scope: AdminScope = { id: "admin-1", programId: null };
    expect(isMasterN0Scope(scope)).toBe(true);
  });

  it("edge case: string vacío NO es lo mismo que null — no debe colarse como MasterN0", () => {
    // Guarda contra una clase real de bug: si algún día un campo llega
    // como "" en vez de null (ej. un form mal parseado), esto NO debe
    // dar acceso global por accidente.
    const scope = { id: "admin-1", programId: "" } as unknown as AdminScope;
    expect(isMasterN0Scope(scope)).toBe(false);
  });

  it("caso negativo: un N0 con Programa asignado nunca es MasterN0", () => {
    const scope: AdminScope = { id: "admin-2", programId: "prog-legacy" };
    expect(isMasterN0Scope(scope)).toBe(false);
  });
});

describe("canAccessProgram", () => {
  const masterN0: AdminScope = { id: "admin-master", programId: null };
  const scopedToLegacy: AdminScope = { id: "admin-n0", programId: "prog-legacy" };

  it("happy path: MasterN0 puede acceder a cualquier Programa", () => {
    expect(canAccessProgram(masterN0, "prog-legacy")).toBe(true);
    expect(canAccessProgram(masterN0, "prog-mlqr")).toBe(true);
  });

  it("happy path: un N0 escopeado puede acceder a SU propio Programa", () => {
    expect(canAccessProgram(scopedToLegacy, "prog-legacy")).toBe(true);
  });

  it("caso negativo (aislamiento cross-tenant): un N0 escopeado NO puede acceder al Programa de otro", () => {
    expect(canAccessProgram(scopedToLegacy, "prog-mlqr")).toBe(false);
  });

  it("edge case: un recurso sin Programa (programId null, ej. una Card company/personal) — MasterN0 sí, un N0 escopeado no", () => {
    // Este es el bug real que se encontró y corrigió en esta misma
    // sesión (app/admin/siblings-actions.ts): un primer intento de
    // refactor dejaba pasar a un N0 escopeado cuando el recurso no
    // tenía Programa, en vez de bloquearlo como el código original.
    expect(canAccessProgram(masterN0, null)).toBe(true);
    expect(canAccessProgram(scopedToLegacy, null)).toBe(false);
  });
});
