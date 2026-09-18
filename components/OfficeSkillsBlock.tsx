"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import type { OfficeSkill } from "@/lib/officeSkills";
import type { FathomBrief } from "@/lib/fathom";
import FathomBriefBlock from "@/components/FathomBriefBlock";
import VoiceNotesBlock, { type VoiceNoteSummary } from "@/components/VoiceNotesBlock";

const kickerStyle: CSSProperties = {
  font: "600 8.5px 'Plus Jakarta Sans',sans-serif",
  letterSpacing: ".16em",
  textTransform: "uppercase",
  color: "#756c5e",
};
const tileStyle: CSSProperties = { display: "flex", flexDirection: "column", alignItems: "center", gap: 6, textAlign: "center", cursor: "pointer", background: "none", border: "none", padding: 0, font: "inherit" };

const APP_TYPE_ICON: Record<OfficeSkill["appType"], string> = {
  malla: "hub",
  "fathom-brief": "videocam",
  "notas-voz": "mic",
  agenda: "calendar_month",
  mensajes: "chat",
  cartera: "account_balance_wallet",
  configuracion: "settings",
  custom: "bolt",
};

// El bloque de "Superpoderes" de la Oficina — reemplaza el grid suelto de
// tiles apagados que había antes (2026-09-18, pedido de Gunnar). Cada
// power es un tile cuadrado con su color/ícono (subido por el N0, o un
// ícono genérico de fallback tintado con el color) que abre un
// bottom-sheet tipo tarjeta con dos caras:
//
// - Dueño: pestañas "App" (lo real, si existe — hoy solo Fathom Brief) y
//   "Qué es esto" (la explicación), arranca en "App".
// - Visitante: solo ve "Qué es esto" — nunca la pestaña "App", no tiene
//   acceso a los datos del dueño.
export default function OfficeSkillsBlock({
  skills,
  kicker,
  isHost,
  fathomBrief,
  companyNetworkHref,
  cardId,
  voiceNotes,
}: {
  skills: OfficeSkill[];
  kicker: string;
  isHost: boolean;
  fathomBrief: FathomBrief;
  companyNetworkHref: string | null;
  cardId: string;
  voiceNotes: VoiceNoteSummary[];
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [tab, setTab] = useState<"app" | "info">("app");
  const visible = skills.filter((s) => s.enabled);
  const active = visible.find((s) => s.key === openKey) || null;

  function openSkill(skill: OfficeSkill) {
    setOpenKey(skill.key);
    setTab(isHost ? "app" : "info");
  }
  function close() {
    setOpenKey(null);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <span style={kickerStyle}>{kicker}</span>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "10px 6px" }}>
        {visible.map((skill) => (
          <button key={skill.key} type="button" onClick={() => openSkill(skill)} style={tileStyle}>
            <div
              style={{
                width: 34, height: 34, borderRadius: 10, overflow: "hidden", flexShrink: 0,
                background: skill.iconUrl ? "#0D0D0D" : `${skill.color}1F`,
                border: `1px solid ${skill.color}55`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {skill.iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={skill.iconUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span className="material-symbols-outlined" style={{ fontSize: 17, color: skill.color }}>
                  {APP_TYPE_ICON[skill.appType]}
                </span>
              )}
            </div>
            <span style={{ font: "400 9px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>{skill.nombre}</span>
          </button>
        ))}
      </div>

      {active && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={close} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.6)" }} />
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
                  background: active.iconUrl ? "#0D0D0D" : `${active.color}1F`,
                  border: `1px solid ${active.color}55`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {active.iconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={active.iconUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: active.color }}>
                    {APP_TYPE_ICON[active.appType]}
                  </span>
                )}
              </div>
              <span style={{ flex: 1, font: "700 15px 'Playfair Display',serif" }}>{active.nombre}</span>
              <button
                type="button"
                onClick={close}
                aria-label="Cerrar"
                style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", border: "none", borderRadius: 8, background: "rgba(255,255,255,.06)", color: "#C2BEB5", cursor: "pointer" }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
              </button>
            </div>

            {isHost && (
              <div style={{ display: "flex", gap: 6, padding: 3, borderRadius: 999, background: "rgba(255,255,255,.04)" }}>
                {(["app", "info"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    style={{
                      flex: 1, padding: "8px 0", borderRadius: 999, border: "none", cursor: "pointer",
                      background: tab === t ? "rgba(200,161,90,.18)" : "none",
                      color: tab === t ? "#E5C378" : "#756c5e",
                      font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase",
                    }}
                  >
                    {t === "app" ? "App" : "Qué es esto"}
                  </button>
                ))}
              </div>
            )}

            {(!isHost || tab === "info") && (
              <p style={{ margin: 0, font: "400 13px/1.7 'Plus Jakarta Sans',sans-serif", color: "rgba(245,242,235,.92)" }}>
                {active.descripcion || "Todavía sin descripción."}
              </p>
            )}

            {isHost && tab === "app" && (
              <AppFace skill={active} fathomBrief={fathomBrief} companyNetworkHref={companyNetworkHref} cardId={cardId} voiceNotes={voiceNotes} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// La cara "App" — lo que hay de verdad detrás de cada superpoder hoy.
// Fathom Brief es el único con backend real; el resto muestra el mismo
// estado atenuado/"próximamente" que antes vivía como tile suelto,
// ahora adentro del modal.
function AppFace({
  skill,
  fathomBrief,
  companyNetworkHref,
  cardId,
  voiceNotes,
}: {
  skill: OfficeSkill;
  fathomBrief: FathomBrief;
  companyNetworkHref: string | null;
  cardId: string;
  voiceNotes: VoiceNoteSummary[];
}) {
  if (skill.appType === "fathom-brief") return <FathomBriefBlock brief={fathomBrief} />;
  if (skill.appType === "notas-voz") return <VoiceNotesBlock cardId={cardId} initialNotes={voiceNotes} />;
  if (skill.appType === "malla" && companyNetworkHref) {
    return (
      <Link
        href={companyNetworkHref}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 12, background: "rgba(200,161,90,.08)", border: "1px solid rgba(200,161,90,.3)", color: "#E5C378", font: "700 12px 'Plus Jakarta Sans',sans-serif", textDecoration: "none" }}
      >
        Ver tu Red completa
        <span style={{ font: "700 16px sans-serif" }}>→</span>
      </Link>
    );
  }
  return (
    <p style={{ margin: 0, font: "400 11px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
      Todavía sin conectar — próximamente.
    </p>
  );
}
