import { describe, it, expect } from "vitest";
import {
  BIZTOCARD_PERSONAL_PREGUNTAS,
  BIZTOCARD_TOTAL_PREGUNTAS,
  primeraPreguntaSinResponder,
  preguntaPorId,
  preguntaPorPaso,
} from "../bizToCardScript";

describe("bizToCardScript", () => {
  it("tiene 6 preguntas: 4 de Nivel 1, 2 de Nivel 2", () => {
    expect(BIZTOCARD_PERSONAL_PREGUNTAS).toHaveLength(6);
    expect(BIZTOCARD_TOTAL_PREGUNTAS).toBe(6);
    expect(BIZTOCARD_PERSONAL_PREGUNTAS.filter((p) => p.nivel === 1)).toHaveLength(4);
    expect(BIZTOCARD_PERSONAL_PREGUNTAS.filter((p) => p.nivel === 2)).toHaveLength(2);
  });

  it("cada pregunta tiene un id único con formato personal.<campo>", () => {
    const ids = BIZTOCARD_PERSONAL_PREGUNTAS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^personal\./);
  });

  describe("primeraPreguntaSinResponder", () => {
    it("con la Card totalmente vacía, devuelve la primera (nombre)", () => {
      const pregunta = primeraPreguntaSinResponder({});
      expect(pregunta?.id).toBe("personal.nombre");
    });

    it("salta las ya respondidas y devuelve la próxima vacía", () => {
      const pregunta = primeraPreguntaSinResponder({ name: "Juancho", title: "Oreja" });
      expect(pregunta?.id).toBe("personal.frase");
    });

    it("ignora campos que son solo espacios en blanco -- no cuentan como respondidos", () => {
      const pregunta = primeraPreguntaSinResponder({ name: "   " });
      expect(pregunta?.id).toBe("personal.nombre");
    });

    it("con las 6 respondidas, devuelve null", () => {
      const pregunta = primeraPreguntaSinResponder({
        name: "Juancho",
        title: "Oreja",
        quote: "Escucho antes de hablar.",
        wa: "+52 1 55 0000 0000",
        storyQuote: "Llegué por casualidad, me quedé por convicción.",
        storyBody: "Historia larga acá.",
      });
      expect(pregunta).toBeNull();
    });
  });

  describe("preguntaPorId", () => {
    it("encuentra una pregunta real por su id", () => {
      expect(preguntaPorId("personal.whatsapp")?.campo).toBe("wa");
    });

    it("devuelve undefined para un id que no existe", () => {
      expect(preguntaPorId("personal.inventado")).toBeUndefined();
    });
  });

  describe("preguntaPorPaso", () => {
    it("devuelve la pregunta en la posición dada", () => {
      expect(preguntaPorPaso(0)?.id).toBe("personal.nombre");
      expect(preguntaPorPaso(5)?.id).toBe("personal.camino_historia");
    });

    it("devuelve undefined fuera de rango", () => {
      expect(preguntaPorPaso(6)).toBeUndefined();
      expect(preguntaPorPaso(-1)).toBeUndefined();
    });
  });
});
