// BizToCard -- protocolo agéntico de preguntas progresivas (2026-10-12,
// pedido de Gunnar) para que una Oreja construya, en vivo y junto al
// Miembro, su tarjeta personal. Arranque autorizado: solo Pista Personal,
// Niveles 1 y 2 (identidad básica + camino) -- Nivel 3 ("con Oreja",
// preguntas de esencia), y las pistas Negocio/Programa, quedan afuera
// a propósito hasta que Gunnar las apruebe.
//
// A propósito NO reusa AssistantSession/AssistantAnswer (el motor del
// Asistente "Configura tu LyCard"): ese motor guarda un borrador que se
// publica después, pensado para que MasterN0 configure su propia
// tarjeta, solo. Acá la Oreja está sentada EN VIVO con el Miembro --
// no hace falta un paso de "publicar" aparte, cada respuesta confirmada
// se escribe directo en la Card (mismo criterio que ya usa
// updateMemberAction/MemberCardEditor en el resto de la plataforma).
// Si más adelante se decide unificar ambos motores, es una decisión de
// Gunnar, no algo para asumir acá.

export type BizToCardCampo = "name" | "title" | "quote" | "wa" | "storyQuote" | "storyBody";

export type BizToCardPregunta = {
  id: string; // "personal.<campo>", único en el guion
  nivel: 1 | 2;
  texto: string;
  ayuda: string;
  tipo: "texto_corto" | "texto_largo";
  campo: BizToCardCampo;
};

export const BIZTOCARD_PERSONAL_PREGUNTAS: BizToCardPregunta[] = [
  {
    id: "personal.nombre",
    nivel: 1,
    texto: "¿Cómo te llamás, y cómo querés que te vean?",
    ayuda: "Tu nombre tal como va a aparecer en tu tarjeta.",
    tipo: "texto_corto",
    campo: "name",
  },
  {
    id: "personal.titulo",
    nivel: 1,
    texto: "¿Cuál es tu título o rol -- lo que decís cuando te preguntan a qué te dedicás?",
    ayuda: "Corto, el que usás de verdad, no el de folleto.",
    tipo: "texto_corto",
    campo: "title",
  },
  {
    id: "personal.frase",
    nivel: 1,
    texto: "Si tuvieras que resumir en una frase lo que representás, ¿cuál sería?",
    ayuda: "Una sola frase -- es lo primero que lee cualquiera que abra tu tarjeta.",
    tipo: "texto_corto",
    campo: "quote",
  },
  {
    id: "personal.whatsapp",
    nivel: 1,
    texto: "¿Dónde te encuentra la gente -- tu WhatsApp?",
    ayuda: "El número real al que te escriben los que te conocen por la tarjeta.",
    tipo: "texto_corto",
    campo: "wa",
  },
  {
    id: "personal.camino_frase",
    nivel: 2,
    texto: "En una frase, ¿qué te trajo hasta acá?",
    ayuda: "El resumen corto de tu camino -- lo que ves aparece destacado en tu tarjeta.",
    tipo: "texto_corto",
    campo: "storyQuote",
  },
  {
    id: "personal.camino_historia",
    nivel: 2,
    texto: "Contame el momento en que decidiste el camino que seguís hoy -- ¿qué pasó?",
    ayuda: "Acá podés escribir más largo -- esta es tu historia completa, no un resumen.",
    tipo: "texto_largo",
    campo: "storyBody",
  },
];

export type BizToCardCardValues = Partial<Record<BizToCardCampo, string>>;

// Siguiente pregunta sin responder, en orden -- "responder" significa
// que el campo de la Card tiene contenido real (no vacío). No distingue
// Nivel 1 de Nivel 2 a propósito: el protocolo es un solo camino
// progresivo, no dos independientes.
export function primeraPreguntaSinResponder(card: BizToCardCardValues): BizToCardPregunta | null {
  return BIZTOCARD_PERSONAL_PREGUNTAS.find((p) => !(card[p.campo] || "").trim()) ?? null;
}

export function preguntaPorId(id: string): BizToCardPregunta | undefined {
  return BIZTOCARD_PERSONAL_PREGUNTAS.find((p) => p.id === id);
}

export function preguntaPorPaso(paso: number): BizToCardPregunta | undefined {
  return BIZTOCARD_PERSONAL_PREGUNTAS[paso];
}

export const BIZTOCARD_TOTAL_PREGUNTAS = BIZTOCARD_PERSONAL_PREGUNTAS.length;
