// Especialistas (Fase 5, 2026-09-30) — ver PLAN.md "Fase 4: DISEÑO --
// Especialistas y Expertos". Un Especialista es un ROL con un trabajo,
// no una lista de features: las WowApps/Superpoderes que ya existen se
// referencian como sus herramientas por key (toolKeys), sin FK dura --
// un toolKey puede apuntar a un WowApp.key real (catálogo de
// /admin/wowstore) o a un OfficeSkillAppType fijo (lib/officeSkills.ts,
// ej. "modo-foco"). Este archivo es puro, sin tocar Postgres, mismo
// criterio que lib/wowApps.ts.

export type AutonomyLevel = "sugiere" | "actua_con_ok" | "actua_solo";

export const AUTONOMY_LEVELS: AutonomyLevel[] = ["sugiere", "actua_con_ok", "actua_solo"];

export const AUTONOMY_LABEL: Record<AutonomyLevel, string> = {
  sugiere: "Sugiere",
  actua_con_ok: "Actúa con tu OK",
  actua_solo: "Actúa solo",
};

export function parseAutonomyLevel(value: unknown): AutonomyLevel {
  return AUTONOMY_LEVELS.includes(value as AutonomyLevel) ? (value as AutonomyLevel) : "sugiere";
}

export function parseToolKeys(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

// Nombre genérico para un toolKey que corresponde a un OfficeSkill fijo
// (Superpoder interno) -- un WowApp real (catálogo externo) se resuelve
// aparte, con su propio `nombre` de la tabla WowApp, esto es solo el
// fallback para los que no son WowApps.
export const OFFICE_SKILL_TOOL_LABEL: Record<string, string> = {
  "modo-foco": "Modo Foco",
  "notas-voz": "Notas de Voz",
  agenda: "Agenda",
  malla: "Mi Red (Malla)",
  "fathom-brief": "Brief de reuniones",
  mensajes: "Mensajes",
};

// wowAppNames: mapa key→nombre de las WowApps reales encontradas en DB
// para esta lista de toolKeys -- lo arma quien llama (necesita Postgres,
// esta función no).
export function labelForToolKey(key: string, wowAppNames: Record<string, string>): string {
  return wowAppNames[key] || OFFICE_SKILL_TOOL_LABEL[key] || key;
}

export function parseHabilidades(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

export type EspecialistaExample = {
  key: string;
  nombre: string;
  trabajo: string;
  descripcion: string;
  color: string;
  toolKeys: string[];
  suggestion: string;
  industryTags: string[];
  painPointTags: string[];
  basePriceUsd: number;
  status: "activo" | "proximamente";
  destacado: boolean;
  habilidades: string[];
};

// El único ejemplo de esta ronda (Fase 5, pedido explícito de Gunnar):
// "Calma", usando WowAwe (WowApp real) + Modo Foco (Superpoder) como
// herramientas. La sugerencia es texto fijo, mostrado siempre marcado
// "(simulada)" en la UI -- no hay IA real sugiriendo nada todavía.
export const EXAMPLE_ESPECIALISTAS: EspecialistaExample[] = [
  {
    key: "calma",
    nombre: "Calma",
    trabajo: "Cuidar que no te quemes vos, no tu negocio.",
    descripcion:
      "Mira dos señales tuyas -- tu Caminata de Asombro semanal (WowAwe) y tus rachas de Modo Foco -- y te avisa cuando hace rato no parás. No reemplaza a WowAwe ni a Modo Foco: los usa como sus herramientas.",
    color: "#7FB0C4",
    toolKeys: ["wowawe", "modo-foco"],
    suggestion: "Llevás 6 días sin cargar tu Caminata de Asombro y 3 sesiones de Modo Foco seguidas sin pausa -- ¿arrancamos una de 15 minutos?",
    industryTags: [],
    painPointTags: ["bienestar-fundador"],
    basePriceUsd: 0,
    status: "activo",
    destacado: true,
    habilidades: ["Seguimiento de hábitos", "Bienestar del fundador", "Rachas de enfoque"],
  },
];
