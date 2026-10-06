import { describe, it, expect } from "vitest";
import { hashBundle, parseTranslationResponse } from "@/lib/translation";

describe("hashBundle", () => {
  it("devuelve el mismo hash sin importar el orden de las claves", () => {
    const a = hashBundle({ title: "Hola", quote: "cita" });
    const b = hashBundle({ quote: "cita", title: "Hola" });
    expect(a).toBe(b);
  });

  it("cambia si cambia cualquier valor", () => {
    const a = hashBundle({ title: "Hola" });
    const b = hashBundle({ title: "Chau" });
    expect(a).not.toBe(b);
  });

  it("cambia si cambia el set de claves", () => {
    const a = hashBundle({ title: "Hola" });
    const b = hashBundle({ title: "Hola", quote: "cita" });
    expect(a).not.toBe(b);
  });
});

describe("parseTranslationResponse", () => {
  const keys = ["title", "quote"];

  it("parsea JSON directo", () => {
    expect(parseTranslationResponse('{"title":"Hello","quote":"the quote"}', keys)).toEqual({
      title: "Hello",
      quote: "the quote",
    });
  });

  it("extrae el primer objeto {...} si vino envuelto en texto/backticks", () => {
    const raw = "```json\n{\"title\":\"Hello\"}\n```";
    expect(parseTranslationResponse(raw, keys)).toEqual({ title: "Hello" });
  });

  it("devuelve {} si no hay ningún objeto JSON", () => {
    expect(parseTranslationResponse("no es json", keys)).toEqual({});
  });

  it("devuelve {} si el objeto {...} encontrado está mal formado", () => {
    expect(parseTranslationResponse("texto {esto no es json válido}", keys)).toEqual({});
  });

  it("descarta claves no pedidas (el modelo inventó una)", () => {
    expect(parseTranslationResponse('{"title":"Hello","invented":"x"}', keys)).toEqual({ title: "Hello" });
  });

  it("descarta valores que no son string o están vacíos", () => {
    expect(parseTranslationResponse('{"title":5,"quote":"   "}', keys)).toEqual({});
  });

  it("devuelve {} si el JSON es un array, no un objeto", () => {
    expect(parseTranslationResponse('["Hello"]', keys)).toEqual({});
  });
});
