import { STR } from "./i18n";

// The fixed list of button/modal title keys a Program's N0 can override
// for its project cards — a shortcut version of the full per-Program
// identity system (PLAN.md Fase 9): titles only, not full modal content,
// not badge/rank scales, not per-language. Keys match lib/i18n.ts's `es`
// dictionary exactly, since that's what an override replaces.
// Editor de Modales -- Unificación completa (2026-10-06): los 6 campos
// que eran el texto del botón/kicker de uno de los 14 modales reales
// (cardInfoKicker, infoKicker, inviteKicker, contactKicker, storyKicker,
// ancKicker) se MUDARON de esta lista a su fila correspondiente en
// "Editor de Modales" (lib/modalEditor.ts, MODAL_EDITOR_ENTRIES) --
// Gunnar los buscaba ahí sin encontrarlos, separados del resto de ese
// mismo modal. Siguen guardándose en el mismo campo Program.cardLabels
// de siempre (defaultCardLabel sigue resolviendo cualquier key por su
// default de lib/i18n.ts); lo que cambió es SOLO dónde se editan. Lo
// que queda acá son textos de botones puros (no abren un modal del
// registro) y los de Virtual Office/Agendar, que no son parte de ese
// sistema de 14.
export const CARD_LABEL_FIELDS: { key: string; label: string; group: "Botones" | "Modales" }[] = [
  { key: "customize", label: "Ícono personalizar (arriba, esquina)", group: "Botones" },
  { key: "storyBtn", label: "Botón “Mi camino con…”", group: "Botones" },
  { key: "infoBtn", label: "Botón de información (cubo dorado)", group: "Botones" },
  { key: "scheduleBtn", label: "Botón Agendar — vista de visitante", group: "Botones" },
  { key: "scheduleBtnHost", label: "Botón Agendar — vista del dueño", group: "Botones" },
  { key: "createCardBtn", label: "Botón “Creá tu LyCard”", group: "Botones" },
  { key: "inviteBtn", label: "Botón Enviar Invitación", group: "Botones" },
  { key: "scheduleKicker", label: "Modal Agendar — etiqueta superior", group: "Modales" },
  { key: "scheduleTitle", label: "Modal Agendar — título", group: "Modales" },
  { key: "officeKickerProject", label: "Modal Virtual Office — encabezado", group: "Modales" },
  { key: "officeSkillsKicker", label: "Nombre de la sección de Superpoderes (Oficina Virtual)", group: "Modales" },
];

export function defaultCardLabel(key: string): string {
  return STR.es[key] ?? key;
}
