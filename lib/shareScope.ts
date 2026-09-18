export type CardKind = "project" | "company" | "personal";

export const CARD_KINDS: CardKind[] = ["project", "company", "personal"];

export const CARD_KIND_LABEL: Record<CardKind, string> = {
  project: "Mi camino con Legacy",
  company: "Mi Empresa",
  personal: "Personal",
};

// Qué otros `kind` de las 3 tarjetas de un Member sumar al carrusel al
// abrir ESTA tarjeta puntual (2026-09-19). Vacío = esta tarjeta se ve
// sola — nunca asume que "las 3 son lo mismo" a menos que el dueño lo
// prenda a mano por cada una.
export function parseShareScope(value: unknown): CardKind[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is CardKind => CARD_KINDS.includes(v as CardKind));
}
