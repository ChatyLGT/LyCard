import { describe, it, expect } from "vitest";
import { parseAutonomyLevel, parseToolKeys, labelForToolKey, parseHabilidades, EXAMPLE_ESPECIALISTAS } from "@/lib/especialistas";

describe("parseAutonomyLevel", () => {
  it("acepta los 3 niveles válidos", () => {
    expect(parseAutonomyLevel("sugiere")).toBe("sugiere");
    expect(parseAutonomyLevel("actua_con_ok")).toBe("actua_con_ok");
    expect(parseAutonomyLevel("actua_solo")).toBe("actua_solo");
  });

  it("cualquier otra cosa cae a 'sugiere'", () => {
    expect(parseAutonomyLevel("volando_solo")).toBe("sugiere");
    expect(parseAutonomyLevel(undefined)).toBe("sugiere");
    expect(parseAutonomyLevel(null)).toBe("sugiere");
  });
});

describe("parseToolKeys", () => {
  it("filtra solo strings no vacíos de un array", () => {
    expect(parseToolKeys(["wowawe", "", "modo-foco", 42, null])).toEqual(["wowawe", "modo-foco"]);
  });

  it("algo que no es array da lista vacía", () => {
    expect(parseToolKeys("wowawe")).toEqual([]);
    expect(parseToolKeys(undefined)).toEqual([]);
    expect(parseToolKeys(null)).toEqual([]);
  });
});

describe("labelForToolKey", () => {
  it("prioriza el nombre real de una WowApp si está en el mapa", () => {
    expect(labelForToolKey("wowawe", { wowawe: "WowAwe -- Caminata de Asombro" })).toBe("WowAwe -- Caminata de Asombro");
  });

  it("cae al nombre fijo de un OfficeSkill si no es una WowApp conocida", () => {
    expect(labelForToolKey("modo-foco", {})).toBe("Modo Foco");
  });

  it("si no matchea ninguno de los dos, devuelve el key tal cual", () => {
    expect(labelForToolKey("algo-inventado", {})).toBe("algo-inventado");
  });
});

describe("EXAMPLE_ESPECIALISTAS", () => {
  it("tiene a Calma con WowAwe + Modo Foco como herramientas", () => {
    const calma = EXAMPLE_ESPECIALISTAS.find((e) => e.key === "calma");
    expect(calma).toBeDefined();
    expect(calma!.toolKeys).toEqual(["wowawe", "modo-foco"]);
    expect(calma!.suggestion.length).toBeGreaterThan(0);
  });

  it("tiene su CV -- habilidades", () => {
    const calma = EXAMPLE_ESPECIALISTAS.find((e) => e.key === "calma");
    expect(calma!.habilidades.length).toBeGreaterThan(0);
  });
});

describe("parseHabilidades", () => {
  it("filtra solo strings no vacíos", () => {
    expect(parseHabilidades(["Enfoque", "", 1, "Bienestar"])).toEqual(["Enfoque", "Bienestar"]);
  });

  it("algo que no es array da lista vacía", () => {
    expect(parseHabilidades(undefined)).toEqual([]);
  });
});
