// Módulo PM — misma data que HR (ProjectNode), otro corte: avance y
// responsables en vez de headcount. `level` es el nivel de autonomía
// delegada (ψ) que ese proyecto tiene del N0 dueño.
export const PROJECT_LEVELS = [1, 2, 3] as const;

export const PROJECT_LEVEL_LABEL: Record<number, string> = {
  1: "Autónomo · ψ15%",
  2: "Override · ψ35%",
  3: "Directo · ψ100%",
};

export function isProjectLevel(v: number): v is (typeof PROJECT_LEVELS)[number] {
  return (PROJECT_LEVELS as readonly number[]).includes(v);
}

// Genéricas sobre cualquier shape compatible — el modelo Prisma real
// (blockers: JsonValue) del lado servidor, o el tipo ya serializado
// (blockers: string[]) que llega al cliente (components/EquipoProjectsBlock.tsx)
// — para no atar este archivo a un solo lado de esa frontera.
type ProjectLike = { domain: string; ownerNodeId: string; blockers: unknown };

export function isBlocked(project: Pick<ProjectLike, "blockers">): boolean {
  return Array.isArray(project.blockers) && project.blockers.length > 0;
}

export function parseBlockers(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

export function groupProjectsByDomain<T extends ProjectLike>(projects: T[]): { key: string; projects: T[] }[] {
  const map = new Map<string, T[]>();
  for (const p of projects) {
    const key = p.domain.trim() || "Sin dominio";
    const list = map.get(key) ?? [];
    list.push(p);
    map.set(key, list);
  }
  return [...map.entries()].map(([key, groupProjects]) => ({ key, projects: groupProjects })).sort((a, b) => a.key.localeCompare(b.key));
}

// "Programa" en el pedido original de Gunnar (docs/05-ROADMAP-EDT.md, el
// toggle "Dominio/Programa") no tiene un campo propio en ProjectNode —
// se interpreta acá como "quién es el Nodo dueño" (ownerNodeId), la otra
// forma natural de cortar la misma lista de proyectos sin inventar un
// campo nuevo que el roadmap no pidió. Si Gunnar quiso decir otra cosa,
// es la única función de este archivo que necesitaría cambiar.
export function groupProjectsByOwner<T extends ProjectLike>(projects: T[], nodeNameById: Map<string, string>): { key: string; projects: T[] }[] {
  const map = new Map<string, T[]>();
  for (const p of projects) {
    const key = nodeNameById.get(p.ownerNodeId) || "Sin dueño";
    const list = map.get(key) ?? [];
    list.push(p);
    map.set(key, list);
  }
  return [...map.entries()].map(([key, groupProjects]) => ({ key, projects: groupProjects })).sort((a, b) => a.key.localeCompare(b.key));
}
