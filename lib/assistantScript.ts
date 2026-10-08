// Asistente "Configura tu LyCard" v2 -- el guion ES DATO, no código
// (principio 9 del doc de diseño): las pantallas leen esto, agregar o
// cambiar una pregunta no toca ninguna pantalla. Puro, sin DB, sin
// "use server" -- se importa tanto en Server Components como en
// Client Components.
//
// Alcance de esta entrega (Paso 2 del plan): solo el espacio "medal"
// tiene preguntas reales (las 2 del doc, sección 6.3, ya respondidas
// por N0 en el ensayo). El resto de los 14 modales + los campos del
// Programa + los 2 espacios de la pista personal están acá como
// entradas vacías (`preguntas: []`) a propósito -- así S1 ya puede
// mostrar el mapa completo ("Pendiente, sin guion aún") sin esperar a
// que se escriba el contenido real de cada uno, con N0, usando el
// propio asistente (sección 6.4 del doc).
//
// Puesto (Badge de Puestos) queda AFUERA -- decisión abierta (N0,
// 2026-10-08): es una tabla relacional propia (Puesto), no un modal ni
// un campo Json de Program, y todavía no se decidió si entra como
// espacio del asistente.
//
// La pista "negocio" no tiene ningún espacio todavía -- Decisión de N0
// (2026-10-08): no se crea ninguna Card de negocio para el ensayo, esa
// pista queda "Pendiente, sin tarjeta todavía" hasta que se decida.

export type PistaId = "personal" | "negocio" | "programa";

export type Pista = { id: PistaId; titulo: string };

export const PISTAS: Pista[] = [
  { id: "personal", titulo: "Tu tarjeta personal" },
  { id: "negocio", titulo: "Tu tarjeta de negocio" },
  { id: "programa", titulo: "Tu programa" },
];

export type TipoPregunta = "texto_corto" | "texto_largo" | "opcion_unica" | "opcion_multiple";

export type Opcion = { id: string; texto: string };

export type Pregunta = {
  id: string; // formato "espacio.tema", único en todo el guion
  texto: string;
  textoInvitado: string; // vacío por ahora -- N0 eligió escribir primero para sí mismo
  tipo: TipoPregunta;
  opciones: Opcion[]; // solo cuando tipo es opcion_unica/opcion_multiple
  obligatoria: boolean;
  permiteNoSe: boolean; // siempre true en esta fase
  pidePorque: boolean;
  propuesta: string; // valor por defecto opcional -- "" si no hay
  ayuda: string;
  modos: ("rapido" | "detallado")[]; // en esta fase solo "rapido"
};

export type TipoEspacio = "modal" | "program_field" | "personal_field";

export type Espacio = {
  id: string;
  pista: PistaId;
  titulo: string;
  tipo: TipoEspacio;
  // Qué pisaría esto al publicar -- la clave real del modal
  // (lib/modalEditor.ts) o del campo de Program/Card. Documental en
  // esta entrega: S4 (publicar) todavía no existe.
  claveDestino: string;
  preguntas: Pregunta[];
};

// Los 14 modales reales de la tarjeta (lib/modalEditor.ts,
// MODAL_EDITOR_ENTRIES) -- mismos nombres que ya usa el Editor de
// Modales del dashboard, para no inventar una segunda nomenclatura.
const MODAL_ESPACIOS: Espacio[] = [
  { id: "cardInfo", pista: "programa", titulo: '"LyCard" / "[Programa] Card"', tipo: "modal", claveDestino: "cardInfo", preguntas: [] },
  { id: "vault", pista: "programa", titulo: "Bóveda Legacy", tipo: "modal", claveDestino: "vault", preguntas: [] },
  { id: "info", pista: "programa", titulo: "Info (cubo dorado)", tipo: "modal", claveDestino: "info", preguntas: [] },
  { id: "invite", pista: "programa", titulo: "Enviar Invitación", tipo: "modal", claveDestino: "invite", preguntas: [] },
  { id: "contactMessage", pista: "programa", titulo: "Enviar Mensaje", tipo: "modal", claveDestino: "contactMessage", preguntas: [] },
  { id: "story", pista: "programa", titulo: "Mi camino", tipo: "modal", claveDestino: "story", preguntas: [] },
  { id: "od", pista: "programa", titulo: "O.D. (Puesto)", tipo: "modal", claveDestino: "od", preguntas: [] },
  { id: "ancient", pista: "programa", titulo: "Ancient (Rango)", tipo: "modal", claveDestino: "ancient", preguntas: [] },
  {
    id: "medal",
    pista: "programa",
    titulo: "Medalla",
    tipo: "modal",
    claveDestino: "medal",
    // Ejemplo real del doc de diseño (sección 6.3) -- las 2 preguntas ya
    // conversadas con N0 en el ensayo. medal.fuente queda sin propuesta
    // a propósito: N0 decidió no programar esa lógica todavía, tiene
    // que poder marcarse "Todavía no sé" (Decisión abierta).
    preguntas: [
      {
        id: "medal.mide",
        texto: "¿Qué mide el Medallón de Resultados en Legacy?",
        textoInvitado: "",
        tipo: "opcion_unica",
        opciones: [
          { id: "miembro", texto: "Al miembro" },
          { id: "programa", texto: "Al programa" },
          { id: "negocio", texto: "Al negocio del miembro" },
        ],
        obligatoria: false,
        permiteNoSe: true,
        pidePorque: true,
        propuesta: "negocio",
        ayuda: "",
        modos: ["rapido"],
      },
      {
        id: "medal.fuente",
        texto: "¿De dónde sale el nivel de Resultados de un negocio?",
        textoInvitado: "",
        tipo: "opcion_unica",
        opciones: [
          { id: "consultor", texto: "Lo carga el consultor" },
          { id: "miembro", texto: "Lo declara el miembro" },
          { id: "datos", texto: "Sale de datos solos" },
        ],
        obligatoria: false,
        permiteNoSe: true,
        pidePorque: true,
        propuesta: "",
        ayuda: "",
        modos: ["rapido"],
      },
    ],
  },
  { id: "contacts", pista: "programa", titulo: "Badge de Valor", tipo: "modal", claveDestino: "contacts", preguntas: [] },
  { id: "legado", pista: "programa", titulo: "Deja tu Legado", tipo: "modal", claveDestino: "legado", preguntas: [] },
  { id: "na", pista: "programa", titulo: "Escanear QR / elegir Programa", tipo: "modal", claveDestino: "na", preguntas: [] },
  { id: "versionInfo", pista: "programa", titulo: "Versión de la app", tipo: "modal", claveDestino: "versionInfo", preguntas: [] },
  { id: "ai_agent", pista: "programa", titulo: "Agente de IA (Podio)", tipo: "modal", claveDestino: "ai_agent", preguntas: [] },
];

// Campos de Program que no son uno de los 14 modales (mismos nombres
// que ya usa /admin/programs/[id] -- "Medalla KPIs"=contactsScale,
// "Medalla Rango"=medalScale, "Badge de Rangos"=rankScale, etc.).
const PROGRAM_FIELD_ESPACIOS: Espacio[] = [
  { id: "contactsScale", pista: "programa", titulo: "Medalla KPIs", tipo: "program_field", claveDestino: "contactsScale", preguntas: [] },
  { id: "medalScale", pista: "programa", titulo: "Medalla Rango", tipo: "program_field", claveDestino: "medalScale", preguntas: [] },
  { id: "rankScale", pista: "programa", titulo: "Badge de Rangos", tipo: "program_field", claveDestino: "rankScale", preguntas: [] },
  { id: "podiumButtons", pista: "programa", titulo: "Botones del Podio", tipo: "program_field", claveDestino: "podiumButtons", preguntas: [] },
  { id: "officeSkills", pista: "programa", titulo: "Superpoderes (WowApps internas)", tipo: "program_field", claveDestino: "officeSkills", preguntas: [] },
  { id: "brandDesign", pista: "programa", titulo: "Skins de Marca", tipo: "program_field", claveDestino: "brandDesign", preguntas: [] },
  { id: "motivationalPhrases", pista: "programa", titulo: "Frases motivacionales", tipo: "program_field", claveDestino: "motivationalPhrases", preguntas: [] },
  { id: "cardLabels", pista: "programa", titulo: "Textos de Botones y Modales", tipo: "program_field", claveDestino: "cardLabels", preguntas: [] },
];

// Pista personal (doc, sección 6.4): "datos básicos" + "Códice @v1".
const PERSONAL_ESPACIOS: Espacio[] = [
  { id: "datos_basicos", pista: "personal", titulo: "Datos básicos", tipo: "personal_field", claveDestino: "card", preguntas: [] },
  { id: "codice_v1", pista: "personal", titulo: "Códice @v1 (lectura rápida)", tipo: "personal_field", claveDestino: "card", preguntas: [] },
];

// Pista negocio: vacía por decisión de N0 (ver nota arriba) -- S0/S1
// muestran "Pendiente, sin tarjeta todavía" en vez de un avance 0/N.
const NEGOCIO_ESPACIOS: Espacio[] = [];

export const ESPACIOS: Espacio[] = [...PERSONAL_ESPACIOS, ...NEGOCIO_ESPACIOS, ...MODAL_ESPACIOS, ...PROGRAM_FIELD_ESPACIOS];

export function espaciosDePista(pista: PistaId): Espacio[] {
  return ESPACIOS.filter((e) => e.pista === pista);
}

export function totalPreguntas(pista: PistaId): number {
  return espaciosDePista(pista).reduce((sum, e) => sum + e.preguntas.length, 0);
}

export function findPregunta(preguntaId: string): Pregunta | null {
  for (const espacio of ESPACIOS) {
    const found = espacio.preguntas.find((p) => p.id === preguntaId);
    if (found) return found;
  }
  return null;
}

// Paso 2 -- el lector del guion: todas las preguntas de una pista, en
// el mismo orden en que aparecen los espacios (ESPACIOS arriba), y
// cuál es "la pregunta de ahora" dado el set de IDs ya respondidas en
// esta sesión. S2 (una pregunta por vez) se apoya en esto para no
// tener que saber nada de orden -- solo pide "la siguiente".
export function preguntasDePista(pista: PistaId): Pregunta[] {
  return espaciosDePista(pista).flatMap((e) => e.preguntas);
}

export function primeraPreguntaSinResponder(pista: PistaId, respondidasIds: ReadonlySet<string>): Pregunta | null {
  return preguntasDePista(pista).find((p) => !respondidasIds.has(p.id)) ?? null;
}
