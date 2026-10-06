// Editor de Modales -- Reorganización completa (2026-10-06, pedido de
// Gunnar: "necesito que el modal pueda editarlo.. tanto los componentes
// que lo integran como el contenido.. en este modal y en todos los
// demás.. organizarlo bien top1% para que sea fácil para el usuario e
// intuitivo"). Registro único de los modales que un N0 puede tocar
// desde /admin/programs/[id], para que el hub nuevo ("Editor de
// Modales") y la acción que lo guarda lean de la misma lista -- nunca
// se repiten las claves a mano en dos lugares.
//
// Deliberadamente AFUERA de esta lista: od/ancient/medal/contacts NO
// entran con ícono acá (el suyo es dinámico, el de la Puesto/EscalaItem
// elegida en Categorización -- un override acá se pisaría con ese), na/
// versionInfo (contenido de sistema, no autoría del N0), legado (dueño
// del destinatario, no del Programa). Las 4 primeras sí entran para el
// texto introductorio (ver TIER_MODAL_KEYS más abajo) -- ahí no hay
// conflicto, la selección de nivel sigue intacta.
export type IconModalKey = "cardInfo" | "vault" | "info" | "invite" | "contactMessage" | "story";

export const ICON_MODAL_KEYS: IconModalKey[] = ["cardInfo", "vault", "info", "invite", "contactMessage", "story"];

export type TierModalKey = "od" | "ancient" | "medal" | "contacts";

export const TIER_MODAL_KEYS: TierModalKey[] = ["od", "ancient", "medal", "contacts"];

export type ModalContentKind = "bloques" | "niveles" | "automatico";

export type ModalEditorEntry = {
  key: IconModalKey | TierModalKey;
  name: string;
  defaultIcon: string;
  contentKind: ModalContentKind;
  // Dónde editar el contenido real (bloques o niveles) -- un ancla a la
  // sección que ya existe, no se duplica el editor acá.
  contentHint: string;
};

export const MODAL_EDITOR_ENTRIES: ModalEditorEntry[] = [
  { key: "cardInfo", name: '"LyCard" / "[Programa] Card"', defaultIcon: "military_tech", contentKind: "bloques", contentHint: 'Contenido en "Modal “Qué es esta tarjeta”", más abajo.' },
  { key: "vault", name: "Bóveda Legacy", defaultIcon: "lock", contentKind: "bloques", contentHint: 'Contenido en "Bóveda Legacy", más abajo.' },
  { key: "info", name: "Info (cubo dorado)", defaultIcon: "diamond", contentKind: "automatico", contentHint: "Texto fijo del tipo de tarjeta -- no editable esta vuelta." },
  { key: "invite", name: "Enviar Invitación", defaultIcon: "mail", contentKind: "automatico", contentHint: "Formulario funcional -- no editable esta vuelta." },
  { key: "contactMessage", name: "Enviar Mensaje", defaultIcon: "chat", contentKind: "automatico", contentHint: "Formulario funcional -- no editable esta vuelta." },
  { key: "story", name: "Mi camino", defaultIcon: "auto_stories", contentKind: "automatico", contentHint: "Lo escribe cada dueño desde /m/dashboard, no el N0." },
  { key: "od", name: "O.D. (Puesto)", defaultIcon: "diamond", contentKind: "niveles", contentHint: 'Niveles reales en "Categorización", más abajo.' },
  { key: "ancient", name: "Ancient (Rango)", defaultIcon: "auto_awesome", contentKind: "niveles", contentHint: 'Niveles reales en "Categorización", más abajo.' },
  { key: "medal", name: "Medalla", defaultIcon: "workspace_premium", contentKind: "niveles", contentHint: 'Niveles reales en "Categorización", más abajo.' },
  { key: "contacts", name: "Badge de Valor", defaultIcon: "military_tech", contentKind: "niveles", contentHint: 'Niveles reales en "Categorización", más abajo.' },
];

function parseStringRecord(json: unknown): Record<string, string> {
  if (!json || typeof json !== "object" || Array.isArray(json)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(json as Record<string, unknown>)) {
    if (typeof v === "string" && v.trim()) out[k] = v.trim();
  }
  return out;
}

export function parseModalIcons(json: unknown): Record<string, string> {
  return parseStringRecord(json);
}

export function parseTierIntros(json: unknown): Record<string, string> {
  return parseStringRecord(json);
}
