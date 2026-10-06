import { describe, it, expect } from "vitest";
import { parseModalIcons, parseTierIntros, MODAL_EDITOR_ENTRIES, ALL_MODAL_KEYS, TIER_MODAL_KEYS } from "@/lib/modalEditor";

describe("parseModalIcons", () => {
  it("devuelve {} si no es un objeto", () => {
    expect(parseModalIcons(null)).toEqual({});
    expect(parseModalIcons(undefined)).toEqual({});
    expect(parseModalIcons("no es un objeto")).toEqual({});
    expect(parseModalIcons(["cardInfo"])).toEqual({});
  });

  it("conserva solo claves con string no vacío, recortado", () => {
    expect(parseModalIcons({ cardInfo: " military_tech ", vault: "", invite: 5, story: null })).toEqual({
      cardInfo: "military_tech",
    });
  });
});

describe("parseTierIntros", () => {
  it("devuelve {} si no es un objeto", () => {
    expect(parseTierIntros(null)).toEqual({});
    expect(parseTierIntros([1, 2])).toEqual({});
  });

  it("conserva solo strings no vacíos", () => {
    expect(parseTierIntros({ od: "Texto real", ancient: "   " })).toEqual({ od: "Texto real" });
  });
});

describe("MODAL_EDITOR_ENTRIES", () => {
  it("tiene una entrada por cada uno de los 14 modales reales, sin duplicados, mismo orden que ALL_MODAL_KEYS", () => {
    const keys = MODAL_EDITOR_ENTRIES.map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toEqual(ALL_MODAL_KEYS);
    expect(keys.length).toBe(14);
  });

  it("los 4 de TIER_MODAL_KEYS están todos en el registro con bodyKind:'niveles'", () => {
    for (const key of TIER_MODAL_KEYS) {
      const entry = MODAL_EDITOR_ENTRIES.find((e) => e.key === key);
      expect(entry?.bodyKind).toBe("niveles");
    }
  });

  it("cada entrada declara nombre, ícono default, bodyKind válido y bodyHint", () => {
    for (const entry of MODAL_EDITOR_ENTRIES) {
      expect(entry.name.length).toBeGreaterThan(0);
      expect(entry.defaultIcon.length).toBeGreaterThan(0);
      expect(["bloques", "niveles", "fijo"]).toContain(entry.bodyKind);
      expect(entry.bodyHint.length).toBeGreaterThan(0);
      expect(typeof entry.iconEditable).toBe("boolean");
      expect(entry.kickerFieldKey === null || typeof entry.kickerFieldKey === "string").toBe(true);
    }
  });

  it("los 4 modales de nivel real (od/ancient/medal/contacts) tienen ícono dinámico, no editable acá", () => {
    for (const key of TIER_MODAL_KEYS) {
      const entry = MODAL_EDITOR_ENTRIES.find((e) => e.key === key);
      expect(entry?.iconEditable).toBe(false);
    }
  });

  it("los 3 modales con contenido libre real (cardInfo/vault/info) declaran bodyKind:'bloques'", () => {
    for (const key of ["cardInfo", "vault", "info"] as const) {
      const entry = MODAL_EDITOR_ENTRIES.find((e) => e.key === key);
      expect(entry?.bodyKind).toBe("bloques");
    }
  });

  it("los modales de sistema/ajenos (na, versionInfo, ai_agent, legado) declaran bodyKind:'fijo' sin kickerFieldKey", () => {
    for (const key of ["na", "versionInfo", "ai_agent", "legado"] as const) {
      const entry = MODAL_EDITOR_ENTRIES.find((e) => e.key === key);
      expect(entry?.bodyKind).toBe("fijo");
      expect(entry?.kickerFieldKey).toBeNull();
    }
  });
});
