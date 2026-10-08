import { describe, expect, it } from "vitest";
import {
  PISTAS,
  ESPACIOS,
  espaciosDePista,
  totalPreguntas,
  findPregunta,
  preguntasDePista,
  primeraPreguntaSinResponder,
  espacioDePregunta,
  estadoEspacio,
} from "@/lib/assistantScript";

describe("lib/assistantScript", () => {
  it("define las 3 pistas en orden: personal, negocio, programa", () => {
    expect(PISTAS.map((p) => p.id)).toEqual(["personal", "negocio", "programa"]);
  });

  it("espaciosDePista filtra por pista", () => {
    const personal = espaciosDePista("personal");
    expect(personal.length).toBeGreaterThan(0);
    expect(personal.every((e) => e.pista === "personal")).toBe(true);

    const programa = espaciosDePista("programa");
    expect(programa.length).toBeGreaterThan(0);
    expect(programa.every((e) => e.pista === "programa")).toBe(true);
  });

  it("la pista negocio no tiene espacios todavía (decisión de N0)", () => {
    expect(espaciosDePista("negocio")).toEqual([]);
    expect(totalPreguntas("negocio")).toBe(0);
  });

  it("totalPreguntas suma las preguntas de todos los espacios de una pista", () => {
    expect(totalPreguntas("programa")).toBe(2); // medal.mide + medal.fuente, el resto vacío
    expect(totalPreguntas("personal")).toBe(0);
  });

  it("findPregunta encuentra una pregunta real por id", () => {
    const p = findPregunta("medal.mide");
    expect(p?.propuesta).toBe("negocio");
    expect(p?.pidePorque).toBe(true);
  });

  it("findPregunta devuelve null si no existe", () => {
    expect(findPregunta("no.existe")).toBeNull();
  });

  it("medal.fuente no tiene propuesta -- a propósito, es Decisión abierta", () => {
    const p = findPregunta("medal.fuente");
    expect(p?.propuesta).toBe("");
    expect(p?.permiteNoSe).toBe(true);
  });

  it("todos los ids de espacio son únicos", () => {
    const ids = ESPACIOS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("todos los ids de pregunta son únicos en todo el guion", () => {
    const ids = ESPACIOS.flatMap((e) => e.preguntas.map((p) => p.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("preguntasDePista devuelve las preguntas de la pista, en orden", () => {
    expect(preguntasDePista("programa").map((p) => p.id)).toEqual(["medal.mide", "medal.fuente"]);
    expect(preguntasDePista("personal")).toEqual([]);
  });

  it("primeraPreguntaSinResponder da la primera que falta responder", () => {
    expect(primeraPreguntaSinResponder("programa", new Set())?.id).toBe("medal.mide");
    expect(primeraPreguntaSinResponder("programa", new Set(["medal.mide"]))?.id).toBe("medal.fuente");
  });

  it("primeraPreguntaSinResponder da null si ya están todas respondidas, o si la pista no tiene ninguna", () => {
    expect(primeraPreguntaSinResponder("programa", new Set(["medal.mide", "medal.fuente"]))).toBeNull();
    expect(primeraPreguntaSinResponder("personal", new Set())).toBeNull();
  });

  it("espacioDePregunta encuentra el espacio dueño de una pregunta real", () => {
    expect(espacioDePregunta("medal.mide")?.id).toBe("medal");
    expect(espacioDePregunta("medal.fuente")?.id).toBe("medal");
  });

  it("espacioDePregunta da null si la pregunta no existe", () => {
    expect(espacioDePregunta("no.existe")).toBeNull();
  });

  it("estadoEspacio da 'pendiente' si el espacio no tiene guion todavía", () => {
    const cardInfo = ESPACIOS.find((e) => e.id === "cardInfo")!;
    expect(estadoEspacio(cardInfo, new Map())).toBe("pendiente");
  });

  it("estadoEspacio da 'pendiente' si tiene guion pero nada respondido", () => {
    const medal = ESPACIOS.find((e) => e.id === "medal")!;
    expect(estadoEspacio(medal, new Map())).toBe("pendiente");
  });

  it("estadoEspacio da 'propuesto' con al menos una respuesta y ninguna decisión abierta", () => {
    const medal = ESPACIOS.find((e) => e.id === "medal")!;
    expect(estadoEspacio(medal, new Map([["medal.mide", "propuesto"]]))).toBe("propuesto");
    expect(estadoEspacio(medal, new Map([["medal.mide", "propuesto"], ["medal.fuente", "propuesto"]]))).toBe("propuesto");
  });

  it("estadoEspacio da 'abierto' si al menos una respuesta quedó como decisión abierta", () => {
    const medal = ESPACIOS.find((e) => e.id === "medal")!;
    expect(estadoEspacio(medal, new Map([["medal.mide", "propuesto"], ["medal.fuente", "abierto"]]))).toBe("abierto");
    expect(estadoEspacio(medal, new Map([["medal.fuente", "abierto"]]))).toBe("abierto");
  });
});
