import { describe, it, expect } from "vitest";
import { wowJobsFor, WOW_JOBS_CATALOG } from "../wowJobs";

describe("wowJobsFor", () => {
  it("sin fila puente no hay WowJobs", () => {
    expect(wowJobsFor(null)).toEqual([]);
  });
  it("una Oreja (empleado) tiene el WowJob Oreja", () => {
    expect(wowJobsFor({ role: "empleado", programId: "p" })).toEqual([WOW_JOBS_CATALOG.oreja]);
  });
  it("un N0 o el MasterN0 (owner) también pueden abrir el WowJob Oreja", () => {
    expect(wowJobsFor({ role: "owner", programId: "p" })).toEqual([WOW_JOBS_CATALOG.oreja]);
    expect(wowJobsFor({ role: "owner", programId: null })).toEqual([WOW_JOBS_CATALOG.oreja]);
  });
  it("un rol desconocido no abre nada", () => {
    expect(wowJobsFor({ role: "otro", programId: null })).toEqual([]);
  });
});
