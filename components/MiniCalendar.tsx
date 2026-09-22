"use client";

import { useState, type CSSProperties } from "react";

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

const NAV_BTN: CSSProperties = { border: "none", background: "none", color: "#5A5A5A", fontSize: 13, padding: 4, cursor: "pointer" };

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Calendario mensual compartido por los 3 Superpoderes con datos por día
// (Brief, Notas de Voz, Agenda — pedido de Gunnar 2026-09-22, "un pequeño
// calendario con puntitos"): un punto por día con contenido, el color lo
// decide quien lo usa (`dotsForDay`). Puramente de presentación — la
// selección de día vive en el padre (`selectedDate`/`onSelectDate`) para
// que cada Skill arme su propia lista/popup debajo sin que este componente
// sepa nada de notas, reuniones ni eventos.
export default function MiniCalendar({
  selectedDate,
  onSelectDate,
  dotsForDay,
}: {
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  dotsForDay: (d: Date) => string[];
}) {
  const [viewMonth, setViewMonth] = useState(() => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // arranca lunes
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const monthLabel = viewMonth.toLocaleDateString("es-MX", { month: "long", year: "numeric" });

  return (
    <div style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(200,161,90,.14)", borderRadius: 16, padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button type="button" aria-label="Mes anterior" onClick={() => setViewMonth(new Date(year, month - 1, 1))} style={NAV_BTN}>‹</button>
        <span style={{ font: "700 11px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", color: "#C2BEB5" }}>
          {monthLabel}
        </span>
        <button type="button" aria-label="Mes siguiente" onClick={() => setViewMonth(new Date(year, month + 1, 1))} style={NAV_BTN}>›</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
        {WEEKDAYS.map((wd, i) => (
          <span key={i} style={{ textAlign: "center", font: "600 9px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A", padding: "2px 0 6px" }}>
            {wd}
          </span>
        ))}
        {cells.map((d, i) => {
          if (!d) return <span key={`b${i}`} />;
          const selected = sameDay(d, selectedDate);
          const dots = dotsForDay(d);
          return (
            <button
              key={d.getTime()}
              type="button"
              onClick={() => onSelectDate(d)}
              style={{
                position: "relative",
                aspectRatio: "1",
                border: "none",
                borderRadius: 10,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                background: selected ? "linear-gradient(135deg,#E5C378,#C8A15A)" : "transparent",
                color: selected ? "#0D0D0D" : "#F5F2EB",
                cursor: "pointer",
              }}
            >
              <span style={{ font: "600 11.5px 'Plus Jakarta Sans',sans-serif" }}>{d.getDate()}</span>
              <span style={{ display: "flex", gap: 3, height: 4 }}>
                {dots.map((c, di) => (
                  <span key={di} style={{ width: 4, height: 4, borderRadius: 999, background: selected ? "rgba(13,13,13,.55)" : c }} />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
