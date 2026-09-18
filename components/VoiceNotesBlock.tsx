"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createVoiceNoteAction, checkVoiceNoteStatusAction } from "@/app/c/[slug]/oficina/voiceNotes-actions";

export type VoiceNoteSummary = {
  id: string;
  status: string;
  transcript: string | null;
  summary: string | null;
  createdAt: string; // ISO — serializado desde el Server Component
};

const panelStyle: CSSProperties = {
  padding: 14,
  borderRadius: 12,
  background: "rgba(255,255,255,.03)",
  border: "1px solid rgba(200,161,90,.18)",
};

// Skill "Notas de Voz" (Fase Skill #3, urgente — 2026-09-19): grabás con
// el micrófono del navegador (MediaRecorder, sin dependencia nueva), se
// sube y guarda de verdad; la transcripción/resumen dependen de
// ASSEMBLYAI_API_KEY — sin ella la nota queda honestamente en "grabada,
// esperando transcripción" para siempre, nunca inventa un resumen.
export default function VoiceNotesBlock({ cardId, initialNotes }: { cardId: string; initialNotes: VoiceNoteSummary[] }) {
  const [notes, setNotes] = useState(initialNotes);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Polling liviano para cualquier nota que siga "processing" — cada 5s,
  // se corta solo cuando ya no queda ninguna en ese estado.
  useEffect(() => {
    const pending = notes.filter((n) => n.status === "processing");
    if (pending.length === 0) return;
    const timer = setInterval(async () => {
      for (const n of pending) {
        const result = await checkVoiceNoteStatusAction(n.id);
        if (result.status !== "processing") {
          setNotes((prev) =>
            prev.map((p) =>
              p.id === n.id
                ? { ...p, status: result.status, transcript: "transcript" in result ? result.transcript ?? null : null, summary: "summary" in result ? result.summary ?? null : null }
                : p
            )
          );
        }
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [notes]);

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await upload(blob);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch {
      setError("No pudimos acceder al micrófono — revisá los permisos del navegador.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function upload(blob: Blob) {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("audio", new File([blob], "nota.webm", { type: "audio/webm" }));
      const result = await createVoiceNoteAction(cardId, formData);
      if (!result.ok) {
        setError("No se pudo guardar la nota — probá de nuevo.");
      } else {
        setNotes((prev) => [{ id: result.id, status: "processing", transcript: null, summary: null, createdAt: new Date().toISOString() }, ...prev]);
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <button
        type="button"
        onClick={recording ? stopRecording : startRecording}
        disabled={uploading}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          padding: "12px 0", borderRadius: 12, border: "1px solid rgba(200,161,90,.35)",
          background: recording ? "rgba(224,60,60,.15)" : "rgba(200,161,90,.1)",
          color: recording ? "#e5928a" : "#E5C378", cursor: uploading ? "default" : "pointer",
          font: "700 12px 'Plus Jakarta Sans',sans-serif",
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{recording ? "stop_circle" : "mic"}</span>
        {uploading ? "Guardando…" : recording ? "Detener grabación" : "Grabar una nota"}
      </button>

      {error && (
        <p style={{ margin: 0, font: "400 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>{error}</p>
      )}

      {notes.length === 0 ? (
        <p style={{ margin: 0, font: "400 11px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
          Sin notas grabadas todavía.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {notes.map((n) => (
            <div key={n.id} style={panelStyle}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                <span style={{ font: "700 11px 'Plus Jakarta Sans',sans-serif" }}>
                  {new Date(n.createdAt).toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
                <StatusPill status={n.status} />
              </div>
              {n.status === "ready" && n.summary && (
                <p style={{ margin: "8px 0 0", font: "400 11px/1.5 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>{n.summary}</p>
              )}
              {n.status === "processing" && (
                <p style={{ margin: "8px 0 0", font: "400 11px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
                  Grabada — esperando transcripción.
                </p>
              )}
              {n.status === "error" && (
                <p style={{ margin: "8px 0 0", font: "400 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>
                  No se pudo transcribir esta nota.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    processing: { label: "Procesando", color: "#E0954B" },
    ready: { label: "Lista", color: "#6FCF7A" },
    error: { label: "Error", color: "#e5928a" },
  };
  const s = map[status] ?? map.processing;
  return (
    <span style={{ font: "700 8.5px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".06em", textTransform: "uppercase", color: s.color }}>
      {s.label}
    </span>
  );
}
