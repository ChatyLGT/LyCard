import type { MallaNode, MallaEdge, MallaGhost } from "@/lib/mallaData";

// Malla real (pedido de Gunnar, 2026-09-22): hasta acá la Malla usaba
// datasets fijos hardcodeados (lib/mallaData.ts, ~25 nodos de ejemplo).
// Este archivo arma el grafo real a partir de datos de verdad —
// ProgramMembership (y, con la misma forma, CardNetworkMembership) —
// para que cada punto tenga info real detrás, no solo un puntito
// decorativo. El modelo es fractal por diseño: WHITEPAPER.md §4.4 define
// N0 (dueño) → N1 (triada Einar/Chaty/Warren) → N2 (Guardianas) → N3
// (Expertos) → N4 (Especialistas); en esta plataforma multi-programa,
// cada Programa real ES un N3 del Legacy principal, y puertas adentro de
// CADA Programa se repite la misma forma fractal (su propia cadena de
// referidos vía referredByMembershipId es su propio N0→N1→N2...). No hay
// datos reales de N2 (Guardianas) todavía, así que ese nivel se salta acá
// — cuando exista, se inserta entre N1 y los Programas sin tocar el
// resto de la forma.

const GOLD = "#C8A15A";
const VIOLET = "#9085e9";
const GREEN = "#6FCF7A";
const IVORY = "#F3F0E9";
const AMBER = "#E0954B";
const MUTED = "#8a8378";

export type MallaNodeInfo = {
  title: string;
  subtitle?: string;
  body?: string;
};

export type MallaGraphData = {
  nodes: MallaNode[];
  edges: MallaEdge[];
  ghosts: Record<string, MallaGhost>;
  info: Record<string, MallaNodeInfo>;
};

// N1, la triada fija de todo Legacy (WHITEPAPER §4.4) — no varía nunca,
// es la misma para cualquier Programa: Einar planea, Chaty coordina,
// Warren ejecuta en la Oficina/LyCard.
const N1_TRIADA: { id: string; label: string; role: string; color: string }[] = [
  { id: "n1-einar", label: "Einar", role: "N1 · Estrategia (Agente Silicio)", color: GREEN },
  { id: "n1-chaty", label: "Chaty", role: "N1 · Coordinación (Agente Silicio)", color: VIOLET },
  { id: "n1-warren", label: "Warren", role: "N1 · Ejecución en la Oficina (Agente Silicio)", color: AMBER },
];

// El "organismo completo": Legacy (N0) → su triada N1 fija → cada
// Programa real de la plataforma como su propio N3. Un click en un
// Programa "entra" a su propio grafo (buildMemberFractalGraph) — ver
// components/MallaExplorer.tsx para el drill-down.
export function buildRootMallaGraph(programs: { id: string; name: string }[]): MallaGraphData {
  const nodes: MallaNode[] = [{ id: "n0-legacy", color: GOLD, size: 10, ghost: "core" }];
  const edges: MallaEdge[] = [];
  const info: Record<string, MallaNodeInfo> = {
    "n0-legacy": { title: "Legacy", subtitle: "N0 · Programa raíz", body: "El Legacy principal — de acá cuelga toda la red real." },
  };

  for (const n1 of N1_TRIADA) {
    nodes.push({ id: n1.id, color: n1.color, size: 6, ghost: "core" });
    edges.push(["n0-legacy", n1.id]);
    info[n1.id] = { title: n1.label, subtitle: n1.role };
  }

  for (const program of programs) {
    const nodeId = `program-${program.id}`;
    nodes.push({ id: nodeId, color: GOLD, size: 5.5, dim: true, ghost: "core" });
    edges.push(["n0-legacy", nodeId]);
    info[nodeId] = { title: program.name, subtitle: "N3 · Programa" };
  }

  return { nodes, edges, ghosts: { core: { x: 0, y: 0, z: 0 } }, info };
}

// El estado de una fila de ProgramMembership/CardNetworkMembership,
// simplificado a los tres reales que trae el schema. "interviewed" tiene
// su propio color acá (no lo tenía el resto de la app, que solo distingue
// active/invited) porque en la Malla sí vale la pena verlo aparte: es la
// única etapa donde ya hubo una conversación real de por medio.
type MembershipStatus = "invited" | "interviewed" | "active";

const STATUS_LABEL: Record<MembershipStatus, string> = {
  invited: "Invitado",
  interviewed: "Entrevistado",
  active: "Activo",
};

const STATUS_HALO: Record<MembershipStatus, string> = {
  invited: MUTED,
  interviewed: AMBER,
  active: GREEN,
};

function normalizeStatus(status: string): MembershipStatus {
  return status === "active" || status === "interviewed" ? status : "invited";
}

export type FractalMember = {
  membershipId: string;
  name: string;
  status: string;
  referredByMembershipId: string | null;
};

// El grafo de un solo Programa/Card puertas adentro — mismo mecanismo
// tanto si viene de ProgramMembership como de CardNetworkMembership (son
// idénticas en forma: cada fila apunta a quién la refirió). rootId/label
// es "quién es el N0 de ESTE nivel" — el Programa mismo cuando se entra
// desde la Malla raíz, o la Card cuando es el Cerebro Malla del dueño.
export function buildMemberFractalGraph(rootId: string, rootLabel: string, members: FractalMember[]): MallaGraphData {
  const nodes: MallaNode[] = [{ id: rootId, color: GOLD, size: 7, ghost: "core" }];
  const edges: MallaEdge[] = [];
  const info: Record<string, MallaNodeInfo> = {
    [rootId]: { title: rootLabel, subtitle: "N0 de esta red" },
  };

  const byId = new Map(members.map((m) => [m.membershipId, m]));

  for (const m of members) {
    const nodeId = `member-${m.membershipId}`;
    const status = normalizeStatus(m.status);
    nodes.push({ id: nodeId, color: IVORY, haloColor: STATUS_HALO[status], size: 3.4, dim: status !== "active", ghost: "core" });

    const referrer = m.referredByMembershipId ? byId.get(m.referredByMembershipId) : undefined;
    const parentId = referrer ? `member-${referrer.membershipId}` : rootId;
    edges.push([parentId, nodeId]);

    info[nodeId] = {
      title: m.name || "(sin nombre)",
      subtitle: STATUS_LABEL[status],
      body: referrer ? `Referido por ${referrer.name || "(sin nombre)"}.` : undefined,
    };
  }

  return { nodes, edges, ghosts: { core: { x: 0, y: 0, z: 0 } }, info };
}
