import { describe, it, expect } from "vitest";
import { resolveWowStoreSkin, wowStoreSkinVars, DEFAULT_WOWSTORE_SKIN } from "@/lib/wowStoreSkin";
import type { Program, ProgramSkin } from "@/generated/prisma/client";

function program(skins: Partial<ProgramSkin>[]): Program & { skins: ProgramSkin[] } {
  return {
    skins: skins.map((s, i) => ({
      id: `skin-${i}`,
      programId: "p1",
      name: "skin",
      designMdRaw: "",
      colors: {},
      lightColors: null,
      font: "Plus Jakarta Sans",
      buttonStyle: "Redondeado, color sólido",
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...s,
    })) as ProgramSkin[],
  } as Program & { skins: ProgramSkin[] };
}

describe("resolveWowStoreSkin", () => {
  it("program null -> fallback fijo", () => {
    expect(resolveWowStoreSkin(null)).toEqual(DEFAULT_WOWSTORE_SKIN);
  });

  it("program sin skins -> fallback fijo", () => {
    expect(resolveWowStoreSkin(program([]))).toEqual(DEFAULT_WOWSTORE_SKIN);
  });

  it("skin activo con colors válido -> usa esos colores + su font", () => {
    const colors = { bg: "#111111", surf: "#222222", surf2: "#333333", ink: "#eeeeee", ink2: "#cccccc", accent: "#ff0000", accentDark: "#990000" };
    const result = resolveWowStoreSkin(program([{ colors, font: "Space Grotesk" }]));
    expect(result).toEqual({ ...colors, font: "Space Grotesk" });
  });

  it("colors malformado (falta una key) -> cae a los colores default, pero conserva el font si es válido", () => {
    const result = resolveWowStoreSkin(program([{ colors: { bg: "#111" }, font: "Inter" }]));
    expect(result.accent).toBe(DEFAULT_WOWSTORE_SKIN.accent);
    expect(result.font).toBe("Inter");
  });

  it("font desconocida (no está en KNOWN_FONTS) -> cae a Plus Jakarta Sans", () => {
    const colors = { bg: "#111111", surf: "#222222", surf2: "#333333", ink: "#eeeeee", ink2: "#cccccc", accent: "#ff0000", accentDark: "#990000" };
    const result = resolveWowStoreSkin(program([{ colors, font: "Comic Sans MS" }]));
    expect(result.font).toBe("Plus Jakarta Sans");
    expect(result.accent).toBe("#ff0000");
  });
});

describe("wowStoreSkinVars", () => {
  it("mapea cada color a su variable CSS, con un acento más claro derivado", () => {
    const vars = wowStoreSkinVars(DEFAULT_WOWSTORE_SKIN);
    expect(vars["--ws-bg"]).toBe(DEFAULT_WOWSTORE_SKIN.bg);
    expect(vars["--ws-accent"]).toBe(DEFAULT_WOWSTORE_SKIN.accent);
    expect(vars["--ws-accent-light"]).toMatch(/^#[0-9a-f]{6}$/);
    expect(vars["--ws-accent-light"]).not.toBe(DEFAULT_WOWSTORE_SKIN.accent);
    expect(vars["--ws-font"]).toBe(`"${DEFAULT_WOWSTORE_SKIN.font}"`);
  });
});
