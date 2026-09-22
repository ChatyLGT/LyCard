"use client";

import { useState } from "react";
import type { AgendaEventItem, AgendaTaskItem } from "@/lib/agenda";
import MiniCalendar, { sameDay } from "@/components/MiniCalendar";

const EVENT_COLOR = "#E5C378";
const TASK_COLOR = "#9085e9";

// Rediseño 2026-09-22 (pedido de Gunnar — "no funciona, me saca un
// evento que no tengo, no muestra los que sí creé, y el diseño
// tampoco me gusta"). Dos cosas cambiaron de raíz:
//
// 1. Ahora lee la Agenda REAL de Google (lib/agenda.ts, vía
//    app/c/[slug]/oficina/page.tsx) cuando el dueño está conectado —
//    antes solo leía Card.calendarEvents, un cache local de escritura
//    que nunca reflejaba lo que hay de verdad en Google Calendar.
// 2. Calendario mensual con dos puntos por día (dorado = evento,
//    violeta = tarea) en vez de una lista plana — elegís el día, ves
//    Eventos y Tareas separados por color, cada tarea con su check.
//
// Sin conectar, se sigue mostrando el cache local simulado — pero
// ahora bajo un rótulo explícito de "Simulado", nunca mezclado como si
// fuera un dato real (cáscara honesta).
export default function AgendaBlock({
  events,
  tasks,
  googleConnected,
  connectUrl,
}: {
  events: AgendaEventItem[];
  tasks: AgendaTaskItem[];
  googleConnected: boolean;
  connectUrl: string;
}) {
  const initial = events[0]?.start ?? tasks[0]?.due ?? new Date().toISOString();
  const [selectedDate, setSelectedDate] = useState(() => new Date(initial));

  const dayEvents = events.filter((e) => sameDay(new Date(e.start), selectedDate));
  const dayTasks = tasks.filter((t) => t.due && sameDay(new Date(t.due), selectedDate));
  const hasAnyContent = events.length > 0 || tasks.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {googleConnected ? (
        <div style={{ display: "flex", alignItems: "center", gap: 6, font: "600 10.5px 'Plus Jakarta Sans',sans-serif", color: "#6FCF7A" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check_circle</span>
          Google conectado — esto es tu Calendar/Tasks real
        </div>
      ) : (
        <>
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
            Conectar Google (Calendar + Tasks)
          </a>
          <p style={{ margin: 0, font: "400 10.5px 'Plus Jakarta Sans',sans-serif", color: "#E0954B" }}>
            Sin conectar — lo de abajo es simulado, todavía no es tu agenda real.
          </p>
        </>
      )}

      {!hasAnyContent ? (
        <p style={{ margin: 0, font: "400 11px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
          Sin tareas ni eventos por ahora.
        </p>
      ) : (
        <>
          <MiniCalendar
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            dotsForDay={(d) => {
              const dots: string[] = [];
              if (events.some((e) => sameDay(new Date(e.start), d))) dots.push(EVENT_COLOR);
              if (tasks.some((t) => t.due && sameDay(new Date(t.due as string), d))) dots.push(TASK_COLOR);
              return dots;
            }}
          />

          <div style={{ display: "flex", gap: 14 }}>
            <Legend color={EVENT_COLOR} label="Eventos" />
            <Legend color={TASK_COLOR} label="Tareas" />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <span style={{ font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", color: "#756c5e" }}>
              {selectedDate.toLocaleDateString("es-MX", { day: "2-digit", month: "long" })}
            </span>

            {dayEvents.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <span style={{ font: "700 9px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: EVENT_COLOR }}>
                  Eventos
                </span>
                {dayEvents.map((e) => (
                  <a
                    key={e.id}
                    href={e.link}
                    target={e.link ? "_blank" : undefined}
                    rel={e.link ? "noreferrer" : undefined}
                    style={{
                      borderLeft: `3px solid ${EVENT_COLOR}`, background: "rgba(229,195,120,.06)", borderRadius: "0 10px 10px 0",
                      padding: "9px 12px", display: "flex", flexDirection: "column", gap: 2, textDecoration: "none", color: "inherit",
                      cursor: e.link ? "pointer" : "default",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ font: "700 12px 'Plus Jakarta Sans',sans-serif", color: "#F5F2EB" }}>{e.title}</span>
                      <span style={{ font: "700 10px 'Plus Jakarta Sans',sans-serif", color: EVENT_COLOR, flex: "none" }}>
                        {new Date(e.start).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <span style={{ font: "500 9.5px 'Plus Jakarta Sans',sans-serif", color: e.source === "google-real" ? "#6FCF7A" : "#E0954B" }}>
                      {e.source === "google-real" ? "Google Calendar · real" : "Simulado"}
                    </span>
                  </a>
                ))}
              </div>
            )}

            {dayTasks.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <span style={{ font: "700 9px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: TASK_COLOR }}>
                  Tareas
                </span>
                {dayTasks.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      borderLeft: `3px solid ${TASK_COLOR}`, background: "rgba(144,133,233,.06)", borderRadius: "0 10px 10px 0",
                      padding: "9px 12px", display: "flex", alignItems: "center", gap: 9,
                    }}
                  >
                    <span
                      style={{
                        width: 16, height: 16, flex: "none", borderRadius: 5, border: `1.5px solid ${t.done ? TASK_COLOR : "rgba(144,133,233,.5)"}`,
                        background: t.done ? TASK_COLOR : "transparent", display: "flex", alignItems: "center", justifyContent: "center",
                        font: "700 9px sans-serif", color: "#0D0D0D",
                      }}
                    >
                      {t.done ? "✓" : ""}
                    </span>
                    <span style={{ font: "600 12px 'Plus Jakarta Sans',sans-serif", color: t.done ? "#5A5A5A" : "#F5F2EB", textDecoration: t.done ? "line-through" : "none" }}>
                      {t.title}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {dayEvents.length === 0 && dayTasks.length === 0 && (
              <p style={{ margin: 0, font: "400 11.5px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>Nada agendado este día.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 5, font: "500 9.5px 'Plus Jakarta Sans',sans-serif", color: "#756c5e" }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: color, display: "inline-block" }} />
      {label}
    </span>
  );
}
