// "Superpoderes" de la Oficina Virtual (2026-09-18) — mismo patrón que
// lib/escalas.ts (Program.medalScale/rankScale/contactsScale): un campo
// Json en Program, un parser que sanitiza, y un fallback fijo cuando el
// N0 todavía no configuró nada, para que la sección no arranque vacía.

export type OfficeSkillAppType =
  | "malla"
  | "fathom-brief"
  | "agenda"
  | "mensajes"
  | "cartera"
  | "configuracion"
  | "custom";

export type OfficeSkill = {
  key: string;
  nombre: string;
  descripcion: string; // cara "Qué es esto" del modal
  iconUrl: string; // subido por el N0 — "" = fallback a un ícono genérico
  color: string; // acento del tile aunque todavía no haya ícono subido
  appType: OfficeSkillAppType;
  enabled: boolean;
};

export function parseOfficeSkills(value: unknown): OfficeSkill[] {
  if (!Array.isArray(value)) return [];
  const APP_TYPES: OfficeSkillAppType[] = ["malla", "fathom-brief", "agenda", "mensajes", "cartera", "configuracion", "custom"];
  return value
    .filter((v): v is Record<string, unknown> => typeof v === "object" && v !== null)
    .map((v) => ({
      key: typeof v.key === "string" ? v.key : "",
      nombre: typeof v.nombre === "string" ? v.nombre : "",
      descripcion: typeof v.descripcion === "string" ? v.descripcion : "",
      iconUrl: typeof v.iconUrl === "string" ? v.iconUrl : "",
      color: typeof v.color === "string" ? v.color : "#C8A15A",
      appType: APP_TYPES.includes(v.appType as OfficeSkillAppType) ? (v.appType as OfficeSkillAppType) : "custom",
      enabled: typeof v.enabled === "boolean" ? v.enabled : true,
    }))
    .filter((item) => item.key && item.nombre);
}

// Las mismas 6 herramientas que ya vivían como tiles apagados en la
// Oficina — ahora con nombre/descripción/color reales, listas para que
// un N0 les suba un ícono propio sin tocar código.
export const DEFAULT_OFFICE_SKILLS: OfficeSkill[] = [
  {
    key: "malla",
    nombre: "Mi Red (Malla)",
    descripcion: "El mapa vivo de tu equipo y tus agentes IA — quién está activo, quién necesita revisión.",
    iconUrl: "",
    color: "#C8A15A",
    appType: "malla",
    enabled: true,
  },
  {
    key: "fathom-brief",
    nombre: "Brief de reuniones",
    descripcion: "Tus últimas reuniones grabadas en Fathom, con resumen corto y link directo a cada una.",
    iconUrl: "",
    color: "#9085e9",
    appType: "fathom-brief",
    enabled: true,
  },
  {
    key: "agenda",
    nombre: "Agenda",
    descripcion: "Tus próximas reuniones y compromisos, todo en un solo lugar.",
    iconUrl: "",
    color: "#6FCF7A",
    appType: "agenda",
    enabled: true,
  },
  {
    key: "mensajes",
    nombre: "Mensajes",
    descripcion: "Lo que te escriben desde tu LyCard, centralizado.",
    iconUrl: "",
    color: "#E0954B",
    appType: "mensajes",
    enabled: true,
  },
  {
    key: "cartera",
    nombre: "Cartera NashMesh",
    descripcion: "El registro de valor generado por tu red — todavía sin motor de reparto conectado.",
    iconUrl: "",
    color: "#F3F0E9",
    appType: "cartera",
    enabled: true,
  },
  {
    key: "configuracion",
    nombre: "Configuración",
    descripcion: "Ajustes de tu Oficina Virtual.",
    iconUrl: "",
    color: "#756c5e",
    appType: "configuracion",
    enabled: true,
  },
];
