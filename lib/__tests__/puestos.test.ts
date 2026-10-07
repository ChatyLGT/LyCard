import { describe, expect, it } from "vitest";
import { parsePuestoTemplatePayload } from "@/lib/puestos";

describe("parsePuestoTemplatePayload", () => {
  it("parsea un array válido, completando icono/order por defecto", () => {
    const result = parsePuestoTemplatePayload([
      { siglas: "O.D.", denominacion: "Original Dreamer", descripcion: "El primero." },
      { siglas: "F.", denominacion: "Founder", descripcion: "", icono: "star", order: 5 },
    ]);
    expect(result).toEqual([
      { siglas: "O.D.", denominacion: "Original Dreamer", descripcion: "El primero.", icono: "diamond", order: 0 },
      { siglas: "F.", denominacion: "Founder", descripcion: "", icono: "star", order: 5 },
    ]);
  });

  it("descarta filas sin siglas o sin denominación", () => {
    const result = parsePuestoTemplatePayload([
      { siglas: "", denominacion: "Sin sigla" },
      { siglas: "X.", denominacion: "" },
      { siglas: "Y.", denominacion: "Válido" },
    ]);
    expect(result).toEqual([{ siglas: "Y.", denominacion: "Válido", descripcion: "", icono: "diamond", order: 2 }]);
  });

  it("siglas/denominacion no-string (ej. ausentes o de otro tipo) caen a string vacío y se descartan", () => {
    expect(parsePuestoTemplatePayload([{ siglas: 123, order: 0 }])).toEqual([]);
    expect(parsePuestoTemplatePayload([{ denominacion: true, siglas: "Z." }])).toEqual([]);
  });

  it("no es un array -> []", () => {
    expect(parsePuestoTemplatePayload(null)).toEqual([]);
    expect(parsePuestoTemplatePayload({ siglas: "X" })).toEqual([]);
    expect(parsePuestoTemplatePayload("texto")).toEqual([]);
  });

  it("filas no-objeto dentro del array se descartan sin romper", () => {
    expect(parsePuestoTemplatePayload([null, "x", 5, { siglas: "Z.", denominacion: "Zeta" }])).toEqual([
      { siglas: "Z.", denominacion: "Zeta", descripcion: "", icono: "diamond", order: 0 },
    ]);
  });
});
