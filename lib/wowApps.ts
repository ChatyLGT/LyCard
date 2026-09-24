// WowStore (2026-09-24) — appstore de WowApps para cualquier MiPyME
// (restaurante, retail, despacho, emprendedor), navegado por rubro+dolor
// en vez de categoría técnica. El catálogo en sí vive en la tabla
// `WowApp` (Prisma, CRUD real desde /admin/wowstore) — este archivo solo
// tiene el vocabulario fijo de los 2 selectores, el parser de los campos
// Json de tags, y el algoritmo de match: puro, sin tocar la DB, para que
// quede 100% cubierto por tests unitarios.

export type WowAppAppType = "agenda" | "whatsapp-bot" | "cobranza" | "custom";

export type Rubro = { key: string; label: string };
export type PainPoint = { key: string; label: string };

export const RUBROS: Rubro[] = [
  { key: "restaurante", label: "Restaurante / Taquería" },
  { key: "retail", label: "Comercio / Retail" },
  { key: "clinica", label: "Clínica / Salón" },
  { key: "despacho", label: "Despacho / Servicios profesionales" },
  { key: "emprendedor", label: "Emprendedor / Independiente" },
];

export const PAIN_POINTS: PainPoint[] = [
  { key: "vender-mas", label: "Pierdo ventas por WhatsApp" },
  { key: "inventario", label: "El desmadre del inventario" },
  { key: "cobrar", label: "Cobrar a tiempo" },
  { key: "clientes", label: "Conseguir clientes" },
];

export const WOW_APP_TYPES: WowAppAppType[] = ["agenda", "whatsapp-bot", "cobranza", "custom"];

export function parseTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

export type WowAppCatalogEntry = {
  id: string;
  key: string;
  nombre: string;
  descripcion: string;
  iconUrl: string;
  color: string;
  appType: string;
  industryTags: string[];
  painPointTags: string[];
  basePriceUsd: number;
  status: string;
  demoVideoUrl: string;
};

// Convierte una fila cruda de Prisma (con los 2 campos Json todavía sin
// parsear) al shape ya sanitizado que usa el resto del módulo.
export function toCatalogEntry(row: {
  id: string;
  key: string;
  nombre: string;
  descripcion: string;
  iconUrl: string;
  color: string;
  appType: string;
  industryTags: unknown;
  painPointTags: unknown;
  basePriceUsd: number;
  status: string;
  demoVideoUrl: string;
}): WowAppCatalogEntry {
  return {
    id: row.id,
    key: row.key,
    nombre: row.nombre,
    descripcion: row.descripcion,
    iconUrl: row.iconUrl,
    color: row.color,
    appType: row.appType,
    industryTags: parseTags(row.industryTags),
    painPointTags: parseTags(row.painPointTags),
    basePriceUsd: row.basePriceUsd,
    status: row.status,
    demoVideoUrl: row.demoVideoUrl,
  };
}

// El "match curado": nunca el catálogo entero, como mucho 3 -- ordenadas
// por cantidad de coincidencias (rubro + dolor). Sin ningún filtro
// elegido, no devuelve nada (la pantalla de onboarding sigue pidiendo
// que elijas).
export function matchWowApps(catalog: WowAppCatalogEntry[], rubro: string | null, dolor: string | null): WowAppCatalogEntry[] {
  if (!rubro && !dolor) return [];
  return catalog
    .map((app) => {
      let score = 0;
      if (rubro && app.industryTags.includes(rubro)) score += 1;
      if (dolor && app.painPointTags.includes(dolor)) score += 1;
      return { app, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.app);
}
