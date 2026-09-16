"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import type { Card, Program, Puesto } from "@/generated/prisma/client";
import { updateCardAction, deleteCardAction } from "@/app/admin/actions";
import { createSiblingCardsAction } from "@/app/admin/siblings-actions";
import { MEDALS, RANKS, CHANNELS } from "@/lib/data";
import type { EscalaItem } from "@/lib/escalas";
import { AccordionSection } from "@/components/Accordion";

const FIELD_WRAP: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  background: "#0D0D0D",
  borderRadius: 10,
  padding: "11px 14px",
};

const FIELD_INPUT: CSSProperties = {
  flex: 1,
  minWidth: 0,
  background: "none",
  border: "none",
  outline: "none",
  color: "#F5F2EB",
  font: "400 14px 'Plus Jakarta Sans',sans-serif",
};

const LABEL: CSSProperties = {
  font: "500 10px 'Plus Jakarta Sans',sans-serif",
  letterSpacing: ".16em",
  textTransform: "uppercase",
  color: "#C2BEB5",
};

export default function EditorForm({
  card,
  isMasterN0,
  programs,
  puestos,
  medalScale,
  rankScale,
  contactsScale,
  saved,
  siblingsCreated,
  siblingError,
}: {
  card: Card;
  isMasterN0: boolean;
  programs: Program[];
  puestos: Puesto[];
  medalScale: EscalaItem[];
  rankScale: EscalaItem[];
  contactsScale: EscalaItem[];
  saved: boolean;
  siblingsCreated?: string;
  siblingError?: string;
}) {
  const [medal, setMedal] = useState(card.medal);
  const [rank, setRank] = useState(card.rank);
  const [contacts, setContacts] = useState(card.contacts);
  const [portraitPreview, setPortraitPreview] = useState<string | null>(card.portraitUrl);
  // Project cards inherit their official social channels from the Program
  // (see LyCardView) — only their own personal WhatsApp stays editable
  // here. Company/Personal cards keep editing all 8 as before.
  const isProject = card.kind === "project";
  const isCompany = card.kind === "company";
  // Project cards under a Program with a custom Escala (Fase 9.4/9.5) pick
  // from it instead of the fixed lib/data.ts lists — same "empty = keep the
  // default" fallback as the Puesto select right below this.
  const medalOptions =
    isProject && medalScale.length > 0
      ? medalScale.map((m) => ({ id: m.key, label: m.nombre, sub: m.subtitulo, swatch: m.color || "#8C5A2B" }))
      : MEDALS.map((m) => ({ id: m.id, label: m.es, sub: m.esSub, swatch: m.gem }));
  const rankOptions =
    isProject && rankScale.length > 0
      ? rankScale.map((r) => ({ id: r.key, label: r.nombre, sub: r.subtitulo, icon: r.icono || "auto_awesome" }))
      : RANKS.map((r) => ({ id: r.id, label: r.es, sub: r.esSub, icon: r.icon }));
  // "Gente contactada" (2026-09-16) — same key space/fallback pattern as
  // medalOptions, just a separate Program scale so it can carry its own
  // tiers/icons independent of the real Medallón.
  const contactsOptions =
    isProject && contactsScale.length > 0
      ? contactsScale.map((c) => ({ id: c.key, label: c.nombre, sub: c.subtitulo, swatch: c.color || "#8C5A2B" }))
      : MEDALS.map((m) => ({ id: m.id, label: m.es, sub: m.esSub, swatch: m.gem }));

  const boundAction = updateCardAction.bind(null, card.slug);

  return (
    <div style={{ minHeight: "100vh", background: "#131313", color: "#e5e2e1", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          background: "rgba(20,20,20,.96)",
          borderBottom: "1px solid rgba(200,161,90,.22)",
          padding: "0 16px",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link
          href="/admin"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: "#eac076",
            font: "600 10px 'Plus Jakarta Sans',sans-serif",
            letterSpacing: ".18em",
            textTransform: "uppercase",
          }}
        >
          ← Roster
        </Link>
        <h2 style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".24em", textTransform: "uppercase", color: "#C8A15A" }}>
          Mi LyCard
        </h2>
        <Link
          href={`/c/${card.slug}`}
          target="_blank"
          style={{
            padding: "7px 13px",
            borderRadius: 999,
            background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)",
            color: "#0D0D0D",
            font: "700 10px 'Plus Jakarta Sans',sans-serif",
            letterSpacing: ".12em",
            textTransform: "uppercase",
          }}
        >
          Ver
        </Link>
      </div>

      <form action={boundAction} style={{ padding: "18px 16px 40px", display: "flex", flexDirection: "column", gap: 12, maxWidth: 520, margin: "0 auto" }}>
        <input type="hidden" name="medal" value={medal} />
        <input type="hidden" name="rank" value={rank} />
        <input type="hidden" name="contacts" value={contacts} />

        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: "#C8A15A" }} />
            <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".24em", textTransform: "uppercase", color: "#C8A15A" }}>
              Mi tarjeta Legacy
            </span>
          </div>
          <h2 style={{ margin: 0, font: "500 22px 'Playfair Display',serif", color: "#F5F2EB" }}>Personalizar LyCard</h2>
          <p style={{ margin: 0, font: "400 12px/1.6 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>
            Tu tarjeta de presentación digital del Programa Legacy: foto, datos, distintivos y canales de contacto.
          </p>
          {saved && (
            <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>
              ✓ Tarjeta guardada.
            </p>
          )}
        </div>

        <AccordionSection title="Retrato Oficial" defaultOpen={true}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 96, height: 96, flex: "none", borderRadius: 999, overflow: "hidden", background: "#0D0D0D", boxShadow: "0 8px 24px rgba(0,0,0,.6)" }}>
              {portraitPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={portraitPreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : null}
            </div>
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 7,
                  padding: 10,
                  borderRadius: 10,
                  background: "#353534",
                  color: "#F5F2EB",
                  font: "600 11px 'Plus Jakarta Sans',sans-serif",
                  letterSpacing: ".1em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                Subir nueva foto
                <input
                  type="file"
                  name="portrait"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setPortraitPreview(URL.createObjectURL(file));
                  }}
                />
              </label>
            </div>
          </div>
        </AccordionSection>

        <AccordionSection title="Identidad Fiduciaria" defaultOpen={true}>
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={LABEL}>Nombre Completo</span>
            <div style={FIELD_WRAP}>
              <input name="name" defaultValue={card.name} style={FIELD_INPUT} />
            </div>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={LABEL}>Cargo / Título Profesional</span>
            <div style={FIELD_WRAP}>
              <input name="title" defaultValue={card.title} style={FIELD_INPUT} />
            </div>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={LABEL}>Cita de Marca / Lema</span>
            <div style={FIELD_WRAP}>
              <input name="quote" defaultValue={card.quote} style={{ ...FIELD_INPUT, fontStyle: "italic" }} />
            </div>
          </label>
          {!isProject && (
            <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={LABEL}>Nombre en la Islita (arriba de la foto)</span>
              <div style={FIELD_WRAP}>
                <input
                  name="islandLabel"
                  defaultValue={card.islandLabel}
                  placeholder={isCompany ? "My Business Card" : "My Personal Card"}
                  style={FIELD_INPUT}
                />
              </div>
            </label>
          )}
        </AccordionSection>

        {isProject && isMasterN0 && (
          <AccordionSection title="Programa" subtitle="De qué Programa depende esta tarjeta: sus puestos, escalas y textos personalizados.">
            {/* Gates isOrigin processing in updateCardAction — present
                whenever this MasterN0-only section renders, independent of
                whether the Programa select below has anything to show. */}
            <input type="hidden" name="masterN0Section" value="1" />
            {programs.length > 0 ? (
              <div style={{ background: "#0D0D0D", borderRadius: 10, padding: 9 }}>
                <select
                  name="programId"
                  defaultValue={card.programId || ""}
                  style={{ width: "100%", background: "none", border: "none", outline: "none", color: "#F5F2EB", font: "400 12.5px 'Plus Jakarta Sans',sans-serif" }}
                >
                  <option value="">— Sin Programa —</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p style={{ margin: 0, font: "400 11px/1.5 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
                Todavía no hay Programas — creá uno en /admin/programs.
              </p>
            )}
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" name="isOrigin" value="1" defaultChecked={card.isOrigin} style={{ width: 16, height: 16, accentColor: "#C8A15A" }} />
              <span style={{ font: "400 12px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>
                Es el Origen — visible en modo host para cualquiera, sin necesitar login (debería haber sólo una)
              </span>
            </label>
          </AccordionSection>
        )}

        <AccordionSection title="Distintivos & Honores" subtitle="Personaliza los distintivos de rango y honores que se mostrarán en tu tarjeta.">
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <span style={LABEL}>Nivel de Medallón Principal</span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 7 }}>
              {medalOptions.map((m) => {
                const on = m.id === medal;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMedal(m.id)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 5,
                      padding: "9px 4px",
                      borderRadius: 10,
                      border: "none",
                      cursor: "pointer",
                      background: on ? "#353534" : "#1c1b1b",
                    }}
                  >
                    <span style={{ width: 22, height: 22, borderRadius: 999, background: m.swatch, boxShadow: "inset 0 -2px 4px rgba(0,0,0,.35)" }} />
                    <span style={{ font: `${on ? 700 : 500} 10px 'Plus Jakarta Sans',sans-serif`, color: on ? "#E5C378" : "#C2BEB5" }}>{m.label}</span>
                    <span style={{ font: "500 8px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".04em", textTransform: "uppercase", color: on ? "#C8A15A" : "#5A5A5A" }}>
                      {m.sub}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <span style={LABEL}>Nivel de Gente Contactada</span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 7 }}>
              {contactsOptions.map((c) => {
                const on = c.id === contacts;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setContacts(c.id)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 5,
                      padding: "9px 4px",
                      borderRadius: 10,
                      border: "none",
                      cursor: "pointer",
                      background: on ? "#353534" : "#1c1b1b",
                    }}
                  >
                    <span style={{ width: 22, height: 22, borderRadius: 999, background: c.swatch, boxShadow: "inset 0 -2px 4px rgba(0,0,0,.35)" }} />
                    <span style={{ font: `${on ? 700 : 500} 10px 'Plus Jakarta Sans',sans-serif`, color: on ? "#E5C378" : "#C2BEB5" }}>{c.label}</span>
                    <span style={{ font: "500 8px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".04em", textTransform: "uppercase", color: on ? "#C8A15A" : "#5A5A5A" }}>
                      {c.sub}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          {isProject && puestos.length > 0 ? (
            <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={LABEL}>Puesto</span>
              <div style={{ background: "#0D0D0D", borderRadius: 10, padding: 9 }}>
                <select
                  name="puestoId"
                  defaultValue={card.puestoId || ""}
                  style={{ width: "100%", background: "none", border: "none", outline: "none", color: "#F5F2EB", font: "400 12.5px 'Plus Jakarta Sans',sans-serif" }}
                >
                  <option value="">— Mantener texto actual ({card.siglas} — {card.tooltip}) —</option>
                  {puestos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.siglas} — {p.denominacion}
                    </option>
                  ))}
                </select>
              </div>
              <p style={{ margin: 0, font: "400 11px/1.5 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
                La escalera de puestos la arma el N0 de tu Programa.
              </p>
            </label>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <span style={LABEL}>Siglas</span>
                <div style={{ background: "#0D0D0D", borderRadius: 10, padding: 9 }}>
                  <input
                    name="siglas"
                    defaultValue={card.siglas}
                    style={{ width: "100%", background: "none", border: "none", outline: "none", textAlign: "center", color: "#E5C378", font: "600 12px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".18em", textTransform: "uppercase" }}
                  />
                </div>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <span style={LABEL}>Denominación / Tooltip</span>
                <div style={{ background: "#0D0D0D", borderRadius: 10, padding: "9px 12px" }}>
                  <input name="tooltip" defaultValue={card.tooltip} style={{ width: "100%", background: "none", border: "none", outline: "none", color: "#F5F2EB", font: "400 12px 'Plus Jakarta Sans',sans-serif" }} />
                </div>
              </label>
            </div>
          )}
        </AccordionSection>

        <AccordionSection title="Sabiduría" subtitle="Jerarquía fiduciaria en el consejo intergeneracional de gobernanza.">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7 }}>
            {rankOptions.map((r) => {
              const on = r.id === rank;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRank(r.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    padding: 11,
                    borderRadius: 10,
                    border: `1px solid ${on ? "rgba(200,161,90,.55)" : "transparent"}`,
                    background: on ? "rgba(200,161,90,.12)" : "#1c1b1b",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 19, color: on ? "#E5C378" : "#9a8f80" }}>
                    {r.icon}
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <span style={{ font: "600 12px 'Plus Jakarta Sans',sans-serif", color: on ? "#E5C378" : "#F5F2EB" }}>{r.label}</span>
                    <span style={{ font: "400 9px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", color: on ? "#C8A15A" : "#5A5A5A" }}>
                      {r.sub}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </AccordionSection>

        <AccordionSection title="Canales de Contacto">
          {isProject ? (
            <>
              <label style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 4 }}>
                <span style={LABEL}>WhatsApp (contacto directo)</span>
                <div style={FIELD_WRAP}>
                  <span className="material-symbols-outlined" style={{ fontSize: 17, color: "#C8A15A" }}>
                    chat
                  </span>
                  <input name="wa" defaultValue={card.wa} style={FIELD_INPUT} />
                </div>
              </label>
              <p style={{ margin: 0, font: "400 11.5px/1.6 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
                El resto de las redes (Instagram, LinkedIn, X, Facebook, TikTok, YouTube, Web) se administran desde el Programa.
              </p>
            </>
          ) : (
            CHANNELS.map((c) => (
              <label key={c.id} style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 4 }}>
                <span style={LABEL}>{c.label}</span>
                <div style={FIELD_WRAP}>
                  <span className="material-symbols-outlined" style={{ fontSize: 17, color: "#C8A15A" }}>
                    {c.icon}
                  </span>
                  <input
                    name={c.id}
                    defaultValue={card[c.id as "wa" | "ig" | "li" | "x" | "fb" | "tiktok" | "yt" | "web"]}
                    style={FIELD_INPUT}
                  />
                </div>
              </label>
            ))
          )}
        </AccordionSection>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}>
          <button
            type="submit"
            style={{
              width: "100%",
              padding: 15,
              border: "none",
              borderRadius: 14,
              background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)",
              color: "#0D0D0D",
              font: "700 13px 'Plus Jakarta Sans',sans-serif",
              letterSpacing: ".14em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Guardar Tarjeta
          </button>
        </div>
      </form>

      {isProject && (
        <div style={{ maxWidth: 520, margin: "0 auto 12px", padding: "0 16px" }}>
          <AccordionSection title="Business y Personal" subtitle="Crea las otras 2 tarjetas de esta persona (copiando lo que ya tiene esta como punto de partida) directamente desde acá, sin pasar por el WhatsApp simulado. Si ya existen, no hace nada.">
            {siblingError === "noWa" && (
              <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>
                Cargá un WhatsApp en Canales de Contacto y guardá antes de crearlas — hace falta para identificar a la persona.
              </p>
            )}
            {siblingsCreated != null && (
              <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>
                {siblingsCreated === "0" ? "Ya existían las dos — no se creó nada nuevo." : `✓ ${siblingsCreated} tarjeta(s) nueva(s) creada(s).`}
              </p>
            )}
            <form action={createSiblingCardsAction.bind(null, card.slug)}>
              <button
                type="submit"
                style={{ padding: "10px 16px", border: "1px solid rgba(200,161,90,.3)", borderRadius: 10, background: "#353534", color: "#F5F2EB", font: "700 11px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", cursor: "pointer" }}
              >
                Crear Business y Personal
              </button>
            </form>
          </AccordionSection>
        </div>
      )}

      <div style={{ maxWidth: 520, margin: "0 auto", padding: "0 16px 40px" }}>
        <AccordionSection title="Eliminar esta LyCard" tone="danger">
          <form action={deleteCardAction.bind(null, card.slug)}>
            <button
              type="submit"
              style={{
                width: "100%",
                padding: 12,
                border: "1px solid rgba(229,146,138,.35)",
                borderRadius: 12,
                background: "transparent",
                color: "#e5928a",
                font: "600 11px 'Plus Jakarta Sans',sans-serif",
                letterSpacing: ".1em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Eliminar esta LyCard
            </button>
          </form>
        </AccordionSection>
      </div>
    </div>
  );
}
