// Cliente real de la API de AssemblyAI (https://www.assemblyai.com/docs) —
// transcripción + resumen en una sola llamada, elegido para no tener que
// pegar dos proveedores distintos (uno de voz, otro de resumen) para la
// Skill de Notas de Voz. Sin ASSEMBLYAI_API_KEY, se degrada limpio —
// mismo criterio que lib/fathom.ts: nunca rompe, la nota queda en
// "processing" y la UI dice "todavía sin conectar".

const ASSEMBLYAI_BASE_URL = "https://api.assemblyai.com/v2";

export function transcriptionEnabled(): boolean {
  return !!process.env.ASSEMBLYAI_API_KEY;
}

// POST crudo a AssemblyAI — separado de startTranscriptionJob para poder
// reintentar sin summarization si el proveedor rechaza esa combinación.
async function submitTranscriptJob(apiKey: string, audioUrl: string, withSummary: boolean): Promise<Response> {
  const body: Record<string, unknown> = {
    audio_url: audioUrl,
    // Fijo en español, no auto-detección (2026-09-23, bug reportado por
    // Gunnar: transcribía en inglés lo que se grabó en español). LyCard
    // es un producto en español de punta a punta — para audios cortos
    // "language_detection" adivinaba mal más de una vez.
    language_code: "es",
  };
  if (withSummary) {
    body.summarization = true;
    body.summary_model = "informative";
    body.summary_type = "bullets";
  }
  return fetch(`${ASSEMBLYAI_BASE_URL}/transcript`, {
    method: "POST",
    headers: { Authorization: apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Sube el audio (ya guardado por lib/storage.ts, así que esto lo vuelve a
// bajar) directo a AssemblyAI y arranca el job de transcripción+resumen.
// Devuelve el id del job para guardarlo en VoiceNote.providerJobId — el
// resultado se consulta después con pollTranscriptionJob, nunca en la
// misma request (AssemblyAI tarda minutos, no segundos).
export async function startTranscriptionJob(audioUrl: string): Promise<string> {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) throw new Error("ASSEMBLYAI_API_KEY no configurada");

  let res = await submitTranscriptJob(apiKey, audioUrl, true);
  if (!res.ok && res.status === 400) {
    // Si el combo language_code:"es" + summarization no está soportado
    // por AssemblyAI en este momento de su API, no perdamos la
    // transcripción real (que sí siempre está soportada) por culpa del
    // resumen — reintenta sin pedirlo. Se loguea el motivo real, nunca
    // se descarta en silencio (2026-09-23, "dio error en la
    // transcripción" sin poder ver antes por qué).
    const firstErrorBody = await res.text().catch(() => "");
    console.error("AssemblyAI rechazó el job con resumen, reintentando sin resumen:", res.status, firstErrorBody);
    res = await submitTranscriptJob(apiKey, audioUrl, false);
  }
  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    throw new Error(`AssemblyAI ${res.status}: ${errorBody.slice(0, 300)}`);
  }
  const data = (await res.json()) as { id: string };
  return data.id;
}

export type TranscriptionResult =
  | { status: "processing" }
  | { status: "ready"; transcript: string; summary: string }
  | { status: "error"; error: string };

export async function pollTranscriptionJob(jobId: string): Promise<TranscriptionResult> {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) return { status: "error", error: "ASSEMBLYAI_API_KEY no configurada" };

  const res = await fetch(`${ASSEMBLYAI_BASE_URL}/transcript/${jobId}`, {
    headers: { Authorization: apiKey },
    cache: "no-store",
  });
  if (!res.ok) return { status: "error", error: `AssemblyAI ${res.status}` };

  const data = (await res.json()) as {
    status: "queued" | "processing" | "completed" | "error";
    text?: string;
    summary?: string;
    error?: string;
  };

  if (data.status === "completed") {
    return { status: "ready", transcript: data.text ?? "", summary: data.summary ?? "" };
  }
  if (data.status === "error") {
    return { status: "error", error: data.error ?? "Error desconocido de AssemblyAI" };
  }
  return { status: "processing" };
}
