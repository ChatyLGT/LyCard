import { describe, expect, it } from "vitest";
import { PRESETS, presetDePrograma } from "@/lib/assistantPresets";

describe("lib/assistantPresets", () => {
  it("el preset de Legacy existe pero está vacío a propósito (doc: 'puede estar casi vacío')", () => {
    expect(PRESETS.legacy).toEqual({});
  });

  it("presetDePrograma da null si no hay programa (sin programId, ej. la Card isOrigin)", () => {
    expect(presetDePrograma(null, "medal.mide")).toBeNull();
  });

  it("presetDePrograma da null si el programa no tiene preset cargado para esa pregunta", () => {
    expect(presetDePrograma("legacy", "medal.fuente")).toBeNull();
  });

  it("presetDePrograma da null para un programa que no tiene ningún preset definido", () => {
    expect(presetDePrograma("programa-que-no-existe", "medal.mide")).toBeNull();
  });
});
