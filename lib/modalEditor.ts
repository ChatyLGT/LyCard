// Editor de Modales -- Unificación completa (2026-10-06, pedido de
// Gunnar: "no se que has echo.. me diste la opcion de cambiar el
// icono.. pero en ningun lado puedo leer ni se donde esta el texto
// del título o del contenido del modal de cardinfo" -> "dale con
// todos los 14, hacelo bien completo"). Antes esto cubría 10 modales
// y solo ícono+intro -- el título/botón vivía en otra sección
// ("Textos de Botones y Modales") y el contenido pesado en otra más
// (Bóveda/"Qué es esta tarjeta"), sin relación visible entre sí. Este
// registro ahora describe los 14 modales reales de la tarjeta
// (components/LyCardView.tsx, type ModalKey) en un solo lugar, y cada
// uno declara EXACTAMENTE qué partes tiene y dónde viven -- para que
// /admin/programs/[id] pueda renderizar una fila por modal con todo
// junto (ícono + texto del botón + contenido), un solo "Guardar".
export type AnyModalKey =
  | "cardInfo"
  | "vault"
  | "info"
  | "invite"
  | "contactMessage"
  | "story"
  | "od"
  | "ancient"
  | "medal"
  | "contacts"
  | "legado"
  | "na"
  | "versionInfo"
  | "ai_agent";

export const ALL_MODAL_KEYS: AnyModalKey[] = [
  "cardInfo",
  "vault",
  "info",
  "invite",
  "contactMessage",
  "story",
  "od",
  "ancient",
  "medal",
  "contacts",
  "legado",
  "na",
  "versionInfo",
  "ai_agent",
];

export type TierModalKey = "od" | "ancient" | "medal" | "contacts";

// Siguen siendo los únicos 4 que resuelven su nivel real por tile
// (Puesto/EscalaItem elegido en Categorización) -- usado por
// LyCardView.tsx para armar el bundle de traducción de los
// tierIntros.
export const TIER_MODAL_KEYS: TierModalKey[] = ["od", "ancient", "medal", "contacts"];

// bloques: contenido libre (ModalBlocksEditor/modalBlocks[key]).
// niveles: el roster real se edita en Categorización; acá solo el
//   párrafo introductorio (tierIntros[key]).
// fijo: no hay texto libre que editar acá -- o porque es contenido
//   funcional (un formulario), del sistema (versión real), generado
//   (IA) o de otro dueño (el destinatario, no el Programa). bodyHint
//   explica por qué, para que nunca parezca un hueco sin explicación.
export type ModalBodyKind = "bloques" | "niveles" | "fijo";

export type ModalEditorEntry = {
  key: AnyModalKey;
  name: string;
  defaultIcon: string;
  // Dynamic-icon modales (od/ancient/medal/contacts, el ícono real es
  // el de la Puesto/EscalaItem elegida) y los puramente de sistema
  // (na/versionInfo/ai_agent) no entran -- un override acá se pisaría
  // con esa fuente, o no tiene sentido (no son "marca" del N0).
  iconEditable: boolean;
  // Clave dentro de Program.cardLabels (lib/cardLabels.ts) que guarda
  // el texto del botón/kicker que abre este modal -- null si ese texto
  // no es overridable (dinámico, de sistema, o del destinatario).
  kickerFieldKey: string | null;
  bodyKind: ModalBodyKind;
  // Siempre presente, incluso en bodyKind:"fijo" -- explica dónde vive
  // (o por qué no hay) el contenido libre de este modal.
  bodyHint: string;
};

export const MODAL_EDITOR_ENTRIES: ModalEditorEntry[] = [
  {
    key: "cardInfo",
    name: '"LyCard" / "[Programa] Card"',
    defaultIcon: "military_tech",
    iconEditable: true,
    kickerFieldKey: "cardInfoKicker",
    bodyKind: "bloques",
    bodyHint: "Armalo con bloques (texto, imagen, video/audio, archivo, KPI) -- vacío cae al texto genérico de siempre.",
  },
  {
    key: "vault",
    name: "Bóveda Legacy",
    defaultIcon: "lock",
    iconEditable: true,
    kickerFieldKey: null,
    bodyKind: "bloques",
    bodyHint: 'Título y palabra secreta propios (campos abajo, en esta misma fila) + contenido con bloques.',
  },
  {
    key: "info",
    name: "Info (cubo dorado)",
    defaultIcon: "diamond",
    iconEditable: true,
    kickerFieldKey: "infoKicker",
    bodyKind: "bloques",
    bodyHint: "Armalo con bloques -- vacío cae al texto genérico de siempre. En Cards de empresa, en cambio, siempre se muestra el título/cita reales de esa Card (no se pisan).",
  },
  {
    key: "invite",
    name: "Enviar Invitación",
    defaultIcon: "mail",
    iconEditable: true,
    kickerFieldKey: "inviteKicker",
    bodyKind: "fijo",
    bodyHint: "Formulario funcional de Destinatarios -- no es contenido libre.",
  },
  {
    key: "contactMessage",
    name: "Enviar Mensaje",
    defaultIcon: "chat",
    iconEditable: true,
    kickerFieldKey: "contactKicker",
    bodyKind: "fijo",
    bodyHint: "Formulario funcional de contacto -- no es contenido libre.",
  },
  {
    key: "story",
    name: "Mi camino",
    defaultIcon: "auto_stories",
    iconEditable: true,
    kickerFieldKey: "storyKicker",
    bodyKind: "fijo",
    bodyHint: "Lo escribe cada dueño desde /m/dashboard -- es su historia personal, no la del Programa.",
  },
  {
    key: "od",
    name: "O.D. (Puesto)",
    defaultIcon: "diamond",
    iconEditable: false,
    kickerFieldKey: null,
    bodyKind: "niveles",
    bodyHint: 'Ícono dinámico (el del Puesto elegido). Roster real en "Categorización", más abajo -- acá solo el texto introductorio.',
  },
  {
    key: "ancient",
    name: "Ancient (Rango)",
    defaultIcon: "auto_awesome",
    iconEditable: false,
    kickerFieldKey: "ancKicker",
    bodyKind: "niveles",
    bodyHint: 'Ícono dinámico. Roster real en "Categorización", más abajo -- acá el encabezado y el texto introductorio.',
  },
  {
    key: "medal",
    name: "Medalla",
    defaultIcon: "workspace_premium",
    iconEditable: false,
    kickerFieldKey: null,
    bodyKind: "niveles",
    bodyHint: 'Ícono y encabezado dinámicos (los del nivel elegido). Roster real en "Categorización", más abajo -- acá solo el texto introductorio.',
  },
  {
    key: "contacts",
    name: "Badge de Valor",
    defaultIcon: "military_tech",
    iconEditable: false,
    kickerFieldKey: null,
    bodyKind: "niveles",
    bodyHint: 'Ícono y encabezado dinámicos. Roster real en "Categorización", más abajo -- acá solo el texto introductorio.',
  },
  {
    key: "legado",
    name: "Deja tu Legado",
    defaultIcon: "auto_stories",
    iconEditable: true,
    kickerFieldKey: null,
    bodyKind: "fijo",
    bodyHint: "El Documento de Bienvenida lo arma el propio destinatario en su flujo -- no es contenido del Programa.",
  },
  {
    key: "na",
    name: "Escanear QR / elegir Programa",
    defaultIcon: "qr_code_scanner",
    iconEditable: false,
    kickerFieldKey: null,
    bodyKind: "fijo",
    bodyHint: "Pantalla fija del sistema para visitantes sin relación con la Card -- no editable.",
  },
  {
    key: "versionInfo",
    name: "Versión de la app",
    defaultIcon: "history_edu",
    iconEditable: false,
    kickerFieldKey: null,
    bodyKind: "fijo",
    bodyHint: "La bitácora real de versiones (CHANGELOG) -- no editable, es la verdad de lo que se shippeó.",
  },
  {
    key: "ai_agent",
    name: "Agente de IA (Podio)",
    defaultIcon: "auto_awesome",
    iconEditable: false,
    kickerFieldKey: null,
    bodyKind: "fijo",
    bodyHint: 'Se genera desde "Botones del Podio", en este mismo dashboard -- no se edita acá.',
  },
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
