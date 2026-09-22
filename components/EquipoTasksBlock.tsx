"use client";

import { useState, type CSSProperties } from "react";
import { AccordionRow, AccordionAddRow } from "@/components/Accordion";
import { TASK_STATUSES, TASK_STATUS_LABEL, TASK_STATUS_COLOR } from "@/lib/hr";

export type SerializedTask = {
  id: string;
  projectId: string;
  nodeId: string;
  title: string;
  status: string;
  due: string | null; // yyyy-mm-dd
};

const INPUT: CSSProperties = {
  background: "#0D0D0D",
  border: "1px solid rgba(200,161,90,.25)",
  borderRadius: 8,
  padding: "8px 11px",
  color: "#F5F2EB",
  font: "400 12px 'Plus Jakarta Sans',sans-serif",
  outline: "none",
};

const SAVE_BTN: CSSProperties = {
  padding: 9,
  border: "none",
  borderRadius: 8,
  background: "#353534",
  color: "#F5F2EB",
  font: "700 10px 'Plus Jakarta Sans',sans-serif",
  letterSpacing: ".06em",
  textTransform: "uppercase",
  cursor: "pointer",
};

// Filtrable por escalón y tipo de nodo (docs/05-ROADMAP-EDT.md) — el
// filtro vive acá porque Task solo tiene nodeId, el rung/nodeType hay que
// resolverlos vía el Nodo, y hacerlo en cliente evita un roundtrip al
// servidor por cada combinación de filtro.
export default function EquipoTasksBlock({
  tasks,
  nodes,
  projects,
  createAction,
  updateAction,
}: {
  tasks: SerializedTask[];
  nodes: { id: string; name: string; rung: string; nodeType: string }[];
  projects: { id: string; name: string }[];
  createAction: (formData: FormData) => Promise<void>;
  updateAction: (taskId: string, formData: FormData) => Promise<void>;
}) {
  const [filterRung, setFilterRung] = useState("");
  const [filterNodeType, setFilterNodeType] = useState("");

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const projectById = new Map(projects.map((p) => [p.id, p]));
  const rungs = [...new Set(nodes.map((n) => n.rung))];

  const filtered = tasks.filter((t) => {
    const node = nodeById.get(t.nodeId);
    if (filterRung && node?.rung !== filterRung) return false;
    if (filterNodeType && node?.nodeType !== filterNodeType) return false;
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <select value={filterRung} onChange={(e) => setFilterRung(e.target.value)} style={{ ...INPUT, flex: "1 1 120px" }}>
          <option value="">Todos los escalones</option>
          {rungs.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select value={filterNodeType} onChange={(e) => setFilterNodeType(e.target.value)} style={{ ...INPUT, flex: "1 1 160px" }}>
          <option value="">Todos los tipos de nodo</option>
          <option value="legacy">Agente Legacy</option>
          <option value="silicio">Agente Silicio</option>
          <option value="carbono_ref">Carbono-referencia</option>
        </select>
      </div>

      <AccordionAddRow label="Agregar Tarea" defaultOpen={tasks.length === 0}>
        <form action={createAction} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <select name="projectId" defaultValue="" style={INPUT}>
            <option value="">Proyecto</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select name="nodeId" defaultValue="" style={INPUT}>
            <option value="">Nodo responsable</option>
            {nodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}
              </option>
            ))}
          </select>
          <input name="title" placeholder="Título de la tarea" required style={INPUT} />
          <input name="due" type="date" style={INPUT} />
          <button type="submit" style={SAVE_BTN}>
            Crear Tarea
          </button>
        </form>
      </AccordionAddRow>

      {filtered.length === 0 ? (
        <p style={{ margin: 0, font: "400 12px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
          {tasks.length === 0 ? "Sin tareas cargadas todavía." : "Ninguna tarea con este filtro."}
        </p>
      ) : (
        filtered.map((t) => {
          const node = nodeById.get(t.nodeId);
          const project = projectById.get(t.projectId);
          return (
            <AccordionRow
              key={t.id}
              title={t.title}
              subtitle={`${project?.name || "sin proyecto"} · ${node?.name || "sin nodo"}${t.due ? ` · vence ${t.due}` : ""}`}
              leading={<span style={{ flex: "none", width: 8, height: 8, borderRadius: 999, background: TASK_STATUS_COLOR[t.status as keyof typeof TASK_STATUS_COLOR] || "#8a8378" }} />}
              trailing={
                <span style={{ flex: "none", font: "700 9px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".05em", textTransform: "uppercase", color: TASK_STATUS_COLOR[t.status as keyof typeof TASK_STATUS_COLOR] || "#8a8378" }}>
                  {TASK_STATUS_LABEL[t.status as keyof typeof TASK_STATUS_LABEL] || t.status}
                </span>
              }
            >
              <form action={updateAction.bind(null, t.id)} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <select name="status" defaultValue={t.status} style={{ ...INPUT, flex: 1 }}>
                    {TASK_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {TASK_STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                  <input name="due" type="date" defaultValue={t.due ?? ""} style={{ ...INPUT, flex: "none" }} />
                </div>
                <button type="submit" style={SAVE_BTN}>
                  Guardar
                </button>
              </form>
            </AccordionRow>
          );
        })
      )}
    </div>
  );
}
