// Sistema de Tags (pedido de Gunnar, 2026-09-23) — base de Janus, el
// motor de emparejamiento "todos contra todos". Texto libre a propósito
// (confirmado por Gunnar: "dale con libre") — nada de catálogo cerrado.
// normalizeTagText vive acá (no en lib/janus.ts) porque tanto las
// actions que guardan un Tag como el motor de cruce necesitan la misma
// normalización exacta, sin duplicarla.

export type TagPolarity = "ofrezco" | "busco";

export const TAG_POLARITIES: TagPolarity[] = ["ofrezco", "busco"];

export const TAG_POLARITY_LABEL: Record<TagPolarity, string> = {
  ofrezco: "Ofrezco",
  busco: "Busco",
};

// Sugeridas en la UI (chips), nunca exhaustivas — category sigue siendo
// texto libre, esto es solo para no arrancar de una caja vacía.
export const TAG_CATEGORY_SUGGESTIONS = ["producto", "servicio", "certificación", "talento", "oportunidad"];

export function normalizeTagPolarity(value: unknown): TagPolarity {
  return value === "busco" ? "busco" : "ofrezco";
}

// minúsculas + sin acentos + espacios colapsados, para que "Café" y
// "cafe" crucen igual sin que el N0 tenga que escribir idéntico. NFD +
// stripping de marcas combinantes es el enfoque estándar para acentos
// en JS sin librería nueva.
export function normalizeTagText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");
}

export type TagSummary = {
  id: string;
  text: string;
  polarity: TagPolarity;
  category: string;
  source: string;
};
