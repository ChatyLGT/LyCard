"use client";

import { useState, type CSSProperties } from "react";
import type { Card } from "@/generated/prisma/client";
import {
  parseRealityCheckKpis,
  parseNewsItems,
  parseCalendarEvents,
  generateSimulatedKpis,
  type RealityCheckKpi,
  type NewsItem,
  type CalendarEvent,
} from "@/lib/oficinaExtras";
import { AccordionSection, AccordionRow } from "@/components/Accordion";

function uid() {
  return Math.random().toString(36).slice(2);
}

const FIELD: CSSProperties = {
  background: "#0D0D0D",
  border: "1px solid rgba(200,161,90,.25)",
  borderRadius: 8,
  padding: "8px 11px",
  color: "#F5F2EB",
  font: "400 12px 'Plus Jakarta Sans',sans-serif",
  outline: "none",
};

const LABEL: CSSProperties = {
  font: "500 10px 'Plus Jakarta Sans',sans-serif",
  letterSpacing: ".16em",
  textTransform: "uppercase",
  color: "#C2BEB5",
};

const ADD_BTN: CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: 11,
  border: "1px dashed rgba(200,161,90,.4)", borderRadius: 10, background: "none", color: "#C8A15A",
  font: "700 11px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", cursor: "pointer",
};

const REMOVE_BTN: CSSProperties = {
  flex: "none", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
  border: "none", borderRadius: 8, background: "rgba(229,146,138,.12)", color: "#e5928a", cursor: "pointer",
};

type EditableKpi = RealityCheckKpi & { _uid: string };
type EditableNews = NewsItem & { _uid: string };
type EditableEvent = CalendarEvent & { _uid: string };

// Contenido de la Oficina Virtual por Card — Fase E2 del plan (Keep in
// Flow / Chequeo de Realidad / Noticias / Calendario, todo inventado por el
// N0/dueño y editable). Deliberadamente SIN su propio <form>: se monta
// adentro del form grande de EditorForm.tsx/MemberCardEditor.tsx (mismo
// patrón que officeItems ya usa ahí) para que se guarde junto con el
// resto de la tarjeta con un solo "Guardar Tarjeta" — HTML no permite
// <form> anidado, así que un botón de submit propio acá no funcionaría.
//
// "Generar con IA (simulado)": no llama a ningún modelo real (mismo
// alcance que pickPhraseOfTheDay) — solo rellena los KPIs con valores de
// ejemplo coherentes (lib/oficinaExtras.ts#generateSimulatedKpis), 100%
// client-side. El N0 todavía tiene que tocar "Guardar Tarjeta" para que
// quede — no escribe la DB por su cuenta.
export default function OficinaExtrasEditor({ card }: { card: Card }) {
  const [kpis, setKpis] = useState<EditableKpi[]>(() =>
    parseRealityCheckKpis(card.realityCheckKpis).map((k) => ({ ...k, _uid: uid() }))
  );
  const [news, setNews] = useState<EditableNews[]>(() =>
    parseNewsItems(card.newsItems).map((n) => ({ ...n, _uid: uid() }))
  );
  const [events, setEvents] = useState<EditableEvent[]>(() =>
    parseCalendarEvents(card.calendarEvents).map((e) => ({ ...e, _uid: uid() }))
  );

  function addKpi() {
    setKpis((ks) => [...ks, { key: "", label: "", value: "", unit: "", trend: [], _uid: uid() }]);
  }
  function updateKpi(u: string, patch: Partial<RealityCheckKpi>) {
    setKpis((ks) => ks.map((k) => (k._uid === u ? { ...k, ...patch } : k)));
  }
  function removeKpi(u: string) {
    setKpis((ks) => ks.filter((k) => k._uid !== u));
  }
  function simulateKpis() {
    setKpis(generateSimulatedKpis().map((k) => ({ ...k, _uid: uid() })));
  }

  function addNews() {
    setNews((ns) => [...ns, { id: uid(), title: "", body: "", date: new Date().toISOString().slice(0, 10), _uid: uid() }]);
  }
  function updateNews(u: string, patch: Partial<NewsItem>) {
    setNews((ns) => ns.map((n) => (n._uid === u ? { ...n, ...patch } : n)));
  }
  function removeNews(u: string) {
    setNews((ns) => ns.filter((n) => n._uid !== u));
  }

  function addEvent() {
    setEvents((es) => [...es, { id: uid(), title: "", date: new Date().toISOString().slice(0, 10), time: "", _uid: uid() }]);
  }
  function updateEvent(u: string, patch: Partial<CalendarEvent>) {
    setEvents((es) => es.map((e) => (e._uid === u ? { ...e, ...patch } : e)));
  }
  function removeEvent(u: string) {
    setEvents((es) => es.filter((e) => e._uid !== u));
  }

  return (
    <>
      <input type="hidden" name="realityCheckKpis" value={JSON.stringify(kpis.filter((k) => k.label.trim()).map(({ _uid, ...rest }) => rest))} />
      <input type="hidden" name="newsItems" value={JSON.stringify(news.filter((n) => n.title.trim()).map(({ _uid, ...rest }) => rest))} />
      <input type="hidden" name="calendarEvents" value={JSON.stringify(events.filter((e) => e.title.trim() && e.date).map(({ _uid, ...rest }) => rest))} />

      <AccordionSection title="Objetivo del Día" subtitle="Tu objetivo o posición del día — se muestra arriba en tu Oficina, junto a una frase motivacional que rota sola (la carga tu Programa).">
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={LABEL}>Objetivo del día</span>
          <div style={{ background: "#0D0D0D", borderRadius: 10, padding: "11px 14px" }}>
            <input
              name="oficinaObjetivo"
              defaultValue={card.oficinaObjetivo}
              placeholder="Ej. Cerrar 3 Legacys nuevos esta semana"
              style={{ width: "100%", background: "none", border: "none", outline: "none", color: "#F5F2EB", font: "400 14px 'Plus Jakarta Sans',sans-serif" }}
            />
          </div>
        </label>
      </AccordionSection>

      <AccordionSection title="Chequeo de Realidad" subtitle="Tus KPIs del día — inventalos vos, o tocá el botón para que se llenen solos con un ejemplo y los ajustás después.">
        <button type="button" onClick={simulateKpis} style={ADD_BTN}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>auto_awesome</span>
          Generar con IA (simulado)
        </button>

        {kpis.length === 0 && (
          <p style={{ margin: 0, font: "400 12px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
            Sin KPIs propios todavía — usá el botón de arriba o agregá uno a mano.
          </p>
        )}

        {kpis.map((kpi) => (
          <AccordionRow key={kpi._uid} title={kpi.label || "(sin nombre)"} subtitle={kpi.value ? `${kpi.value}${kpi.unit}` : undefined}
            trailing={
              <button type="button" onClick={() => removeKpi(kpi._uid)} aria-label="Quitar" style={REMOVE_BTN}>
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>close</span>
              </button>
            }
          >
            <input
              placeholder="Nombre (ej. Legacys activos)"
              value={kpi.label}
              onChange={(e) => updateKpi(kpi._uid, { label: e.target.value, key: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-") })}
              style={{ ...FIELD, color: "#F5F2EB", font: "600 12.5px 'Plus Jakarta Sans',sans-serif" }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <input placeholder="Valor (ej. 12)" value={kpi.value} onChange={(e) => updateKpi(kpi._uid, { value: e.target.value })} style={{ ...FIELD, flex: 1, minWidth: 0 }} />
              <input placeholder="Unidad (ej. %, opcional)" value={kpi.unit} onChange={(e) => updateKpi(kpi._uid, { unit: e.target.value })} style={{ ...FIELD, flex: 1, minWidth: 0 }} />
            </div>
          </AccordionRow>
        ))}

        <button type="button" onClick={addKpi} style={ADD_BTN}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
          Agregar KPI a mano
        </button>
      </AccordionSection>

      <AccordionSection title="Noticias" subtitle="Novedades cortas que ves al entrar a tu Oficina.">
        {news.length === 0 && (
          <p style={{ margin: 0, font: "400 12px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
            Sin noticias propias todavía — tocá &quot;Agregar noticia&quot; para sumar la primera.
          </p>
        )}
        {news.map((item) => (
          <AccordionRow key={item._uid} title={item.title || "(sin título)"}
            trailing={
              <button type="button" onClick={() => removeNews(item._uid)} aria-label="Quitar" style={REMOVE_BTN}>
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>close</span>
              </button>
            }
          >
            <input placeholder="Título" value={item.title} onChange={(e) => updateNews(item._uid, { title: e.target.value })} style={{ ...FIELD, color: "#F5F2EB", font: "600 12.5px 'Plus Jakarta Sans',sans-serif" }} />
            <textarea placeholder="Cuerpo (opcional)" value={item.body} onChange={(e) => updateNews(item._uid, { body: e.target.value })} rows={2} style={{ ...FIELD, resize: "vertical" }} />
            <input type="date" value={item.date.slice(0, 10)} onChange={(e) => updateNews(item._uid, { date: e.target.value })} style={FIELD} />
          </AccordionRow>
        ))}
        <button type="button" onClick={addNews} style={ADD_BTN}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
          Agregar noticia
        </button>
      </AccordionSection>

      <AccordionSection title="Calendario" subtitle="Próximas tareas o eventos, en orden de fecha.">
        {events.length === 0 && (
          <p style={{ margin: 0, font: "400 12px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
            Sin eventos propios todavía — tocá &quot;Agregar evento&quot; para sumar el primero.
          </p>
        )}
        {events.map((ev) => (
          <AccordionRow key={ev._uid} title={ev.title || "(sin título)"} subtitle={ev.date ? ev.date.slice(0, 10) : undefined}
            trailing={
              <button type="button" onClick={() => removeEvent(ev._uid)} aria-label="Quitar" style={REMOVE_BTN}>
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>close</span>
              </button>
            }
          >
            <input placeholder="Título" value={ev.title} onChange={(e) => updateEvent(ev._uid, { title: e.target.value })} style={{ ...FIELD, color: "#F5F2EB", font: "600 12.5px 'Plus Jakarta Sans',sans-serif" }} />
            <div style={{ display: "flex", gap: 8 }}>
              <input type="date" value={ev.date.slice(0, 10)} onChange={(e) => updateEvent(ev._uid, { date: e.target.value })} style={{ ...FIELD, flex: 1, minWidth: 0 }} />
              <input type="time" value={ev.time || ""} onChange={(e) => updateEvent(ev._uid, { time: e.target.value })} style={{ ...FIELD, flex: 1, minWidth: 0 }} />
            </div>
          </AccordionRow>
        ))}
        <button type="button" onClick={addEvent} style={ADD_BTN}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
          Agregar evento
        </button>
      </AccordionSection>
    </>
  );
}
