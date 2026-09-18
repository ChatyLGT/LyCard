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

// Sube el audio (ya guardado por lib/storage.ts, así que esto lo vuelve a
// bajar) directo a AssemblyAI y arranca el job de transcripción+resumen.
// Devuelve el id del job para guardarlo en VoiceNote.providerJobId — el
// resultado se consulta después con pollTranscriptionJob, nunca en la
// misma request (AssemblyAI tarda minutos, no segundos).
export async function startTranscriptionJob(audioUrl: string): Promise<string> {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) throw new Error("ASSEMBLYAI_API_KEY no configurada");

  const res = await fetch(`${ASSEMBLYAI_BASE_URL}/transcript`, {
    method: "POST",
    headers: { Authorization: apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      audio_url: audioUrl,
      summarization: true,
      summary_model: "informative",
      summary_type: "bullets",
      language_detection: true,
    }),
  });
  if (!res.ok) throw new Error(`AssemblyAI ${res.status}`);
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
