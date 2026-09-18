// Oficina Virtual — resumen ejecutivo (Fase E1, 2026-09-19). Mismo patrón
// que lib/officeSkills.ts / lib/escalas.ts: un campo Json en el modelo, un
// parser que sanitiza, y un fallback fijo cuando el N0 todavía no cargó
// nada, marcado como ejemplo en la UI (nunca se confunde con dato real).

export type RealityCheckKpi = {
  key: string;
  label: string;
  value: string;
  unit: string;
  trend: number[]; // últimos N puntos, para el sparkline — más nuevo al final
};

export type NewsItem = {
  id: string;
  title: string;
  body: string;
  date: string; // ISO
};

export type CalendarEvent = {
  id: string;
  title: string;
  date: string; // ISO
  time?: string;
};

export function parseRealityCheckKpis(value: unknown): RealityCheckKpi[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is Record<string, unknown> => typeof v === "object" && v !== null)
    .map((v) => ({
      key: typeof v.key === "string" ? v.key : "",
      label: typeof v.label === "string" ? v.label : "",
      value: typeof v.value === "string" ? v.value : "",
      unit: typeof v.unit === "string" ? v.unit : "",
      trend: Array.isArray(v.trend) ? v.trend.filter((n): n is number => typeof n === "number") : [],
    }))
    .filter((item) => item.key && item.label);
}

export function parseNewsItems(value: unknown): NewsItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is Record<string, unknown> => typeof v === "object" && v !== null)
    .map((v) => ({
      id: typeof v.id === "string" ? v.id : "",
      title: typeof v.title === "string" ? v.title : "",
      body: typeof v.body === "string" ? v.body : "",
      date: typeof v.date === "string" ? v.date : "",
    }))
    .filter((item) => item.id && item.title);
}

export function parseCalendarEvents(value: unknown): CalendarEvent[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is Record<string, unknown> => typeof v === "object" && v !== null)
    .map((v) => ({
      id: typeof v.id === "string" ? v.id : "",
      title: typeof v.title === "string" ? v.title : "",
      date: typeof v.date === "string" ? v.date : "",
      time: typeof v.time === "string" ? v.time : undefined,
    }))
    .filter((item) => item.id && item.title && item.date);
}

export function parseMotivationalPhrases(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

// Selección determinística por día del año — la misma frase todo el día,
// distinta al día siguiente, sin llamar a ningún modelo en vivo (decisión
// explícita del alcance de este MVP).
export function pickPhraseOfTheDay(phrases: string[], date: Date = new Date()): string | null {
  if (phrases.length === 0) return null;
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / 86_400_000);
  return phrases[dayOfYear % phrases.length];
}

// Ejemplo inventado real para el negocio de Legacy (Gemelos Digitales +
// Oficinas Virtuales 100% operativas) — nunca queda vacío el primer día,
// pero la UI lo marca como ejemplo para editar, no como dato real.
export const DEFAULT_REALITY_CHECK_KPIS: RealityCheckKpi[] = [
  { key: "legacys-activos", label: "Legacys activos", value: "12", unit: "", trend: [6, 7, 8, 9, 10, 11, 12] },
  { key: "oficinas-operativas", label: "Oficinas 100% operativas", value: "8", unit: "", trend: [3, 4, 5, 6, 6, 7, 8] },
  { key: "entrevistas-semana", label: "Entrevistas esta semana", value: "5", unit: "", trend: [2, 3, 1, 4, 3, 5, 5] },
];

export const DEFAULT_NEWS_ITEMS: NewsItem[] = [
  {
    id: "ejemplo-1",
    title: "Ejemplo: nuevo Legacy activado",
    body: "Así se ve una noticia corta acá — editala o borrala desde tu Programa.",
    date: new Date().toISOString(),
  },
];

export const DEFAULT_CALENDAR_EVENTS: CalendarEvent[] = [
  {
    id: "ejemplo-1",
    title: "Ejemplo: Sesión 1 — Origen",
    date: new Date(Date.now() + 3 * 86_400_000).toISOString(),
    time: "10:00",
  },
];

export const DEFAULT_MOTIVATIONAL_PHRASES: string[] = [
  "Tu legado no espera a que estés listo — empieza hoy, con lo que tenés.",
  "Cada Oficina Virtual que activás es una vida que no se pierde en el olvido.",
  "El Gemelo Digital no reemplaza tu trabajo — lo multiplica.",
];
