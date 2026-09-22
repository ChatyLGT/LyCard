"use client";

import { useState } from "react";
import type { FathomBrief } from "@/lib/fathom";
import MiniCalendar, { sameDay } from "@/components/MiniCalendar";

// Cara "App" real del superpoder Fathom Brief — conecta a la API pública
// de Fathom (lib/fathom.ts). Rediseño 2026-09-22 (pedido de Gunnar, "no
// me gusta el acomodo"): calendario mensual con un punto por día que
// tuvo reuniones → lista del día → tap abre el resumen en un popup
// propio, en vez de una lista larga sin agrupar.
export default function FathomBriefBlock({ brief }: { brief: FathomBrief }) {
  if (!brief.enabled) {
    return (
      <p style={{ margin: 0, font: "400 11px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
        Todavía sin conectar a Fathom — próximamente.
      </p>
    );
  }
  if (brief.error) {
    return (
      <p style={{ margin: 0, font: "400 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>
        No se pudo conectar a Fathom ahora mismo. Probá de nuevo en un rato.
      </p>
    );
  }
  return <FathomCalendar meetings={brief.meetings} totalCount={brief.totalCount} />;
}

function FathomCalendar({ meetings, totalCount }: { meetings: import("@/lib/fathom").FathomMeeting[]; totalCount: number }) {
  const [selectedDate, setSelectedDate] = useState(() => (meetings[0] ? new Date(meetings[0].createdAt) : new Date()));
  const [openId, setOpenId] = useState<number | null>(null);

  if (meetings.length === 0) {
    return (
      <p style={{ margin: 0, font: "400 11px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
        Sin reuniones grabadas todavía en esta cuenta de Fathom.
      </p>
    );
  }

  const dayMeetings = meetings.filter((m) => sameDay(new Date(m.createdAt), selectedDate));
  const openMeeting = openId != null ? meetings.find((m) => m.recordingId === openId) ?? null : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <span style={{ font: "400 8px 'Plus Jakarta Sans',sans-serif", color: "#6b6459" }}>
          {totalCount > meetings.length ? `Mostrando ${meetings.length} de ${totalCount} · vía Fathom` : `${totalCount} reunión${totalCount === 1 ? "" : "es"} · vía Fathom`}
        </span>
      </div>

      <MiniCalendar
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        dotsForDay={(d) => (meetings.some((m) => sameDay(new Date(m.createdAt), d)) ? ["#9085e9"] : [])}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", color: "#756c5e" }}>
          Reuniones — {selectedDate.toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}
        </span>
        {dayMeetings.length === 0 ? (
          <p style={{ margin: 0, font: "400 11.5px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>Sin reuniones este día.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {dayMeetings.map((m) => (
              <button
                key={m.recordingId}
                type="button"
                onClick={() => setOpenId(m.recordingId)}
                style={{
                  textAlign: "left", border: "1px solid rgba(200,161,90,.16)", background: "rgba(255,255,255,.02)",
                  borderRadius: 12, padding: "11px 12px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                }}
              >
                <span
                  style={{
                    width: 42, flex: "none", borderRadius: 999, background: "rgba(144,133,233,.15)", color: "#9085e9",
                    display: "flex", alignItems: "center", justifyContent: "center", font: "700 10px 'Plus Jakarta Sans',sans-serif", padding: "8px 0",
                  }}
                >
                  {new Date(m.createdAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false })}
                </span>
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                  <span style={{ font: "700 12px 'Plus Jakarta Sans',sans-serif", color: "#F5F2EB", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {m.title}
                  </span>
                </span>
                <span style={{ color: "#5A5A5A", fontSize: 13, flex: "none" }}>›</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {openMeeting && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 26 }}>
          <div onClick={() => setOpenId(null)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.72)" }} />
          <div
            style={{
              position: "relative", width: "100%", maxWidth: 380, background: "#1c1b1b", border: "1px solid rgba(200,161,90,.35)",
              borderRadius: 18, padding: 20, display: "flex", flexDirection: "column", gap: 13, boxShadow: "0 24px 70px rgba(0,0,0,.65)",
              maxHeight: "80vh", overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                <span style={{ font: "700 8.5px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".14em", textTransform: "uppercase", color: "#9085e9" }}>
                  Resumen del brief
                </span>
                <span style={{ font: "600 16px 'Playfair Display',serif", color: "#F5F2EB" }}>{openMeeting.title}</span>
              </div>
              <button
                type="button"
                onClick={() => setOpenId(null)}
                aria-label="Cerrar"
                style={{ flex: "none", width: 26, height: 26, border: "none", borderRadius: 8, background: "rgba(255,255,255,.06)", color: "#C2BEB5", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>
            <span style={{ font: "500 11px 'Plus Jakarta Sans',sans-serif", color: "#756c5e" }}>
              {new Date(openMeeting.createdAt).toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })}
            </span>
            {openMeeting.summaryPreview ? (
              <p style={{ margin: 0, font: "400 12.5px/1.7 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>{openMeeting.summaryPreview}</p>
            ) : (
              <p style={{ margin: 0, font: "400 12.5px/1.7 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>Sin resumen todavía para esta reunión.</p>
            )}
            <a
              href={openMeeting.url}
              target="_blank"
              rel="noreferrer"
              style={{ marginTop: 2, font: "700 10.5px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".06em", textTransform: "uppercase", color: "#C8A15A", textDecoration: "none" }}
            >
              Ver reunión completa en Fathom →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
