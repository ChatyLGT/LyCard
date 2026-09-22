import type { Node, Task } from "@/generated/prisma/client";

// Módulo HR (docs/05-ROADMAP-EDT.md) — los 3 tipos de Node del fractal.
// "Silicio" y "Carbono-referencia" no son sinónimos de agente/humano: un
// Agente Legacy YA es la fusión humano+Agente, un Agente Silicio es puro
// (sin humano correspondiente), y un Carbono-referencia todavía no es un
// agente — es una persona real mapeada que puede dar origen a uno.
export type NodeType = "legacy" | "silicio" | "carbono_ref";

export const NODE_TYPES: NodeType[] = ["legacy", "silicio", "carbono_ref"];

export const NODE_TYPE_LABEL: Record<NodeType, string> = {
  legacy: "Agente Legacy",
  silicio: "Agente Silicio",
  carbono_ref: "Carbono-referencia",
};

export const NODE_TYPE_COLOR: Record<NodeType, string> = {
  legacy: "#9085e9",
  silicio: "#C8A15A",
  carbono_ref: "#8a8378",
};

export function isNodeType(v: string): v is NodeType {
  return (NODE_TYPES as string[]).includes(v);
}

// "N0", "N1.1", "N12" → orden numérico real. N1.1 es el único
// sub-escalón (Einar, ver docs/05-ROADMAP-EDT.md) y debe caer justo
// después de N1 y antes de N2 — por eso el orden se calcula parseando el
// número en vez de un sort de texto plano (que pondría "N12" antes que
// "N2").
export function rungSortKey(rung: string): number {
  const n = parseFloat(rung.replace(/^N/i, ""));
  return Number.isNaN(n) ? 999 : n;
}

export function groupByRung(nodes: Node[]): { rung: string; nodes: Node[] }[] {
  const map = new Map<string, Node[]>();
  for (const n of nodes) {
    const list = map.get(n.rung) ?? [];
    list.push(n);
    map.set(n.rung, list);
  }
  return [...map.entries()]
    .map(([rung, rungNodes]) => ({ rung, nodes: rungNodes.sort((a, b) => a.name.localeCompare(b.name)) }))
    .sort((a, b) => rungSortKey(a.rung) - rungSortKey(b.rung));
}

export const TASK_STATUSES = ["pendiente", "en_curso", "hecho", "bloqueado"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  pendiente: "Pendiente",
  en_curso: "En curso",
  hecho: "Hecho",
  bloqueado: "Bloqueado",
};

export const TASK_STATUS_COLOR: Record<TaskStatus, string> = {
  pendiente: "#8a8378",
  en_curso: "#E0954B",
  hecho: "#6FCF7A",
  bloqueado: "#e5928a",
};

export function isTaskStatus(v: string): v is TaskStatus {
  return (TASK_STATUSES as readonly string[]).includes(v);
}

export function tasksByNode(tasks: Task[]): Map<string, Task[]> {
  const map = new Map<string, Task[]>();
  for (const t of tasks) {
    const list = map.get(t.nodeId) ?? [];
    list.push(t);
    map.set(t.nodeId, list);
  }
  return map;
}
