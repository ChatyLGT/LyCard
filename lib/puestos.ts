// Shape de un template de slotType "puesto" (Librería de Slots, Fase 2,
// 2026-10-07) -- un array de filas de Puesto, sin id/programId (eso lo
// pone app/admin/programs/puestos-actions.ts#applyPuestoTemplateAction
// al crearlas). Mismo criterio de sanitización que
// parseEscala/parseModalBlocks/parseOfficeSkills: nunca confiar en el
// Json crudo, siempre recorrerlo y quedarse solo con las filas que
// tengan lo mínimo (siglas + denominación).
export type PuestoTemplateItem = { siglas: string; denominacion: string; descripcion: string; icono: string; order: number };

export function parsePuestoTemplatePayload(value: unknown): PuestoTemplateItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is Record<string, unknown> => typeof v === "object" && v !== null)
    .map((v, i) => ({
      siglas: typeof v.siglas === "string" ? v.siglas : "",
      denominacion: typeof v.denominacion === "string" ? v.denominacion : "",
      descripcion: typeof v.descripcion === "string" ? v.descripcion : "",
      icono: typeof v.icono === "string" && v.icono ? v.icono : "diamond",
      order: typeof v.order === "number" ? v.order : i,
    }))
    .filter((item) => item.siglas && item.denominacion);
}
