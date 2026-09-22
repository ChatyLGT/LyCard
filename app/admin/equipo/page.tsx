import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentAdminScope, isMasterN0Scope } from "@/lib/auth";
import { AccordionSection, AccordionRow, AccordionAddRow } from "@/components/Accordion";
import { groupByRung, NODE_TYPES, NODE_TYPE_LABEL, NODE_TYPE_COLOR } from "@/lib/hr";
import EquipoProjectsBlock, { type SerializedProject } from "@/components/EquipoProjectsBlock";
import EquipoTasksBlock, { type SerializedTask } from "@/components/EquipoTasksBlock";
import { createNodeAction, updateNodeAction, createProjectAction, updateProjectProgressAction, createTaskAction, updateTaskStatusAction } from "@/app/admin/equipo/actions";

export const dynamic = "force-dynamic";

const INPUT = {
  background: "#0D0D0D",
  border: "1px solid rgba(200,161,90,.25)",
  borderRadius: 8,
  padding: "8px 11px",
  color: "#F5F2EB",
  font: "400 12px 'Plus Jakarta Sans',sans-serif",
  outline: "none",
} as const;

const SAVE_BTN = {
  padding: 9,
  border: "none",
  borderRadius: 8,
  background: "#353534",
  color: "#F5F2EB",
  font: "700 10px 'Plus Jakarta Sans',sans-serif",
  letterSpacing: ".06em",
  textTransform: "uppercase",
  cursor: "pointer",
} as const;

const PILL = {
  font: "700 10px 'Plus Jakarta Sans',sans-serif",
  color: "#8a8378",
  background: "rgba(255,255,255,.05)",
  borderRadius: 999,
  padding: "3px 9px",
} as const;

function toDateInput(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

// Panel interno del equipo (Módulo HR + PM, docs/05-ROADMAP-EDT.md) —
// MasterN0-only, separado por completo de las Oficinas de cliente. Un N0
// de Programa no tiene nada que ver acá, así que ni siquiera lo
// redirigimos a una versión propia (no existe): vuelve al roster.
export default async function EquipoPage({
  searchParams,
}: {
  searchParams: Promise<{ nodeSaved?: string; nodeError?: string; projectSaved?: string; projectError?: string; taskSaved?: string; taskError?: string }>;
}) {
  const scope = await currentAdminScope();
  if (!scope) redirect("/admin/login");
  if (!isMasterN0Scope(scope)) redirect("/admin");

  const { nodeSaved, nodeError, projectSaved, projectError, taskSaved, taskError } = await searchParams;

  const [nodes, projects, tasks] = await Promise.all([
    prisma.node.findMany(),
    prisma.projectNode.findMany({ orderBy: { name: "asc" } }),
    prisma.task.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  const rungGroups = groupByRung(nodes);
  const nodeOptions = nodes.map((n) => ({ id: n.id, name: n.name })).sort((a, b) => a.name.localeCompare(b.name));

  const serializedProjects: SerializedProject[] = projects.map((p) => ({
    id: p.id,
    name: p.name,
    ownerNodeId: p.ownerNodeId,
    responsibleNodeId: p.responsibleNodeId,
    level: p.level,
    domain: p.domain,
    progressPct: p.progressPct,
    nextMilestoneTitle: p.nextMilestoneTitle,
    nextMilestoneDate: toDateInput(p.nextMilestoneDate) || null,
    blockers: Array.isArray(p.blockers) ? (p.blockers as string[]) : [],
  }));

  const serializedTasks: SerializedTask[] = tasks.map((t) => ({
    id: t.id,
    projectId: t.projectId,
    nodeId: t.nodeId,
    title: t.title,
    status: t.status,
    due: toDateInput(t.due) || null,
  }));

  return (
    <div style={{ minHeight: "100vh", background: "#131313", color: "#e5e2e1", fontFamily: "'Plus Jakarta Sans',sans-serif", padding: "0 0 60px" }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "rgba(20,20,20,.96)",
          borderBottom: "1px solid rgba(200,161,90,.22)",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <span style={{ font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".24em", textTransform: "uppercase", color: "#C8A15A" }}>
            EinarOS · Interno
          </span>
          <h1 style={{ margin: 0, font: "500 20px 'Playfair Display',serif", color: "#F5F2EB" }}>Equipo</h1>
        </div>
        <Link
          href="/admin"
          style={{
            background: "none",
            border: "1px solid rgba(200,161,90,.3)",
            borderRadius: 999,
            padding: "8px 14px",
            color: "#C2BEB5",
            font: "600 10px 'Plus Jakarta Sans',sans-serif",
            letterSpacing: ".1em",
            textTransform: "uppercase",
          }}
        >
          ← Roster
        </Link>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
        <p style={{ margin: 0, font: "400 12px/1.7 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>
          El Escalón Fractal N0–N12 completo: quién es Agente Legacy, quién es Agente Silicio puro, quién es todavía
          solo una referencia Carbono. Headcount, proyectos y tareas corrientes — un solo dato, tres cortes.
        </p>

        {/* Módulo HR — headcount por escalón */}
        <AccordionSection
          title="Headcount"
          subtitle="Los Nodos del Escalón Fractal — nombre, escalón, tipo, a qué N1.1 reportan."
          meta={<span style={PILL}>{nodes.length}</span>}
          defaultOpen={Boolean(nodeSaved || nodeError)}
        >
          {nodeSaved && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Guardado.</p>}
          {nodeError && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>Nombre, escalón y tipo son obligatorios.</p>}

          <AccordionAddRow label="Agregar Nodo" defaultOpen={nodes.length === 0}>
            <form action={createNodeAction} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input name="name" placeholder="Nombre (ej. Chaty)" required style={INPUT} />
              <div style={{ display: "flex", gap: 8 }}>
                <input name="rung" placeholder="Escalón (ej. N1, N1.1, N2)" required style={{ ...INPUT, flex: 1 }} />
                <select name="kind" defaultValue="" style={{ ...INPUT, flex: 1 }}>
                  <option value="">Tipo de nodo</option>
                  {NODE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {NODE_TYPE_LABEL[t]}
                    </option>
                  ))}
                </select>
              </div>
              <input name="role" placeholder="Rol (ej. Orquesta el plan)" style={INPUT} />
              <select name="reportsToN11Id" defaultValue="" style={INPUT}>
                <option value="">Reporta a (N1.1) — opcional</option>
                {nodeOptions.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                  </option>
                ))}
              </select>
              <button type="submit" style={SAVE_BTN}>
                Crear Nodo
              </button>
            </form>
          </AccordionAddRow>

          {rungGroups.length === 0 ? (
            <p style={{ margin: 0, font: "400 12px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>Sin nodos cargados todavía.</p>
          ) : (
            rungGroups.map((g) => (
              <div key={g.rung} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", color: "#756c5e" }}>{g.rung}</span>
                {g.nodes.map((n) => (
                  <AccordionRow
                    key={n.id}
                    title={n.name}
                    subtitle={n.role || NODE_TYPE_LABEL[n.nodeType as keyof typeof NODE_TYPE_LABEL] || n.nodeType}
                    leading={<span style={{ flex: "none", width: 22, height: 22, borderRadius: 999, background: `${NODE_TYPE_COLOR[n.nodeType as keyof typeof NODE_TYPE_COLOR] || "#8a8378"}33`, border: `1px solid ${NODE_TYPE_COLOR[n.nodeType as keyof typeof NODE_TYPE_COLOR] || "#8a8378"}` }} />}
                  >
                    <form action={updateNodeAction.bind(null, n.id)} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <input name="name" defaultValue={n.name} placeholder="Nombre" style={INPUT} />
                      <div style={{ display: "flex", gap: 8 }}>
                        <input name="rung" defaultValue={n.rung} placeholder="Escalón" style={{ ...INPUT, flex: 1 }} />
                        <select name="kind" defaultValue={n.nodeType} style={{ ...INPUT, flex: 1 }}>
                          {NODE_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {NODE_TYPE_LABEL[t]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <input name="role" defaultValue={n.role} placeholder="Rol" style={INPUT} />
                      <select name="reportsToN11Id" defaultValue={n.reportsToN11Id ?? ""} style={INPUT}>
                        <option value="">Reporta a (N1.1) — opcional</option>
                        {nodeOptions.filter((o) => o.id !== n.id).map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name}
                          </option>
                        ))}
                      </select>
                      <button type="submit" style={SAVE_BTN}>
                        Guardar
                      </button>
                    </form>
                  </AccordionRow>
                ))}
              </div>
            ))
          )}
        </AccordionSection>

        {/* Módulo PM — mismo dato, corte de avance/responsables */}
        <AccordionSection
          title="Proyectos"
          subtitle="Avance, nivel de autonomía delegada (ψ) y bloqueos — mismos Nodos de arriba, otro corte."
          meta={<span style={PILL}>{projects.length}</span>}
          defaultOpen={Boolean(projectSaved || projectError)}
        >
          {projectSaved && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Guardado.</p>}
          {projectError && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>Nombre y Nodo dueño son obligatorios.</p>}
          {nodes.length === 0 ? (
            <p style={{ margin: 0, font: "400 12px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>Cargá primero al menos un Nodo en Headcount.</p>
          ) : (
            <EquipoProjectsBlock projects={serializedProjects} nodes={nodeOptions} createAction={createProjectAction} updateAction={updateProjectProgressAction} />
          )}
        </AccordionSection>

        {/* Tareas corrientes — filtrable por escalón y tipo de nodo */}
        <AccordionSection
          title="Tareas corrientes"
          subtitle="Filtrable por escalón y tipo de nodo."
          meta={<span style={PILL}>{tasks.length}</span>}
          defaultOpen={Boolean(taskSaved || taskError)}
        >
          {taskSaved && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Guardado.</p>}
          {taskError && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>Proyecto, Nodo y título son obligatorios.</p>}
          {nodes.length === 0 || projects.length === 0 ? (
            <p style={{ margin: 0, font: "400 12px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>Cargá primero un Nodo y un Proyecto.</p>
          ) : (
            <EquipoTasksBlock
              tasks={serializedTasks}
              nodes={nodes.map((n) => ({ id: n.id, name: n.name, rung: n.rung, nodeType: n.nodeType }))}
              projects={projects.map((p) => ({ id: p.id, name: p.name }))}
              createAction={createTaskAction}
              updateAction={updateTaskStatusAction}
            />
          )}
        </AccordionSection>
      </div>
    </div>
  );
}
