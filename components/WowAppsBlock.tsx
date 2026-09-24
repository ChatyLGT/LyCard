"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import type { WowApp, WowAppInstall } from "@/generated/prisma/client";
import WowAweBlock, { type AweWalkEntrySummary } from "@/components/WowAweBlock";

const tileStyle: CSSProperties = { display: "flex", flexDirection: "column", alignItems: "center", gap: 6, textAlign: "center", cursor: "pointer", background: "none", border: "none", padding: 0, font: "inherit" };

// Grilla + bottom-sheet de las WowApps instaladas en ESTA Card (mismo
// patrón visual que OfficeSkillsBlock.tsx, fuente de datos distinta:
// card.wowAppInstalls, no Program.officeSkills -- ver PLAN.md "WowStore
// -- Fase W1"). Ninguna WowApp tiene lógica real conectada todavía en
// esta ronda (cáscara honesta, mismo criterio que el resto del
// proyecto): la cara "App" siempre cae al fallback "Todavía sin conectar
// -- próximamente", igual que hacía cualquier Superpoder sin backend.
//
// `browseHref` (2026-09-24, pedido de Gunnar): el acceso al WowStore
// -- la vidriera donde se buscan/instalan más WowApps -- vive DENTRO de
// esta misma grilla como un tile más ("+ WowStore"), no como un link
// aparte en otra pantalla. Solo el dueño lo ve -- un visitante no puede
// instalar nada en una Card ajena.
export default function WowAppsBlock({
  installs,
  isHost,
  browseHref,
  cardId,
  aweEntries,
}: {
  installs: (WowAppInstall & { wowApp: WowApp })[];
  isHost: boolean;
  browseHref?: string;
  cardId: string;
  aweEntries: AweWalkEntrySummary[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const active = installs.find((i) => i.id === openId) || null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "10px 6px" }}>
      {isHost && browseHref && (
        <Link href={browseHref} style={{ ...tileStyle, textDecoration: "none" }}>
          <div
            style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              border: "1px dashed rgba(200,161,90,.45)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 17, color: "#C8A15A" }}>add</span>
          </div>
          <span style={{ font: "400 9px 'Plus Jakarta Sans',sans-serif", color: "#C8A15A" }}>WowStore</span>
        </Link>
      )}
      {installs.map((install) => (
        <button key={install.id} type="button" onClick={() => setOpenId(install.id)} style={tileStyle}>
          <div
            style={{
              width: 34, height: 34, borderRadius: 10, overflow: "hidden", flexShrink: 0,
              background: install.wowApp.iconUrl ? "#0D0D0D" : `${install.wowApp.color}1F`,
              border: `1px solid ${install.wowApp.color}55`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {install.wowApp.iconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={install.wowApp.iconUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span className="material-symbols-outlined" style={{ fontSize: 17, color: install.wowApp.color }}>bolt</span>
            )}
          </div>
          <span style={{ font: "400 9px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>{install.wowApp.nombre}</span>
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
                  width: 36, height: 36, borderRadius: 10, overflow: "hidden", flexShrink: 0,
                  background: active.wowApp.iconUrl ? "#0D0D0D" : `${active.wowApp.color}1F`,
                  border: `1px solid ${active.wowApp.color}55`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {active.wowApp.iconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={active.wowApp.iconUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: active.wowApp.color }}>bolt</span>
                )}
              </div>
              <span style={{ flex: 1, font: "700 15px 'Playfair Display',serif" }}>{active.wowApp.nombre}</span>
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
              {active.wowApp.descripcion || "Todavía sin descripción."}
            </p>

            {isHost && active.adaptationStatus !== "sin_pedir" && (
              <p style={{ margin: 0, font: "600 10.5px 'Plus Jakarta Sans',sans-serif", color: "#E5C378" }}>
                Adaptación a medida: {active.adaptationStatus}
              </p>
            )}

            {isHost && active.wowApp.appType === "awe" && (
              <WowAweBlock cardId={cardId} initialEntries={aweEntries} />
            )}

            {isHost && active.wowApp.appType !== "awe" && (
              <p style={{ margin: 0, font: "400 11px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
                Todavía sin conectar — próximamente.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
