// Seguimiento de a quién se le compartió una LyCard puntual — ver el
// comentario completo del modelo `CardLead` en prisma/schema.prisma para
// el porqué de este módulo (más chico y a propósito que el CRM de
// Sherpa/5-sesiones del roadmap).
//
// Este archivo es intencionalmente client-safe (sin import de
// `lib/prisma`): lo importa `components/CardLeadsBlock.tsx`, un
// componente cliente, para los labels/colores. La función que sí toca
// la DB (`upsertLead`) vive aparte, en `lib/leadsUpsert.ts`, para que
// Next.js nunca intente meter el driver de Postgres en el bundle del
// navegador (bug real encontrado en esta misma sesión: el build fallaba
// con "Module not found: dns/fs/net/tls" porque `pg` terminaba
// importado desde un Client Component).

export const LEAD_STAGES = ["compartido", "contactado", "en_seguimiento", "convertido", "perdido"] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

export const LEAD_STAGE_LABEL: Record<LeadStage, string> = {
  compartido: "Compartido",
  contactado: "Contactado",
  en_seguimiento: "En seguimiento",
  convertido: "Convertido",
  perdido: "Perdido",
};

export const LEAD_STAGE_COLOR: Record<LeadStage, string> = {
  compartido: "#9085e9",
  contactado: "#E5C378",
  en_seguimiento: "#E0954B",
  convertido: "#6FCF7A",
  perdido: "#5A5A5A",
};

export type LeadSource = "invitacion" | "qr_whatsapp" | "mensaje" | "entrevista" | "manual";

export const LEAD_SOURCE_LABEL: Record<LeadSource, string> = {
  invitacion: "Invitación por mail",
  qr_whatsapp: "QR por WhatsApp",
  mensaje: "Mensaje de contacto",
  entrevista: "Agendó entrevista",
  manual: "Agregado a mano",
};

function isLeadStage(v: string): v is LeadStage {
  return (LEAD_STAGES as readonly string[]).includes(v);
}

export function normalizeLeadStage(v: string): LeadStage {
  return isLeadStage(v) ? v : "compartido";
}

// Orden de avance automático — solo estos 3 se mueven solos, y solo hacia
// adelante. "convertido"/"perdido" son terminales: el sistema nunca los
// setea ni los saca de ahí, solo el dueño a mano.
const AUTO_ORDER: Record<string, number> = { compartido: 0, contactado: 1, en_seguimiento: 2 };

export function bumpStage(current: string, proposed: LeadStage): LeadStage {
  const currentStage = normalizeLeadStage(current);
  if (!(currentStage in AUTO_ORDER)) return currentStage; // terminal, no lo toca un evento automático
  if (!(proposed in AUTO_ORDER)) return currentStage; // un evento automático nunca propone un terminal
  return AUTO_ORDER[proposed] > AUTO_ORDER[currentStage] ? proposed : currentStage;
}
