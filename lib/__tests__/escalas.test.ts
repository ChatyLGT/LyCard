import { describe, it, expect } from "vitest";
import { parseEscala, parseImportedEscala } from "@/lib/escalas";

describe("parseEscala", () => {
  it("devuelve [] si no es un array", () => {
    expect(parseEscala(null)).toEqual([]);
    expect(parseEscala(undefined)).toEqual([]);
    expect(parseEscala("no es un array")).toEqual([]);
    expect(parseEscala({ key: "bronce" })).toEqual([]);
  });

  it("parsea un array de EscalaItem válido", () => {
    const result = parseEscala([
      { key: "bronce", nombre: "Bronce", subtitulo: "Honor", icono: "military_tech", color: "#C8A15A", descripcion: "desc" },
    ]);
    expect(result).toEqual([
      { key: "bronce", nombre: "Bronce", subtitulo: "Honor", icono: "military_tech", color: "#C8A15A", descripcion: "desc" },
    ]);
  });

  it("descarta ítems sin key o sin nombre", () => {
    expect(parseEscala([{ key: "", nombre: "Bronce" }])).toEqual([]);
    expect(parseEscala([{ key: "bronce", nombre: "" }])).toEqual([]);
  });

  it("descarta entradas que no son objetos", () => {
    expect(parseEscala(["string", 5, null, { key: "bronce", nombre: "Bronce" }])).toEqual([
      { key: "bronce", nombre: "Bronce", subtitulo: "", icono: "", color: "", descripcion: "" },
    ]);
  });

  it("trata un key/nombre que no es string como vacío (y lo descarta)", () => {
    expect(parseEscala([{ key: 123, nombre: "Bronce" }])).toEqual([]);
    expect(parseEscala([{ key: "bronce", nombre: 456 }])).toEqual([]);
  });
});

describe("parseImportedEscala", () => {
  it("devuelve [] si el JSON es inválido", () => {
    expect(parseImportedEscala("no es json")).toEqual([]);
    expect(parseImportedEscala("")).toEqual([]);
  });

  it("devuelve [] si el JSON válido no es un array", () => {
    expect(parseImportedEscala('{"key":"bronce"}')).toEqual([]);
  });

  it("lee el shape interno (key/nombre/subtitulo/icono/color/descripcion)", () => {
    const result = parseImportedEscala(
      JSON.stringify([{ key: "bronce", nombre: "Bronce", subtitulo: "Honor", color: "#C8A15A", icono: "military_tech", descripcion: "desc" }])
    );
    expect(result).toEqual([
      { key: "bronce", nombre: "Bronce", subtitulo: "Honor", color: "#C8A15A", icono: "military_tech", descripcion: "desc" },
    ]);
  });

  // El caso real que motivó esto (2026-10-04): Gunnar pegó el bloque que
  // le devolvió un LLM con el shape en español con tildes y mayúsculas.
  it("lee el shape en español con tildes (Clave/Nombre/Subtítulo/Color/Ícono/Descripción)", () => {
    const result = parseImportedEscala(
      JSON.stringify([
        {
          Clave: "critico",
          Nombre: "Crítico",
          Subtítulo: "Impacto Negativo",
          Color: "#D32F2F",
          Ícono: "dangerous",
          Descripción: "Riesgo operativo alto.",
        },
      ])
    );
    expect(result).toEqual([
      { key: "critico", nombre: "Crítico", subtitulo: "Impacto Negativo", color: "#D32F2F", icono: "dangerous", descripcion: "Riesgo operativo alto." },
    ]);
  });

  it("deriva la clave del nombre (slugificado) cuando no viene Clave", () => {
    const result = parseImportedEscala(JSON.stringify([{ nombre: "Imán Corporativo", subtitulo: "Alianzas" }]));
    expect(result).toEqual([
      { key: "iman_corporativo", nombre: "Imán Corporativo", subtitulo: "Alianzas", color: "", icono: "", descripcion: "" },
    ]);
  });

  it("descarta entradas sin nombre (no hay de dónde derivar la clave)", () => {
    expect(parseImportedEscala(JSON.stringify([{ subtitulo: "Honor" }, { nombre: "", subtitulo: "x" }]))).toEqual([]);
  });

  it("ignora entradas que no son objetos, sin romper el resto del array", () => {
    const result = parseImportedEscala(JSON.stringify(["x", 5, null, { key: "bronce", nombre: "Bronce" }]));
    expect(result).toEqual([{ key: "bronce", nombre: "Bronce", subtitulo: "", color: "", icono: "", descripcion: "" }]);
  });
});
