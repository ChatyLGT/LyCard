"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import type { Card } from "@/generated/prisma/client";
import { updateCardAction, deleteCardAction } from "@/app/admin/actions";
import { MEDALS, RANKS, CHANNELS } from "@/lib/data";

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

const SECTION: CSSProperties = {
  background: "#201f1f",
  borderRadius: 14,
  padding: 16,
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

export default function EditorForm({ card, saved }: { card: Card; saved: boolean }) {
  const [medal, setMedal] = useState(card.medal);
  const [rank, setRank] = useState(card.rank);
  const [portraitPreview, setPortraitPreview] = useState<string | null>(card.portraitUrl);

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

      <form action={boundAction} style={{ padding: "18px 16px 40px", display: "flex", flexDirection: "column", gap: 20, maxWidth: 520, margin: "0 auto" }}>
        <input type="hidden" name="medal" value={medal} />
        <input type="hidden" name="rank" value={rank} />

        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
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

        <section style={SECTION}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <h3 style={{ margin: 0, font: "600 14px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "#F5F2EB" }}>
              Retrato Oficial
            </h3>
          </div>
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
        </section>

        <section style={SECTION}>
          <h3 style={{ margin: 0, font: "600 14px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "#F5F2EB" }}>
            Identidad Fiduciaria
          </h3>
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
        </section>

        <section style={SECTION}>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <h3 style={{ margin: 0, font: "600 14px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "#F5F2EB" }}>
              Distintivos & Honores
            </h3>
            <p style={{ margin: 0, font: "400 12px/1.6 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>
              Personaliza los distintivos de rango y honores que se mostrarán en tu tarjeta.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <span style={LABEL}>Nivel de Medallón Principal</span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 7 }}>
              {MEDALS.map((m) => {
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
                    <span style={{ width: 22, height: 22, borderRadius: 999, background: m.gem, boxShadow: "inset 0 -2px 4px rgba(0,0,0,.35)" }} />
                    <span style={{ font: `${on ? 700 : 500} 10px 'Plus Jakarta Sans',sans-serif`, color: on ? "#E5C378" : "#C2BEB5" }}>{m.es}</span>
                    <span style={{ font: "500 8px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".04em", textTransform: "uppercase", color: on ? "#C8A15A" : "#5A5A5A" }}>
                      {m.esSub}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
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
        </section>

        <section style={SECTION}>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <h3 style={{ margin: 0, font: "600 14px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "#F5F2EB" }}>
              Sabiduría
            </h3>
            <p style={{ margin: 0, font: "400 12px/1.6 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>
              Jerarquía fiduciaria en el consejo intergeneracional de gobernanza.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7 }}>
            {RANKS.map((r) => {
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
                    <span style={{ font: "600 12px 'Plus Jakarta Sans',sans-serif", color: on ? "#E5C378" : "#F5F2EB" }}>{r.es}</span>
                    <span style={{ font: "400 9px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", color: on ? "#C8A15A" : "#5A5A5A" }}>
                      {r.esSub}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section style={SECTION}>
          <h3 style={{ margin: 0, font: "600 14px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "#F5F2EB" }}>
            Canales de Contacto
          </h3>
          {CHANNELS.map((c) => (
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
          ))}
        </section>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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

      <form
        action={deleteCardAction.bind(null, card.slug)}
        style={{ maxWidth: 520, margin: "0 auto", padding: "0 16px 40px" }}
      >
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
    </div>
  );
}
