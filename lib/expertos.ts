// Expertos (Fase 5, 2026-09-30) — el Gemelo Digital publicado de una
// persona real. Ver PLAN.md "Fase 4: DISEÑO -- Especialistas y
// Expertos" para las 5 reglas duras (consentimiento revocable, Bautizo,
// rótulo obligatorio, nunca diagnosticar, el Códice nunca sale). Este
// archivo es puro, sin tocar Postgres, mismo criterio que lib/tags.ts.

export type BautizoStatus = "sin_bautizar" | "bautizado";

export const BAUTIZO_STATUSES: BautizoStatus[] = ["sin_bautizar", "bautizado"];

export function parseBautizoStatus(value: unknown): BautizoStatus {
  return BAUTIZO_STATUSES.includes(value as BautizoStatus) ? (value as BautizoStatus) : "sin_bautizar";
}

export type ConsultaNivel = "gemelo_solo" | "gemelo_revisado" | "sesion";

export const CONSULTA_NIVELES: ConsultaNivel[] = ["gemelo_solo", "gemelo_revisado", "sesion"];

export const CONSULTA_NIVEL_LABEL: Record<ConsultaNivel, string> = {
  gemelo_solo: "Gemelo solo",
  gemelo_revisado: "Gemelo con revisión de la persona",
  sesion: "Sesión con la persona",
};

export function parseConsultaNivel(value: unknown): ConsultaNivel {
  return CONSULTA_NIVELES.includes(value as ConsultaNivel) ? (value as ConsultaNivel) : "gemelo_solo";
}

// Rango (Fase 6, WowHead, 2026-10-01) -- eje distinto del origen
// (Legacy/Silicio, ver lib/especialistas.ts). Solo un Legacy puede
// llegar a "experto" -- un Silicio nunca tiene equipo propio, regla
// dura confirmada por Gunnar. El ascenso NUNCA es automático, lo
// aprueba MasterN0 a mano (ver app/admin/wowstore/actions-equipo.ts
// #promoverAExpertoAction) -- este archivo solo sabe leer el campo, no
// decide cuándo alguien puede ascender.
export type Rango = "especialista" | "experto";

export const RANGOS: Rango[] = ["especialista", "experto"];

export function parseRango(value: unknown): Rango {
  return RANGOS.includes(value as Rango) ? (value as Rango) : "especialista";
}

export const RANGO_LABEL: Record<Rango, string> = {
  especialista: "Especialista",
  experto: "Experto",
};

export type ExperienciaItem = { rol: string; periodo: string; descripcion: string };

export function parseExperiencia(value: unknown): ExperienciaItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is Record<string, unknown> => typeof v === "object" && v !== null)
    .map((v) => ({
      rol: typeof v.rol === "string" ? v.rol : "",
      periodo: typeof v.periodo === "string" ? v.periodo : "",
      descripcion: typeof v.descripcion === "string" ? v.descripcion : "",
    }))
    .filter((item) => item.rol.trim().length > 0);
}

export function parseEspecialidades(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

// Regla dura 1 y 2 (consentimiento + Bautizo): un Experto solo puede
// recibir consultas reales si dio consentimiento, no lo revocó después,
// y la propia persona aprobó publicarse -- nunca por default.
export function canPublishExperto(experto: { consentGivenAt: Date | string | null; consentRevokedAt: Date | string | null; bautizoStatus: string }): boolean {
  return experto.consentGivenAt !== null && experto.consentRevokedAt === null && parseBautizoStatus(experto.bautizoStatus) === "bautizado";
}

// Las primeras 3 preguntas de un visitante anónimo (por Experto) son
// gratis -- a la 4ta, hace falta estar registrado.
export const FREE_TRIAL_LIMIT = 3;

// Cookie propia del flujo de consulta pública -- NO es una sesión (no
// prueba identidad, solo cuenta las 3 preguntas gratis de un visitante
// anónimo), separada a propósito de lycard_member (lib/memberAuth.ts).
// Vive acá (no en app/experto/[key]/actions.ts) porque ese archivo es
// "use server" y solo puede exportar funciones async.
export const EXPERTO_VISITOR_COOKIE = "lycard_experto_visitor";

export function shouldRequireRegistration(freeConsultaCount: number): boolean {
  return freeConsultaCount >= FREE_TRIAL_LIMIT;
}

function normalizeForMatch(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type CodiceEntryLike = { pregunta: string; respuesta: string; aprobadaAt: Date | string | null };

// Match determinístico y simple -- nunca un modelo en vivo (mismo
// criterio que lib/gemeloDigitalScript.ts): si la pregunta comparte al
// menos una palabra significativa (4+ letras) con una entrada YA
// aprobada del Códice, se devuelve esa respuesta. Sin match -> null, la
// pregunta entra al inbox del Experto (regla dura 5: el Códice nunca se
// expone crudo, solo respuestas ya aprobadas por la persona).
export function matchCodiceEntry(pregunta: string, codice: CodiceEntryLike[]): string | null {
  const words = normalizeForMatch(pregunta)
    .split(" ")
    .filter((w) => w.length >= 4);
  if (words.length === 0) return null;

  for (const entry of codice) {
    if (entry.aprobadaAt === null) continue;
    const entryWords = normalizeForMatch(entry.pregunta)
      .split(" ")
      .filter((w) => w.length >= 4);
    if (words.some((w) => entryWords.includes(w))) return entry.respuesta;
  }
  return null;
}

export type ExpertoExample = {
  key: string;
  nombrePublico: string;
  profesion: string;
  esProfesionRegulada: boolean;
  descripcion: string;
  color: string;
  demoMemberName: string;
  seedCodice: { pregunta: string; respuesta: string }[];
  experiencia: ExperienciaItem[];
  especialidades: string[];
};

// El único ejemplo de esta ronda (Fase 5, pedido explícito de Gunnar):
// una persona INVENTADA, marcada como ejemplo en su propio nombre y
// descripción -- nunca se confunde con un Experto real. Arranca con
// consentimiento + Bautizo ya dados (para poder probar el flujo de
// consulta de punta a punta sin tener que operar esos 2 pasos a mano
// primero) y una entrada de Códice pre-aprobada, para que el match real
// tenga algo con qué comparar. Fase 6: además arranca YA promovida a
// "experto" (con su CV cargado) para poder mostrar de entrada el
// organigrama con EXAMPLE_EXPERTO_EQUIPO -- sembrar el ejemplo no pasa
// por el ascenso manual a propósito, es solo para que se vea poblado;
// un Experto real sigue necesitando la aprobación de MasterN0.
export const EXAMPLE_EXPERTO: ExpertoExample = {
  key: "ejemplo-nutricion",
  nombrePublico: "Dra. Valentina Ríos (ejemplo)",
  profesion: "Nutrición clínica",
  esProfesionRegulada: true,
  descripcion:
    "Perfil de EJEMPLO para probar el flujo de consulta a un Experto -- no es una persona real. Un Experto real pasa por el mismo alta de Legacy (entrevista → Programa → Card) que cualquier Miembro, nunca un perfil suelto inventado.",
  color: "#C8A15A",
  demoMemberName: "Valentina Ríos (ejemplo)",
  seedCodice: [
    {
      pregunta: "¿Qué desayuno me conviene antes de entrenar?",
      respuesta:
        "Simulación -- esta es una respuesta de ejemplo del Códice, no una recomendación real: algo liviano en carbohidratos 60-90 minutos antes suele andar bien para la mayoría, pero esto varía mucho persona a persona.",
    },
  ],
  experiencia: [
    { rol: "Nutricionista clínica -- consultorio propio", periodo: "2019 -- hoy", descripcion: "Planes alimentarios para deportistas amateurs y readaptación nutricional post-lesión." },
    { rol: "Nutrición deportiva -- Club Atlético Baires", periodo: "2015 -- 2019", descripcion: "" },
  ],
  especialidades: ["Nutrición deportiva", "Plan alimentario", "Readaptación post-lesión", "Hidratación"],
};

// Equipo de ejemplo del Experto de arriba -- Legacy inventados,
// marcados "(ejemplo)" igual que el propio Experto, para poblar el
// organigrama de WowHead desde el primer seed. Cada uno nace con
// rango "especialista" y queda unido vía recruitedById una vez
// sembrado (ver seedExampleExpertoAction).
export const EXAMPLE_EXPERTO_EQUIPO: { demoMemberName: string; profesion: string }[] = [
  { demoMemberName: "Sofía Lem (ejemplo)", profesion: "Nutrición deportiva" },
  { demoMemberName: "Diego Paz (ejemplo)", profesion: "Nutrición clínica" },
  { demoMemberName: "Rocío Vera (ejemplo)", profesion: "Nutrición infantil" },
];
