"use client";

import { useState, type CSSProperties } from "react";
import { AccordionRow, AccordionAddRow } from "@/components/Accordion";
import { PROJECT_LEVELS, PROJECT_LEVEL_LABEL, isBlocked, groupProjectsByDomain, groupProjectsByOwner } from "@/lib/pm";

export type SerializedProject = {
  id: string;
  name: string;
  ownerNodeId: string;
  responsibleNodeId: string;
  level: number;
  domain: string;
  progressPct: number;
  nextMilestoneTitle: string;
  nextMilestoneDate: string | null; // yyyy-mm-dd, listo para un <input type="date">
  blockers: string[];
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

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div style={{ height: 5, borderRadius: 999, background: "rgba(255,255,255,.07)", overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.max(0, Math.min(100, pct))}%`, background: "linear-gradient(90deg,#E5C378,#C8A15A)" }} />
    </div>
  );
}

// Vista PM sobre los mismos ProjectNode del Módulo HR (docs/05-ROADMAP-EDT.md)
// — toggle Dominio/Owner, barra de avance, chip rojo si hay blockers.
export default function EquipoProjectsBlock({
  projects,
  nodes,
  createAction,
  updateAction,
}: {
  projects: SerializedProject[];
  nodes: { id: string; name: string }[];
  createAction: (formData: FormData) => Promise<void>;
  updateAction: (projectId: string, formData: FormData) => Promise<void>;
}) {
  const [groupBy, setGroupBy] = useState<"domain" | "owner">("domain");
  const nodeNameById = new Map(nodes.map((n) => [n.id, n.name]));
  const groups = groupBy === "domain" ? groupProjectsByDomain(projects) : groupProjectsByOwner(projects, nodeNameById);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 6, padding: 3, borderRadius: 999, background: "rgba(255,255,255,.04)", width: "fit-content" }}>
        {(["domain", "owner"] as const).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGroupBy(g)}
            style={{
              padding: "7px 14px",
              borderRadius: 999,
              border: "none",
              cursor: "pointer",
              background: groupBy === g ? "rgba(200,161,90,.18)" : "none",
              color: groupBy === g ? "#E5C378" : "#756c5e",
              font: "700 10px 'Plus Jakarta Sans',sans-serif",
              letterSpacing: ".08em",
              textTransform: "uppercase",
            }}
          >
            {g === "domain" ? "Por Dominio" : "Por Owner"}
          </button>
        ))}
      </div>

      <AccordionAddRow label="Agregar Proyecto" defaultOpen={projects.length === 0}>
        <form action={createAction} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input name="name" placeholder="Nombre del proyecto (ej. LyCard — Oficina Virtual)" required style={INPUT} />
          <div style={{ display: "flex", gap: 8 }}>
            <select name="ownerNodeId" defaultValue="" style={{ ...INPUT, flex: 1 }}>
              <option value="">Nodo dueño</option>
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
            <select name="responsibleNodeId" defaultValue="" style={{ ...INPUT, flex: 1 }}>
              <option value="">Responsable (= dueño si se deja vacío)</option>
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <select name="level" defaultValue="1" style={{ ...INPUT, flex: 1 }}>
              {PROJECT_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {PROJECT_LEVEL_LABEL[l]}
                </option>
              ))}
            </select>
            <input name="domain" placeholder="Dominio (ej. Producto)" style={{ ...INPUT, flex: 1 }} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input name="nextMilestoneTitle" placeholder="Próximo hito" style={{ ...INPUT, flex: 1 }} />
            <input name="nextMilestoneDate" type="date" style={{ ...INPUT, flex: "none" }} />
          </div>
          <button type="submit" style={SAVE_BTN}>
            Crear Proyecto
          </button>
        </form>
      </AccordionAddRow>

      {groups.length === 0 ? (
        <p style={{ margin: 0, font: "400 12px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>Sin proyectos cargados todavía.</p>
      ) : (
        groups.map((g) => (
          <div key={g.key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", color: "#756c5e" }}>{g.key}</span>
            {g.projects.map((p) => (
              <AccordionRow
                key={p.id}
                title={p.name}
                subtitle={`${nodeNameById.get(p.ownerNodeId) || "sin dueño"} · ${PROJECT_LEVEL_LABEL[p.level] || `nivel ${p.level}`} · ${p.progressPct}%`}
                trailing={
                  isBlocked(p) ? (
                    <span style={{ flex: "none", font: "700 8.5px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".06em", textTransform: "uppercase", color: "#e5928a", background: "rgba(229,146,138,.12)", padding: "3px 8px", borderRadius: 999 }}>
                      Bloqueado
                    </span>
                  ) : undefined
                }
              >
                <form action={updateAction.bind(null, p.id)} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <ProgressBar pct={p.progressPct} />
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>Avance %</span>
                      <input name="progressPct" type="number" min={0} max={100} defaultValue={p.progressPct} style={INPUT} />
                    </label>
                    <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>Nivel ψ</span>
                      <select name="level" defaultValue={p.level} style={INPUT}>
                        {PROJECT_LEVELS.map((l) => (
                          <option key={l} value={l}>
                            {PROJECT_LEVEL_LABEL[l]}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <input name="domain" defaultValue={p.domain} placeholder="Dominio" style={INPUT} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <input name="nextMilestoneTitle" defaultValue={p.nextMilestoneTitle} placeholder="Próximo hito" style={{ ...INPUT, flex: 1 }} />
                    <input name="nextMilestoneDate" type="date" defaultValue={p.nextMilestoneDate ?? ""} style={{ ...INPUT, flex: "none" }} />
                  </div>
                  <textarea
                    name="blockers"
                    defaultValue={p.blockers.join("\n")}
                    placeholder={"Blockers, uno por línea — vacío = sin bloqueos"}
                    rows={2}
                    style={{ ...INPUT, resize: "vertical" }}
                  />
                  <button type="submit" style={SAVE_BTN}>
                    Guardar
                  </button>
                </form>
              </AccordionRow>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
