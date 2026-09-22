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
  source?: string; // "voz-real" | "voz-simulado" | "" (manual) — de dónde salió
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

// "Generar con IA (simulado)" en el editor de la Oficina (Fase E2) — NO
// llama a ningún modelo real, mismo alcance que pickPhraseOfTheDay. Parte
// de los ejemplos fijos de arriba y les da un jitter chico al último punto
// de cada trend, para que tocar el botón dos veces no dé exactamente lo
// mismo (se siente "generado", no un fixture estático) sin inventar un
// número negativo o absurdo.
export function generateSimulatedKpis(): RealityCheckKpi[] {
  return DEFAULT_REALITY_CHECK_KPIS.map((kpi) => {
    const jitter = Math.floor(Math.random() * 3) - 1; // -1, 0 o 1
    const trend = kpi.trend.map((n, i) => (i === kpi.trend.length - 1 ? Math.max(0, n + jitter) : n));
    return { ...kpi, value: String(trend[trend.length - 1]), trend };
  });
}

// Glue compartida entre app/admin/actions.ts#updateCardAction y
// app/m/dashboard/actions.ts#updateMemberCardAction (Fase E2) — las dos
// reciben el mismo shape desde OficinaExtrasEditor.tsx (3 campos Json como
// string + un campo de texto plano) y necesitan el mismo saneo antes de
// pisar la DB. JSON.parse puede tirar con un string roto (bug de cliente,
// nunca debería pasar pero no cuesta nada blindarlo) — se ignora en vez de
// tumbar el guardado entero de la tarjeta, mismo criterio que
// updateMemberCardAction ya usa para officeItems.
export function parseOficinaExtrasFormData(formData: FormData): {
  oficinaObjetivo: string;
  realityCheckKpis: RealityCheckKpi[];
  newsItems: NewsItem[];
  calendarEvents: CalendarEvent[];
} {
  const oficinaObjetivo = String(formData.get("oficinaObjetivo") || "");

  function parseJsonField<T>(fieldName: string, parser: (value: unknown) => T[]): T[] {
    const raw = formData.get(fieldName);
    if (typeof raw !== "string") return [];
    try {
      return parser(JSON.parse(raw));
    } catch {
      return [];
    }
  }

  return {
    oficinaObjetivo,
    realityCheckKpis: parseJsonField("realityCheckKpis", parseRealityCheckKpis),
    newsItems: parseJsonField("newsItems", parseNewsItems),
    calendarEvents: parseJsonField("calendarEvents", parseCalendarEvents),
  };
}

export const DEFAULT_MOTIVATIONAL_PHRASES: string[] = [
  "Tu legado no espera a que estés listo — empieza hoy, con lo que tenés.",
  "Cada Oficina Virtual que activás es una vida que no se pierde en el olvido.",
  "El Gemelo Digital no reemplaza tu trabajo — lo multiplica.",
];
