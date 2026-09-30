"use client";

import { useState, type CSSProperties } from "react";
import type { Especialista, EspecialistaInstall } from "@/generated/prisma/client";
import { labelForToolKey } from "@/lib/especialistas";

const tileStyle: CSSProperties = { display: "flex", flexDirection: "column", alignItems: "center", gap: 6, textAlign: "center", cursor: "pointer", background: "none", border: "none", padding: 0, font: "inherit" };

// "Tu Equipo" -- grilla + bottom-sheet de los Especialistas instalados
// en ESTA Card, mismo patrón visual que WowAppsBlock.tsx (Fase 5,
// 2026-09-30, ver PLAN.md "Fase 4: DISEÑO -- Especialistas y
// Expertos"). Sin tile de "+ explorar" todavía -- instalar un
// Especialista es, en esta ronda, una acción de MasterN0 desde
// /admin/wowstore (cáscara honesta: no hay vidriera pública de
// Especialistas construida todavía, eso es scope de una fase futura).
export default function EspecialistasBlock({
  installs,
  wowAppNames,
}: {
  installs: (EspecialistaInstall & { especialista: Especialista })[];
  wowAppNames: Record<string, string>;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const active = installs.find((i) => i.id === openId) || null;

  if (installs.length === 0) return null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "10px 6px" }}>
      {installs.map((install) => (
        <button key={install.id} type="button" onClick={() => setOpenId(install.id)} style={tileStyle}>
          <div
            style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              background: `${install.especialista.color}1F`,
              border: `1px solid ${install.especialista.color}55`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 17, color: install.especialista.color }}>support_agent</span>
          </div>
          <span style={{ font: "400 9px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>{install.especialista.nombre}</span>
        </button>
      ))}

      {active && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={() => setOpenId(null)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.6)" }} />
          <div
            style={{
              position: "relative", width: "100%", maxWidth: 460, maxHeight: "80vh", overflowY: "auto",
              background: "#141414", borderTop: "1px solid rgba(200,161,90,.3)", borderRadius: "20px 20px 0 0",
              padding: "18px 20px calc(env(safe-area-inset-bottom,0px) + 20px)",
              display: "flex", flexDirection: "column", gap: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: `${active.especialista.color}1F`,
                  border: `1px solid ${active.especialista.color}55`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: active.especialista.color }}>support_agent</span>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ font: "700 15px 'Playfair Display',serif" }}>{active.especialista.nombre}</span>
                <span style={{ font: "600 10px 'Plus Jakarta Sans',sans-serif", color: "#8a8378" }}>{active.especialista.trabajo}</span>
              </div>
              <button
                type="button"
                onClick={() => setOpenId(null)}
                aria-label="Cerrar"
                style={{ flex: "none", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", border: "none", borderRadius: 8, background: "rgba(255,255,255,.06)", color: "#C2BEB5", cursor: "pointer" }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
              </button>
            </div>

            <p style={{ margin: 0, font: "400 13px/1.7 'Plus Jakarta Sans',sans-serif", color: "rgba(245,242,235,.92)" }}>
              {active.especialista.descripcion || "Todavía sin descripción."}
            </p>

            <p style={{ margin: 0, font: "600 10.5px 'Plus Jakarta Sans',sans-serif", color: "#8a8378" }}>
              Herramientas: {(active.especialista.toolKeys as string[]).map((k) => labelForToolKey(k, wowAppNames)).join(" · ") || "ninguna todavía"}
            </p>

            {active.especialista.suggestion && (
              <div style={{ borderRadius: 12, padding: "12px 14px", background: "rgba(127,176,196,.08)", border: "1px solid rgba(127,176,196,.3)" }}>
                <p style={{ margin: 0, font: "italic 400 12.5px/1.6 'Plus Jakarta Sans',sans-serif", color: "#7FB0C4" }}>
                  &ldquo;{active.especialista.suggestion}&rdquo;
                </p>
                <span style={{ display: "block", marginTop: 6, font: "700 9px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".06em", textTransform: "uppercase", color: "#5A5A5A" }}>
                  Sugerencia de ejemplo (simulada) -- todavía no hay un agente real sugiriendo esto.
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
