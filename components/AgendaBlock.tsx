import type { CSSProperties } from "react";
import type { CalendarEvent } from "@/lib/oficinaExtras";

const panelStyle: CSSProperties = {
  padding: 14,
  borderRadius: 12,
  background: "rgba(255,255,255,.03)",
  border: "1px solid rgba(200,161,90,.18)",
};

// Cara "App" del superpoder Agenda (Fase F, 2026-09-19) — muestra lo que
// Notas de Voz (y a futuro, Fathom) le fue mandando: real, si el dueño
// ya conectó su Google (Calendar + Tasks + Drive real, botón de abajo),
// o simulado si no — cáscara honesta, cada entrada dice cuál es.
export default function AgendaBlock({
  cardId,
  events,
  googleConnected,
  connectUrl,
}: {
  cardId: string;
  events: CalendarEvent[];
  googleConnected: boolean;
  connectUrl: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {googleConnected ? (
        <div style={{ display: "flex", alignItems: "center", gap: 6, font: "600 10.5px 'Plus Jakarta Sans',sans-serif", color: "#6FCF7A" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check_circle</span>
          Google conectado — esto ya se crea de verdad en tu Calendar/Tasks
        </div>
      ) : (
        <a
          href={connectUrl}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "10px 0", borderRadius: 12, border: "1px solid rgba(200,161,90,.35)",
            background: "rgba(200,161,90,.1)", color: "#E5C378", textDecoration: "none",
            font: "700 11.5px 'Plus Jakarta Sans',sans-serif",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>link</span>
          Conectar Google (Calendar + Tasks + Drive)
        </a>
      )}

      {events.length === 0 ? (
        <p style={{ margin: 0, font: "400 11px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
          Sin tareas ni eventos todavía — se van a ir llenando solos desde tus Notas de Voz.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {events.map((e) => (
            <div key={e.id} style={panelStyle}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                <span style={{ font: "700 12px 'Plus Jakarta Sans',sans-serif" }}>{e.title}</span>
                <span
                  style={{
                    font: "700 8px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".04em", textTransform: "uppercase",
                    color: e.source === "voz-real" ? "#6FCF7A" : "#E0954B", flexShrink: 0,
                  }}
                >
                  {e.source === "voz-real" ? "Real" : e.source === "voz-simulado" ? "Simulado" : ""}
                </span>
              </div>
              <span style={{ font: "400 9.5px 'Plus Jakarta Sans',sans-serif", color: "#756c5e" }}>
                {new Date(e.date).toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))}
        </div>
      )}
      <p style={{ margin: 0, font: "400 9px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }} data-card={cardId}>
        Se completa desde tu Skill de Notas de Voz — todavía no hay carga manual acá.
      </p>
    </div>
  );
}
