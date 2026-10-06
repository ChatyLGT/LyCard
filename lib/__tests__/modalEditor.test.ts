import { describe, it, expect } from "vitest";
import { parseModalIcons, parseTierIntros, MODAL_EDITOR_ENTRIES, ICON_MODAL_KEYS, TIER_MODAL_KEYS } from "@/lib/modalEditor";

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
  it("tiene una entrada por cada clave de ícono y de nivel, sin duplicados", () => {
    const keys = MODAL_EDITOR_ENTRIES.map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toEqual([...ICON_MODAL_KEYS, ...TIER_MODAL_KEYS]);
  });

  it("cada entrada declara nombre, ícono default y tipo de contenido", () => {
    for (const entry of MODAL_EDITOR_ENTRIES) {
      expect(entry.name.length).toBeGreaterThan(0);
      expect(entry.defaultIcon.length).toBeGreaterThan(0);
      expect(["bloques", "niveles", "automatico"]).toContain(entry.contentKind);
      expect(entry.contentHint.length).toBeGreaterThan(0);
    }
  });
});
