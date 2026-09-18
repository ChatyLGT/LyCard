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
  | { enabled: true; error: false; meetings: FathomMeeting[] };

function previewOf(markdown: string | undefined, maxLen = 180): string | null {
  if (!markdown) return null;
  const plain = markdown
    .replace(/[#*_`>-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!plain) return null;
  return plain.length > maxLen ? plain.slice(0, maxLen).trimEnd() + "…" : plain;
}

// Últimas reuniones reales de la cuenta de Fathom conectada — listar +
// resumen corto + link a Fathom, tal cual pidió Gunnar (nada de
// recordatorios/tareas/Gmail todavía, eso es la fase siguiente).
export async function getFathomBrief(limit = 5): Promise<FathomBrief> {
  const apiKey = process.env.FATHOM_API_KEY;
  if (!apiKey) return { enabled: false };

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const params = new URLSearchParams({
    include_summary: "true",
    created_after: since,
  });

  try {
    const res = await fetch(`${FATHOM_API_BASE_URL}/meetings?${params.toString()}`, {
      headers: { "X-Api-Key": apiKey, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return { enabled: true, error: true };

    const data = (await res.json()) as {
      items?: Array<{
        recording_id: number;
        title: string;
        url: string;
        created_at: string;
        default_summary?: { markdown_formatted?: string };
      }>;
    };

    const meetings: FathomMeeting[] = (data.items ?? []).slice(0, limit).map((m) => ({
      recordingId: m.recording_id,
      title: m.title,
      url: m.url,
      createdAt: m.created_at,
      summaryPreview: previewOf(m.default_summary?.markdown_formatted),
    }));

    return { enabled: true, error: false, meetings };
  } catch {
    return { enabled: true, error: true };
  }
}
