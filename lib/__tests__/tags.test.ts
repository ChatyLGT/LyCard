import { describe, it, expect } from "vitest";
import { normalizeTagText, normalizeTagPolarity } from "@/lib/tags";

describe("normalizeTagText", () => {
  it("baja a minúsculas y saca espacios de los bordes", () => {
    expect(normalizeTagText("  Sandwich de Miga  ")).toBe("sandwich de miga");
  });

  it("saca acentos (NFD + strip de marcas combinantes)", () => {
    expect(normalizeTagText("Café")).toBe("cafe");
    expect(normalizeTagText("certificación")).toBe("certificacion");
  });

  it("colapsa espacios múltiples en uno solo", () => {
    expect(normalizeTagText("iso   9001")).toBe("iso 9001");
  });

  it("dos formas distintas de escribir lo mismo normalizan igual", () => {
    expect(normalizeTagText("  CAFÉ  ")).toBe(normalizeTagText("cafe"));
  });
});

describe("normalizeTagPolarity", () => {
  it("'busco' pasa tal cual", () => {
    expect(normalizeTagPolarity("busco")).toBe("busco");
  });

  it("cualquier otra cosa (incluido undefined/vacío/valor corrupto) cae a 'ofrezco'", () => {
    expect(normalizeTagPolarity("ofrezco")).toBe("ofrezco");
    expect(normalizeTagPolarity("")).toBe("ofrezco");
    expect(normalizeTagPolarity(undefined)).toBe("ofrezco");
    expect(normalizeTagPolarity("algo-que-no-existe")).toBe("ofrezco");
  });
});
