import type { CSSProperties } from "react";
import type { CalendarEvent } from "@/lib/oficinaExtras";
import { sortCalendarEventsByDate } from "@/lib/oficinaExtras";

const kicker: CSSProperties = {
  font: "600 8.5px 'Plus Jakarta Sans',sans-serif",
  letterSpacing: ".16em",
  textTransform: "uppercase",
  color: "#756c5e",
};
const panel: CSSProperties = {
  padding: 12,
  borderRadius: 12,
  background: "rgba(255,255,255,.03)",
  border: "1px solid rgba(200,161,90,.18)",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-AR", { weekday: "short", day: "2-digit", month: "short" });
}

// Fase E4 — "Calendario": vista de lista ordenada por fecha, no una
// grilla mensual (alcance recortado a propósito, ver PLAN.md) — próximas
// tareas/eventos inventados/editables desde OficinaExtrasEditor. Privado
// del dueño, al final de la Oficina. isDefault marca los ejemplos fijos
// de DEFAULT_CALENDAR_EVENTS.
export default function CalendarBlock({ events, isDefault, accent }: { events: CalendarEvent[]; isDefault: boolean; accent: string }) {
  if (events.length === 0) return null;
  const sorted = sortCalendarEventsByDate(events);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <span style={kicker}>Calendario</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sorted.map((ev) => (
          <div key={ev.id} style={{ ...panel, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: "none", width: 44, textAlign: "center" }}>
              <span style={{ display: "block", font: "700 9px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".04em", textTransform: "uppercase", color: accent }}>
                {formatDate(ev.date)}
              </span>
              {ev.time && <span style={{ display: "block", font: "400 10px 'Plus Jakarta Sans',sans-serif", color: "#8f8578" }}>{ev.time}</span>}
            </div>
            <span style={{ font: "600 12px 'Plus Jakarta Sans',sans-serif", color: "#F3F0E9" }}>{ev.title}</span>
          </div>
        ))}
      </div>
      {isDefault && (
        <span style={{ font: "400 9px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
          Eventos de ejemplo — cargá los tuyos desde tu editor.
        </span>
      )}
    </div>
  );
}
