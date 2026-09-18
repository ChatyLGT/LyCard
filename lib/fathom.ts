// Cliente real de la API pública de Fathom (https://api.fathom.ai/external/v1) —
// no un wrapper simulado. Endpoint/headers/shape de respuesta confirmados
// contra el código fuente de un MCP server público de Fathom (lukas-bekr/
// fathom-mcp), no adivinados. Sin FATHOM_API_KEY, se degrada limpio
// (enabled:false) igual que Resend/Google en este mismo repo — nunca
// rompe la Oficina si no está configurado o si Fathom falla.

const FATHOM_API_BASE_URL = "https://api.fathom.ai/external/v1";

export type FathomMeeting = {
  recordingId: number;
  title: string;
  url: string;
  createdAt: string;
  summaryPreview: string | null;
};

export type FathomBrief =
  | { enabled: false }
  | { enabled: true; error: true }
  | { enabled: true; error: false; meetings: FathomMeeting[]; totalCount: number };

function previewOf(markdown: string | undefined, maxLen = 180): string | null {
  if (!markdown) return null;
  const plain = markdown
    .replace(/[#*_`>-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!plain) return null;
  return plain.length > maxLen ? plain.slice(0, maxLen).trimEnd() + "…" : plain;
}

type FathomApiMeeting = {
  recording_id: number;
  title: string;
  url: string;
  created_at: string;
  default_summary?: { markdown_formatted?: string };
};

// Todo el historial de la cuenta conectada (2026-09-19, pedido de
// Gunnar: "bajes toda las reuniones de esa cuenta") — antes solo traía
// los últimos 30 días y cortaba en 5. Ahora pagina con next_cursor hasta
// agotar la cuenta (con un techo de seguridad de páginas, no un límite
// de negocio) y devuelve el conteo real total. El modal solo muestra
// las `displayLimit` más recientes — mostrar cientos de filas en un
// bottom-sheet de celular sería peor UX, no más honesto.
const MAX_PAGES = 20;

async function fetchAllMeetings(apiKey: string): Promise<FathomApiMeeting[]> {
  const all: FathomApiMeeting[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const params = new URLSearchParams({ include_summary: "true" });
    if (cursor) params.set("cursor", cursor);

    const res = await fetch(`${FATHOM_API_BASE_URL}/meetings?${params.toString()}`, {
      headers: { "X-Api-Key": apiKey, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Fathom ${res.status}`);

    const data = (await res.json()) as { items?: FathomApiMeeting[]; next_cursor?: string | null };
    all.push(...(data.items ?? []));

    if (!data.next_cursor) break;
    cursor = data.next_cursor;
  }

  return all;
}

// Últimas reuniones reales de la cuenta de Fathom conectada — listar +
// resumen corto + link a Fathom, tal cual pidió Gunnar (nada de
// recordatorios/tareas/Gmail todavía, eso es la fase siguiente).
export async function getFathomBrief(displayLimit = 25): Promise<FathomBrief> {
  const apiKey = process.env.FATHOM_API_KEY;
  if (!apiKey) return { enabled: false };

  try {
    const items = await fetchAllMeetings(apiKey);

    const meetings: FathomMeeting[] = items.slice(0, displayLimit).map((m) => ({
      recordingId: m.recording_id,
      title: m.title,
      url: m.url,
      createdAt: m.created_at,
      summaryPreview: previewOf(m.default_summary?.markdown_formatted),
    }));

    return { enabled: true, error: false, meetings, totalCount: items.length };
  } catch {
    return { enabled: true, error: true };
  }
}
