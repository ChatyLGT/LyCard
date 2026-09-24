"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import type { OfficeSkill } from "@/lib/officeSkills";
import type { FathomBrief } from "@/lib/fathom";
import FathomBriefBlock from "@/components/FathomBriefBlock";
import VoiceNotesBlock, { type VoiceNoteSummary } from "@/components/VoiceNotesBlock";
import AgendaBlock from "@/components/AgendaBlock";
import type { AgendaEventItem, AgendaTaskItem } from "@/lib/agenda";
import FocusModeBlock from "@/components/FocusModeBlock";

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
  "modo-foco": "graphic_eq",
  custom: "bolt",
};

// El bloque de "Superpoderes" de la Oficina — reemplaza el grid suelto de
// tiles apagados que había antes (2026-09-18, pedido de Gunnar). Cada
// power es un tile cuadrado con su color/ícono (subido por el N0, o un
// ícono genérico de fallback tintado con el color) que abre un
// bottom-sheet tipo tarjeta:
//
// - Dueño: ve la app real directo (hoy: Fathom Brief, Notas de Voz,
//   Agenda) — el ícono (i) del header abre "Qué es esto" en una burbuja
//   flotante aparte, ENCIMA de la app, no reemplazándola (rediseño
//   2026-09-23, pedido de Gunnar: "no me gusta eso de APP y Qué es
//   eso... que sea una burbuja flotante encima del anterior" — antes
//   era un selector de pestañas que tapaba la app).
// - Visitante: solo ve la explicación, nunca la app real — no tiene
//   acceso a los datos del dueño, así que ni el ícono (i) ni la burbuja
//   le hacen falta.
export default function OfficeSkillsBlock({
  skills,
  kicker,
  isHost,
  fathomBrief,
  companyNetworkHref,
  cardId,
  voiceNotes,
  agendaEvents,
  agendaTasks,
  googleConnected,
  connectUrl,
}: {
  skills: OfficeSkill[];
  kicker: string;
  isHost: boolean;
  fathomBrief: FathomBrief;
  companyNetworkHref: string | null;
  cardId: string;
  voiceNotes: VoiceNoteSummary[];
  agendaEvents: AgendaEventItem[];
  agendaTasks: AgendaTaskItem[];
  googleConnected: boolean;
  connectUrl: string;
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const visible = skills.filter((s) => s.enabled);
  const active = visible.find((s) => s.key === openKey) || null;

  function openSkill(skill: OfficeSkill) {
    setOpenKey(skill.key);
    setInfoOpen(false);
  }
  function close() {
    setOpenKey(null);
    setInfoOpen(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Fix W2.1 (2026-09-24): el kicker es opcional -- cuando esta
          grilla se muestra pegada a otra (WowStore, ver oficina/page.tsx)
          el título único vive afuera, no se repite acá. */}
      {kicker && <span style={kickerStyle}>{kicker}</span>}
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
              {isHost && (
                <button
                  type="button"
                  onClick={() => setInfoOpen((v) => !v)}
                  aria-label="Qué es esto"
                  style={{
                    flex: "none", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", border: "none", borderRadius: 8,
                    background: infoOpen ? "rgba(200,161,90,.22)" : "rgba(255,255,255,.06)", color: infoOpen ? "#E5C378" : "#C2BEB5", cursor: "pointer",
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>info</span>
                </button>
              )}
              <button
                type="button"
                onClick={close}
                aria-label="Cerrar"
                style={{ flex: "none", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", border: "none", borderRadius: 8, background: "rgba(255,255,255,.06)", color: "#C2BEB5", cursor: "pointer" }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
              </button>
            </div>

            {!isHost && (
              <p style={{ margin: 0, font: "400 13px/1.7 'Plus Jakarta Sans',sans-serif", color: "rgba(245,242,235,.92)" }}>
                {active.descripcion || "Todavía sin descripción."}
              </p>
            )}

            {isHost && (
              <AppFace
                skill={active}
                fathomBrief={fathomBrief}
                companyNetworkHref={companyNetworkHref}
                cardId={cardId}
                voiceNotes={voiceNotes}
                agendaEvents={agendaEvents}
                agendaTasks={agendaTasks}
                googleConnected={googleConnected}
                connectUrl={connectUrl}
              />
            )}

            {infoOpen && (
              <>
                <div onClick={() => setInfoOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 65 }} />
                <div
                  style={{
                    position: "absolute", top: 62, right: 56, zIndex: 70, width: "calc(100% - 76px)", maxWidth: 300,
                    background: "#1f1e1e", border: "1px solid rgba(200,161,90,.4)", borderRadius: 14,
                    padding: "13px 15px", boxShadow: "0 18px 48px rgba(0,0,0,.6)",
                    display: "flex", flexDirection: "column", gap: 6,
                  }}
                >
                  <div
                    style={{
                      position: "absolute", top: -6, right: 22, width: 12, height: 12, background: "#1f1e1e",
                      border: "1px solid rgba(200,161,90,.4)", borderBottom: "none", borderRight: "none",
                      transform: "rotate(45deg)",
                    }}
                  />
                  <span style={{ font: "700 8.5px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".14em", textTransform: "uppercase", color: "#E5C378" }}>
                    Qué es esto
                  </span>
                  <p style={{ margin: 0, font: "400 12px/1.6 'Plus Jakarta Sans',sans-serif", color: "rgba(245,242,235,.92)" }}>
                    {active.descripcion || "Todavía sin descripción."}
                  </p>
                </div>
              </>
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
  agendaEvents,
  agendaTasks,
  googleConnected,
  connectUrl,
}: {
  skill: OfficeSkill;
  fathomBrief: FathomBrief;
  companyNetworkHref: string | null;
  cardId: string;
  voiceNotes: VoiceNoteSummary[];
  agendaEvents: AgendaEventItem[];
  agendaTasks: AgendaTaskItem[];
  googleConnected: boolean;
  connectUrl: string;
}) {
  if (skill.appType === "fathom-brief") return <FathomBriefBlock brief={fathomBrief} />;
  if (skill.appType === "notas-voz") return <VoiceNotesBlock cardId={cardId} initialNotes={voiceNotes} />;
  if (skill.appType === "agenda") {
    return <AgendaBlock events={agendaEvents} tasks={agendaTasks} googleConnected={googleConnected} connectUrl={connectUrl} />;
  }
  if (skill.appType === "modo-foco") return <FocusModeBlock cardId={cardId} />;
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
