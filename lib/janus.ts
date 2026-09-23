// Janus — el motor de emparejamiento "todos contra todos" (pedido de
// Gunnar, 2026-09-23, sobre el documento de estrategia B4W). Cruza el
// set `busco` de una Card contra el `ofrezco` de TODAS las demás, sobre
// toda la red — no solo dentro de un Programa. El caso B4W (certificación
// industrial requerida vs. certificación que tiene una PyME) y el caso
// "alguien quiere un sandwich de miga y alguien lo tiene" son el mismo
// cálculo genérico, no dos sistemas.
//
// v1 a propósito simple, sin IA — mismo criterio honesto que
// lib/nashMesh.ts: similitud de texto (exacta o por contención de
// palabra), no embeddings ni matching semántico. Cuando eso llegue, es
// la misma forma de datos (CardTagSet), solo cambia tagSimilarity.

export type CardTagSet = {
  cardId: string;
  cardName: string;
  ofrezco: string[]; // ya normalizados (lib/tags.ts#normalizeTagText)
  busco: string[];
};

export type MatchedPair = { buscoTag: string; ofrezcoTag: string; score: number };

export type CardMatch = {
  fromCardId: string;
  fromCardName: string;
  toCardId: string;
  toCardName: string;
  score: number; // 0-1, promedio del mejor match por cada tag "busco"
  pairs: MatchedPair[];
};

// 1 = coincidencia exacta. 0.6 = una contiene a la otra como palabra
// (mín. 3 caracteres cada una, para que "es"/"la" no generen falsos
// positivos con cualquier tag). 0 = sin relación.
export function tagSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length >= 3 && b.length >= 3 && (a.includes(b) || b.includes(a))) return 0.6;
  return 0;
}

// El cruce en una sola dirección: qué tan bien cubre `to.ofrezco` lo que
// `from.busco` necesita. null cuando no hay match real (nunca un score
// 0 metido en la lista) o cuando a alguno de los dos lados le faltan
// tags — nada que cruzar todavía, caso honesto, no un 0% engañoso.
export function computeCardPairMatch(from: CardTagSet, to: CardTagSet): CardMatch | null {
  if (from.busco.length === 0 || to.ofrezco.length === 0) return null;

  const pairs: MatchedPair[] = [];
  let total = 0;
  for (const buscoTag of from.busco) {
    let best: MatchedPair | null = null;
    for (const ofrezcoTag of to.ofrezco) {
      const score = tagSimilarity(buscoTag, ofrezcoTag);
      if (score > 0 && (!best || score > best.score)) {
        best = { buscoTag, ofrezcoTag, score };
      }
    }
    if (best) {
      pairs.push(best);
      total += best.score;
    }
  }

  const score = total / from.busco.length;
  if (score === 0) return null;

  return { fromCardId: from.cardId, fromCardName: from.cardName, toCardId: to.cardId, toCardName: to.cardName, score, pairs };
}

// "Todos contra todos" de verdad: cada ordered pair (A busca, B ofrece)
// es un match distinto de (B busca, A ofrece) — direcciones separadas a
// propósito, ranking global por score descendente.
export function computeAllMatches(cards: CardTagSet[]): CardMatch[] {
  const matches: CardMatch[] = [];
  for (const from of cards) {
    for (const to of cards) {
      if (from.cardId === to.cardId) continue;
      const match = computeCardPairMatch(from, to);
      if (match) matches.push(match);
    }
  }
  return matches.sort((a, b) => b.score - a.score);
}
