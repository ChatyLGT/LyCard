// Datasets de demo para "La Malla" (PLAN.md, Fase 12-B/C/D). Simulados a
// propósito — todavía no hay modelo Prisma para esto (Fase 12-D lo deja
// anotado: un futuro /api/malla derivaría este shape de ProgramMembership +
// CardNetworkMembership). Hasta que exista ese endpoint y su editor, estos
// arrays son la única fuente de datos del grafo.

export type MallaNode = {
  id: string;
  color: string;
  size: number;
  ghost?: string;
  dim?: boolean;
  haloColor?: string;
};

export type MallaEdge = [string, string];

export type MallaGhost = { x: number; y: number; z: number };

const GOLD = "#C8A15A";
const VIOLET = "#9085e9";
const GREEN = "#6FCF7A";
const IVORY = "#F3F0E9";
const AMBER = "#E0954B";

/** Vitrina pública: "el organismo completo" — Programa Legacy (dorado) +
 *  una red independiente (violeta) sin relación con Legacy, para mostrar
 *  que hay conexiones reales que no pasan por el dueño de la tarjeta. */
export const PUBLIC_MALLA_NODES: MallaNode[] = [
  { id: "einar", color: GREEN, size: 8.5, ghost: "core-legacy" },
  { id: "legacy", color: GOLD, size: 10.5, ghost: "core-legacy" },

  { id: "corp-pepe", color: GOLD, size: 8, ghost: "core-legacy" },
  { id: "pepe-1", color: GOLD, size: 3.6, dim: true, ghost: "corp-pepe" },
  { id: "pepe-2", color: GOLD, size: 3.6, dim: true, ghost: "corp-pepe" },
  { id: "pepe-ag", color: GOLD, size: 3.6, ghost: "corp-pepe" },

  { id: "corp-mayordomo", color: GOLD, size: 8, ghost: "core-legacy" },
  { id: "may-1", color: GOLD, size: 3.6, dim: true, ghost: "corp-mayordomo" },
  { id: "may-2", color: GOLD, size: 3.6, dim: true, ghost: "corp-mayordomo" },
  { id: "may-ag", color: GOLD, size: 3.6, ghost: "corp-mayordomo" },

  { id: "corp-edtech", color: GOLD, size: 7, ghost: "core-legacy" },
  { id: "ed-1", color: GOLD, size: 3.6, dim: true, ghost: "corp-edtech" },
  { id: "ed-2", color: GOLD, size: 3.6, dim: true, ghost: "corp-edtech" },

  { id: "corp-sandwiches", color: GOLD, size: 7, ghost: "core-legacy" },
  { id: "sw-1", color: GOLD, size: 3.6, dim: true, ghost: "corp-sandwiches" },
  { id: "sw-ag", color: GOLD, size: 3.6, ghost: "corp-sandwiches" },

  { id: "corp-bimbo", color: VIOLET, size: 8, ghost: "core-libre" },
  { id: "bimbo-1", color: VIOLET, size: 3.6, dim: true, ghost: "corp-bimbo" },
  { id: "bimbo-2", color: VIOLET, size: 3.6, dim: true, ghost: "corp-bimbo" },
  { id: "corp-tornillos", color: VIOLET, size: 7, ghost: "core-libre" },
  { id: "tor-1", color: VIOLET, size: 3.6, dim: true, ghost: "corp-tornillos" },
  { id: "corp-vidrios", color: VIOLET, size: 7, ghost: "core-libre" },
  { id: "vid-1", color: VIOLET, size: 3.6, dim: true, ghost: "corp-vidrios" },
];

export const PUBLIC_MALLA_EDGES: MallaEdge[] = [
  ["einar", "legacy"],
  ["legacy", "corp-pepe"], ["corp-pepe", "pepe-1"], ["corp-pepe", "pepe-2"], ["corp-pepe", "pepe-ag"],
  ["legacy", "corp-mayordomo"], ["corp-mayordomo", "may-1"], ["corp-mayordomo", "may-2"], ["corp-mayordomo", "may-ag"],
  ["legacy", "corp-edtech"], ["corp-edtech", "ed-1"], ["corp-edtech", "ed-2"],
  ["legacy", "corp-sandwiches"], ["corp-sandwiches", "sw-1"], ["corp-sandwiches", "sw-ag"],
  ["corp-bimbo", "bimbo-1"], ["corp-bimbo", "bimbo-2"],
  ["corp-tornillos", "tor-1"], ["corp-vidrios", "vid-1"],
  ["corp-bimbo", "corp-tornillos"], ["corp-bimbo", "corp-vidrios"],
  ["corp-pepe", "corp-bimbo"],
];

export const PUBLIC_MALLA_GHOSTS: Record<string, MallaGhost> = {
  "core-legacy": { x: -54, y: 12, z: 0 },
  "core-libre": { x: 66, y: -18, z: 24 },
  "corp-pepe": { x: -84, y: 36, z: -18 },
  "corp-mayordomo": { x: -36, y: 54, z: 18 },
  "corp-edtech": { x: -84, y: -24, z: 12 },
  "corp-sandwiches": { x: -24, y: -18, z: -24 },
  "corp-bimbo": { x: 84, y: -6, z: 36 },
  "corp-tornillos": { x: 108, y: -36, z: -6 },
  "corp-vidrios": { x: 54, y: -48, z: 6 },
};

export const PUBLIC_MALLA_KPIS = {
  brechasCerradas: 3,
  serviciosOfrecidos: 6,
};

/** Vista privada, modo operativo: la Oficina y su equipo (personas + agentes
 *  IA). Sphere color = identidad (marfil humano / dorado agente), halo =
 *  estado (verde activo / naranja necesita revisión). */
export const TEAM_MALLA_NODES: MallaNode[] = [
  { id: "oficina", color: GOLD, haloColor: GOLD, size: 7 },
  { id: "marta", color: IVORY, haloColor: GREEN, size: 3.4, dim: true },
  { id: "ag-whatsapp", color: GOLD, haloColor: GREEN, size: 3.2 },
  { id: "diego", color: IVORY, haloColor: GREEN, size: 3.4, dim: true },
  { id: "ag-licitaciones", color: GOLD, haloColor: GREEN, size: 3.2 },
  { id: "lu", color: IVORY, haloColor: AMBER, size: 3.4, dim: true },
  { id: "ag-contenido", color: GOLD, haloColor: AMBER, size: 3.2 },
];

export const TEAM_MALLA_EDGES: MallaEdge[] = [
  ["oficina", "marta"], ["oficina", "ag-whatsapp"], ["oficina", "diego"],
  ["oficina", "ag-licitaciones"], ["oficina", "lu"], ["oficina", "ag-contenido"],
];

export const TEAM_MALLA_LABELS: Record<string, string> = {
  oficina: "Tu Oficina",
  marta: "Marta · Ventas",
  "ag-whatsapp": "Agente WhatsApp",
  diego: "Diego · Soporte",
  "ag-licitaciones": "Agente Licitaciones",
  lu: "Lu · Diseño",
  "ag-contenido": "Agente Contenido",
};
