import { STR } from "./i18n";

// The fixed list of button/modal title keys a Program's N0 can override
// for its project cards — a shortcut version of the full per-Program
// identity system (PLAN.md Fase 9): titles only, not full modal content,
// not badge/rank scales, not per-language. Keys match lib/i18n.ts's `es`
// dictionary exactly, since that's what an override replaces.
export const CARD_LABEL_FIELDS: { key: string; label: string; group: "Botones" | "Modales" }[] = [
  { key: "customize", label: "Ícono personalizar (arriba, esquina)", group: "Botones" },
  { key: "storyBtn", label: "Botón “Mi camino con…”", group: "Botones" },
  { key: "infoBtn", label: "Botón de información (cubo dorado)", group: "Botones" },
  { key: "scheduleBtn", label: "Botón Agendar — vista de visitante", group: "Botones" },
  { key: "scheduleBtnHost", label: "Botón Agendar — vista del dueño", group: "Botones" },
  { key: "createCardBtn", label: "Botón “Creá tu LyCard”", group: "Botones" },
  { key: "inviteBtn", label: "Botón Enviar Invitación", group: "Botones" },
  { key: "ancKicker", label: "Modal Ancient — encabezado", group: "Modales" },
  { key: "storyKicker", label: "Modal “Mi camino” — encabezado", group: "Modales" },
  { key: "infoKicker", label: "Modal Info — etiqueta superior", group: "Modales" },
  { key: "infoTitle", label: "Modal Info — título", group: "Modales" },
  { key: "inviteKicker", label: "Modal Invitación — encabezado", group: "Modales" },
  { key: "scheduleKicker", label: "Modal Agendar — etiqueta superior", group: "Modales" },
  { key: "scheduleTitle", label: "Modal Agendar — título", group: "Modales" },
  { key: "officeKickerProject", label: "Modal Virtual Office — encabezado", group: "Modales" },
];

export function defaultCardLabel(key: string): string {
  return STR.es[key] ?? key;
}
