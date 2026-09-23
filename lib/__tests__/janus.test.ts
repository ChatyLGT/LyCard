import { describe, it, expect } from "vitest";
import { tagSimilarity, computeCardPairMatch, computeAllMatches, type CardTagSet } from "@/lib/janus";

// Janus (pedido de Gunnar, 2026-09-23) — el motor de "todos contra
// todos". Si esto falla mal, alguien ve un match falso (0% presentado
// como compatible) o se pierde un match real (el caso "sandwich de
// miga" es el ejemplo literal que dio Gunnar) — vale la pena cubrirlo
// a fondo.

describe("tagSimilarity", () => {
  it("coincidencia exacta = 1", () => {
    expect(tagSimilarity("sandwich de miga", "sandwich de miga")).toBe(1);
  });

  it("una contiene a la otra (ambas >=3 caracteres) = 0.6", () => {
    expect(tagSimilarity("sandwich", "sandwich de miga")).toBe(0.6);
    expect(tagSimilarity("sandwich de miga", "miga")).toBe(0.6);
  });

  it("sin relación = 0", () => {
    expect(tagSimilarity("sandwich de miga", "certificacion iso 9001")).toBe(0);
  });

  it("contención con un lado menor a 3 caracteres no cuenta (evita falsos positivos tipo 'es')", () => {
    expect(tagSimilarity("es", "estrategia de ventas")).toBe(0);
  });

  it("string vacío de cualquier lado = 0, nunca crashea", () => {
    expect(tagSimilarity("", "algo")).toBe(0);
    expect(tagSimilarity("algo", "")).toBe(0);
    expect(tagSimilarity("", "")).toBe(0);
  });
});

const cardA: CardTagSet = { cardId: "a", cardName: "Ana", ofrezco: ["sandwich de miga"], busco: ["certificacion iso 9001"] };
const cardB: CardTagSet = { cardId: "b", cardName: "Beto", ofrezco: ["certificacion iso 9001", "acero laminado"], busco: ["sandwich de miga"] };
const cardC: CardTagSet = { cardId: "c", cardName: "Cami", ofrezco: [], busco: [] };

describe("computeCardPairMatch", () => {
  it("match real: A busca lo que B ofrece, exacto", () => {
    const match = computeCardPairMatch(cardA, cardB);
    expect(match).not.toBeNull();
    expect(match?.score).toBe(1);
    expect(match?.pairs).toEqual([{ buscoTag: "certificacion iso 9001", ofrezcoTag: "certificacion iso 9001", score: 1 }]);
  });

  it("el caso Gunnar: B busca el sandwich de miga que A ofrece", () => {
    const match = computeCardPairMatch(cardB, cardA);
    expect(match?.score).toBe(1);
    expect(match?.fromCardName).toBe("Beto");
    expect(match?.toCardName).toBe("Ana");
  });

  it("promedia cuando solo parte de lo buscado tiene match", () => {
    const buscaDos: CardTagSet = { cardId: "d", cardName: "Dani", ofrezco: [], busco: ["certificacion iso 9001", "algo que nadie tiene"] };
    const match = computeCardPairMatch(buscaDos, cardB);
    expect(match?.score).toBe(0.5); // 1 de 2 tags encontró match
  });

  it("elige el MEJOR match cuando hay más de un candidato posible", () => {
    const buscaAcero: CardTagSet = { cardId: "e", cardName: "Eli", ofrezco: [], busco: ["acero"] };
    const match = computeCardPairMatch(buscaAcero, cardB);
    expect(match?.pairs[0]).toEqual({ buscoTag: "acero", ofrezcoTag: "acero laminado", score: 0.6 });
  });

  it("no reemplaza el mejor candidato ya encontrado por uno con score igual o menor", () => {
    const dosOfertasExactas: CardTagSet = { cardId: "i", cardName: "Ivo", ofrezco: ["cafe", "cafe"], busco: [] };
    const buscaCafe: CardTagSet = { cardId: "j", cardName: "Jose", ofrezco: [], busco: ["cafe"] };
    const match = computeCardPairMatch(buscaCafe, dosOfertasExactas);
    expect(match?.pairs).toHaveLength(1);
    expect(match?.score).toBe(1);
  });

  it("sin tags 'busco' del lado que pregunta, no hay nada que cruzar (null, no un 0% falso)", () => {
    expect(computeCardPairMatch(cardC, cardB)).toBeNull();
  });

  it("sin tags 'ofrezco' del lado contrario, tampoco (null)", () => {
    expect(computeCardPairMatch(cardA, cardC)).toBeNull();
  });

  it("hay tags de los dos lados pero ninguno cruza -> null, no un match con score 0", () => {
    const buscaOtraCosa: CardTagSet = { cardId: "f", cardName: "Fer", ofrezco: [], busco: ["algo completamente distinto"] };
    expect(computeCardPairMatch(buscaOtraCosa, cardB)).toBeNull();
  });
});

describe("computeAllMatches", () => {
  it("todos contra todos: A y B se emparejan en las dos direcciones, nunca contra sí mismas", () => {
    const matches = computeAllMatches([cardA, cardB, cardC]);
    expect(matches).toHaveLength(2);
    expect(matches.some((m) => m.fromCardId === "a" && m.toCardId === "a")).toBe(false);
    expect(matches.some((m) => m.fromCardId === "b" && m.toCardId === "b")).toBe(false);
  });

  it("ranking por score descendente", () => {
    const buscaParcial: CardTagSet = { cardId: "g", cardName: "Gus", ofrezco: [], busco: ["certificacion iso 9001", "algo raro"] };
    const matches = computeAllMatches([cardA, cardB, buscaParcial]);
    for (let i = 1; i < matches.length; i++) {
      expect(matches[i - 1].score).toBeGreaterThanOrEqual(matches[i].score);
    }
  });

  it("sin ningún cruce real en toda la red, lista vacía", () => {
    const solo: CardTagSet = { cardId: "h", cardName: "Hugo", ofrezco: ["algo"], busco: ["otra cosa"] };
    expect(computeAllMatches([solo, cardC])).toEqual([]);
  });
});
