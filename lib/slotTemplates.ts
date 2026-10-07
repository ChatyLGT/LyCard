// Librería "elegir o armar" (2026-10-07, ver docs/WHITEPAPER-ADENDA-2026-10-07.md
// para el diseño completo). Mismo algoritmo de catálogo rubro+dolor que
// lib/wowApps.ts#matchWowApps, aplicado a plantillas de contenido de Slot
// en vez de apps instalables -- con un filtro extra por slotType, porque
// acá un mismo catálogo sirve a varios tipos de slot distintos (escala,
// y en una fase futura modal/puesto/officeSkill).
import { parseTags } from "@/lib/wowApps";

// Fase 2 (2026-10-07) -- los 4 slot types reales hoy. "escala" es
// medal/rank/contacts (EscalaItem[]); "modal" son los 3 modales
// bodyKind:"bloques" -- cardInfo/vault/info (ModalBlock[]); "officeSkill"
// es Program.officeSkills (OfficeSkill[]); "puesto" es la escalera de
// Puesto (filas de DB, no un campo Json -- se aplica con un bulk-create,
// ver app/admin/programs/puestos-actions.ts#applyPuestoTemplateAction).
export const SLOT_TYPES = ["escala", "modal", "officeSkill", "puesto"] as const;
export type SlotType = (typeof SLOT_TYPES)[number];
export const SLOT_TYPE_LABELS: Record<SlotType, string> = {
  escala: "Escala (Medalla/Rango/Contactos)",
  modal: "Modal de bloques (cardInfo/Bóveda/Info)",
  officeSkill: "Superpoder de la Oficina",
  puesto: "Escalera de Puestos",
};

export type SlotTemplateCatalogEntry = {
  id: string;
  slotType: string;
  nombre: string;
  descripcion: string;
  industryTags: string[];
  painPointTags: string[];
  payload: unknown;
};

export function toCatalogEntry(row: {
  id: string;
  slotType: string;
  nombre: string;
  descripcion: string;
  industryTags: unknown;
  painPointTags: unknown;
  payload: unknown;
}): SlotTemplateCatalogEntry {
  return {
    id: row.id,
    slotType: row.slotType,
    nombre: row.nombre,
    descripcion: row.descripcion,
    industryTags: parseTags(row.industryTags),
    painPointTags: parseTags(row.painPointTags),
    payload: row.payload,
  };
}

// Filtra primero por slotType (un catálogo mixto sirve a varios tipos de
// slot) -- después, si hay rubro/dolor, puntúa y recorta a un "match
// curado" de 3 (mismo algoritmo que matchWowApps). Sin filtro, devuelve
// TODOS los de ese slotType sin recortar -- a diferencia de WowStore
// (catálogo grande, necesita curar), acá el N0 está ARMANDO su propia
// tarjeta y tiene que poder ver la librería completa de su slot, no solo
// un top 3 elegido por un algoritmo.
export function matchSlotTemplates(
  catalog: SlotTemplateCatalogEntry[],
  slotType: string,
  rubro: string | null,
  dolor: string | null
): SlotTemplateCatalogEntry[] {
  const forType = catalog.filter((t) => t.slotType === slotType);
  if (!rubro && !dolor) return forType;
  return forType
    .map((t) => {
      let score = 0;
      if (rubro && t.industryTags.includes(rubro)) score += 1;
      if (dolor && t.painPointTags.includes(dolor)) score += 1;
      return { t, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.t);
}
