// WowStore (2026-09-24) — appstore de WowApps para cualquier MiPyME
// (restaurante, retail, despacho, emprendedor), navegado por rubro+dolor
// en vez de categoría técnica. El catálogo en sí vive en la tabla
// `WowApp` (Prisma, CRUD real desde /admin/wowstore) — este archivo solo
// tiene el vocabulario fijo de los 2 selectores, el parser de los campos
// Json de tags, y el algoritmo de match: puro, sin tocar la DB, para que
// quede 100% cubierto por tests unitarios.

export type WowAppAppType = "agenda" | "whatsapp-bot" | "cobranza" | "awe" | "custom";

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
  // WowAwe (2026-09-24) -- el único dolor que no es del negocio, es del
  // dueño. Rubro-agnóstico a propósito (WowAwe no lleva industryTags),
  // así que aparece sin importar qué rubro se haya elegido.
  { key: "bienestar-fundador", label: "El peso de estar solo con todo esto" },
];

export const WOW_APP_TYPES: WowAppAppType[] = ["agenda", "whatsapp-bot", "cobranza", "awe", "custom"];

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

// Ejemplos para poblar el catálogo un mínimo (2026-09-24, pedido de
// Gunnar: "solo para que se vea poblada"). 5 salen del catálogo real de
// servicios de Mercosur Irpavi/HeroSuite (el Excel que ya había pasado),
// recortados a los que de verdad calzan con una MiPyME chica -- la
// mayoría de ese Excel es infraestructura IT para empresas de 10+
// empleados, no para una taquería. La sexta es la misma capacidad de
// "Notas de Voz" que ya corre como Superpoder interno de Legacy, ahora
// catalogada aparte para que cualquier MiPyME la vea, aunque siga siendo
// otro sistema por dentro. Ninguna tiene lógica real conectada todavía
// (status "proximamente" en las 6) -- mismo criterio de W1.
export const EXAMPLE_WOW_APPS: {
  key: string;
  nombre: string;
  descripcion: string;
  color: string;
  appType: WowAppAppType;
  industryTags: string[];
  painPointTags: string[];
  basePriceUsd: number;
  // "activo" solo cuando el appType tiene una app real conectada
  // (hoy, únicamente "awe") -- el resto arranca "proximamente" hasta
  // que se construya su lógica.
  status: "activo" | "proximamente";
}[] = [
  {
    key: "wowawe",
    nombre: "WowAwe -- Caminata de Asombro",
    descripcion: "Para el 'impuesto a la soledad' de todo fundador: una vez por semana, salí a caminar 15 minutos, sacate 3 selfies (inicio/mitad/final) y grabale una nota contando qué viste. Tu Índice de Asombro es un número orientativo (no una medición clínica real) para que veas la tendencia semana a semana -- la nota de voz sí queda transcrita de verdad.",
    color: "#7FB0C4",
    appType: "awe",
    industryTags: [],
    painPointTags: ["bienestar-fundador"],
    basePriceUsd: 0,
    status: "activo",
  },
  {
    key: "chatbot-whatsapp-pedidos",
    nombre: "Atención y Pedidos por WhatsApp",
    descripcion: "Un asistente que responde consultas, toma pedidos y agenda reuniones por WhatsApp, sin que tengas que estar pegado al celular todo el día.",
    color: "#25D366",
    appType: "whatsapp-bot",
    industryTags: ["restaurante", "retail"],
    painPointTags: ["vender-mas", "clientes"],
    basePriceUsd: 4500,
    status: "proximamente",
  },
  {
    key: "reservas-agenda-automatica",
    nombre: "Reservas y Agenda Automática",
    descripcion: "Tus clientes agendan turnos o reservas solos, con recordatorios automáticos -- vos solo revisás la agenda.",
    color: "#6FCF7A",
    appType: "agenda",
    industryTags: ["clinica", "despacho"],
    painPointTags: ["clientes"],
    basePriceUsd: 4500,
    status: "proximamente",
  },
  {
    key: "landing-sitio-ventas",
    nombre: "Sitio Web Orientado a Ventas",
    descripcion: "Una página pensada para convertir visitas en clientes -- formulario, botón de WhatsApp, y todo armado para que te contacten.",
    color: "#C8A15A",
    appType: "custom",
    industryTags: ["retail", "emprendedor", "despacho"],
    painPointTags: ["clientes", "vender-mas"],
    basePriceUsd: 350,
    status: "proximamente",
  },
  {
    key: "publicidad-redes-sociales",
    nombre: "Publicidad y Redes Sociales",
    descripcion: "Manejo de tus campañas y contenido en redes -- pauta, seguimiento y reportes, para que no tengas que improvisar publicaciones.",
    color: "#9085e9",
    appType: "custom",
    industryTags: ["restaurante", "retail", "emprendedor"],
    painPointTags: ["clientes"],
    basePriceUsd: 60,
    status: "proximamente",
  },
  {
    key: "qr-dinamico-negocio",
    nombre: "QR Dinámico para tu Negocio",
    descripcion: "Un QR que podés reprogramar cuando quieras (menú, promo, link) sin reimprimir nada -- con estadísticas de cuánta gente lo usa.",
    color: "#E5C378",
    appType: "custom",
    industryTags: ["restaurante", "retail"],
    painPointTags: ["vender-mas"],
    basePriceUsd: 15,
    status: "proximamente",
  },
  {
    key: "notas-voz-negocio",
    nombre: "Notas de Voz para tu Negocio",
    descripcion: "Grabás una nota hablada -- un pedido, un pendiente, un conteo de stock -- y queda transcrita y resumida sola, sin escribir nada.",
    color: "#E5C378",
    appType: "custom",
    industryTags: ["emprendedor", "despacho"],
    painPointTags: ["inventario"],
    basePriceUsd: 0,
    status: "proximamente",
  },
];

// Fase W2 (2026-09-24) -- contador real por chip de rubro en /m/wowstore,
// reemplaza el "12 apps activas" fijo del mockup de referencia de Gunnar
// por un número que sale de verdad del catálogo. Solo cuenta WowApps
// status:"activo" -- mostrarle a alguien un rubro con 4 apps "próximamente"
// como si ya tuviera 4 disponibles sería la misma mentira que el resto
// del proyecto evita a propósito. Entradas rubro-agnósticas (industryTags
// vacío, como WowAwe) no suman a ningún rubro puntual -- siguen
// apareciendo igual cuando matchean por dolor, ver matchWowApps.
export function countByRubro(catalog: WowAppCatalogEntry[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const rubro of RUBROS) counts[rubro.key] = 0;
  for (const app of catalog) {
    if (app.status !== "activo") continue;
    for (const tag of app.industryTags) {
      if (tag in counts) counts[tag] += 1;
    }
  }
  return counts;
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
