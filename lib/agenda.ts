import { listCalendarEvents, listTasks } from "@/lib/googleServices";

// Agenda real (2026-09-22) — antes esta pantalla solo leía
// Card.calendarEvents, un cache local de escritura que Notas de Voz
// llenaba (real o simulado); nunca leía Google Calendar/Tasks de
// verdad. Dos bugs de Gunnar salían de ahí: (1) "me saca un evento que
// no tengo en mi agenda real" — era una entrada simulada local, nunca
// tocó su Google real; (2) "creé eventos en mi agenda real, no los
// muestra" — nunca se leía Calendar en absoluto. Este archivo trae los
// eventos/tareas REALES cuando el dueño está conectado.
export type AgendaEventItem = {
  id: string;
  title: string;
  start: string; // ISO
  source: "google-real" | "simulado";
  link?: string;
};

export type AgendaTaskItem = {
  id: string;
  title: string;
  due: string | null; // ISO
  done: boolean;
};

// Ventana fija (hoy -14 / +45 días) en vez de seguir la navegación de mes
// del calendario — cubre "este mes y el que viene" sin necesitar un
// roundtrip al servidor por cada click de mes. Navegar más lejos en el
// calendario simplemente no muestra puntos ahí todavía; documentado como
// pendiente en PLAN.md, no roto — cáscara honesta, no se inventa nada.
export function defaultAgendaWindow(now: Date = new Date()): { timeMinISO: string; timeMaxISO: string } {
  return {
    timeMinISO: new Date(now.getTime() - 14 * 86_400_000).toISOString(),
    timeMaxISO: new Date(now.getTime() + 45 * 86_400_000).toISOString(),
  };
}

export async function fetchLiveAgenda(
  accessToken: string,
  window: { timeMinISO: string; timeMaxISO: string }
): Promise<{ events: AgendaEventItem[]; tasks: AgendaTaskItem[] }> {
  const [rawEvents, rawTasks] = await Promise.all([listCalendarEvents(accessToken, window), listTasks(accessToken)]);

  const events: AgendaEventItem[] = rawEvents
    .filter((e) => e.start?.dateTime || e.start?.date)
    .map((e) => ({
      id: e.id,
      title: e.summary || "(sin título)",
      start: e.start?.dateTime || `${e.start?.date}T00:00:00`,
      source: "google-real" as const,
      link: e.htmlLink,
    }));

  const tasks: AgendaTaskItem[] = rawTasks
    .filter((t) => t.title)
    .map((t) => ({
      id: t.id,
      title: t.title as string,
      due: t.due ?? null,
      done: t.status === "completed",
    }));

  return { events, tasks };
}
