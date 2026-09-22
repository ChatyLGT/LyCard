"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createVoiceNoteAction, checkVoiceNoteStatusAction, listVoiceNotesAction } from "@/app/c/[slug]/oficina/voiceNotes-actions";
import MiniCalendar, { sameDay } from "@/components/MiniCalendar";

export type VoiceNoteSummary = {
  id: string;
  status: string;
  audioUrl: string;
  transcript: string | null;
  summary: string | null;
  createdAt: string; // ISO — serializado desde el Server Component
};

const STATUS_COLOR: Record<string, string> = {
  processing: "#E0954B",
  ready: "#6FCF7A",
  error: "#e5928a",
};
const STATUS_LABEL: Record<string, string> = {
  processing: "Procesando",
  ready: "Lista",
  error: "Error",
};

// Elige el mejor formato de audio que el navegador realmente soporte
// grabar. Bug real (2026-09-22, reportado por Gunnar — "sale error" al
// reproducir): el código anterior siempre etiquetaba el Blob como
// "audio/webm" sin importar qué codec usó MediaRecorder de verdad —
// Safari/iOS nunca graba webm, así que el archivo quedaba subido con un
// Content-Type que no correspondía a sus bytes reales, y el navegador no
// podía decodificarlo al reproducir. Ahora se pregunta explícitamente y
// se usa el mismo tipo real en el Blob, el nombre del archivo y el
// Content-Type que sube lib/storage.ts.
const AUDIO_MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4", "audio/aac"];

function pickAudioMimeType(): string {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return "";
  for (const candidate of AUDIO_MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(candidate)) return candidate;
  }
  return "";
}

function extForMimeType(mime: string): string {
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("aac")) return "aac";
  return "webm";
}

// Skill "Notas de Voz" — rediseño 2026-09-23 (pedido de Gunnar: "debería
// ser un botón de grabar notas de voz directo, grande rojo, que se vea,
// y otro botón más discreto de Ver Notas"). Dos vistas: "record" (la de
// entrada, siempre) y "list" (el calendario + lista + popup de detalle
// que ya existía). Grabar con éxito manda directo a "list" en el día de
// hoy, como confirmación de que se guardó.
export default function VoiceNotesBlock({ cardId, initialNotes }: { cardId: string; initialNotes: VoiceNoteSummary[] }) {
  const [notes, setNotes] = useState(initialNotes);
  const [view, setView] = useState<"record" | "list">("record");
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => (initialNotes[0] ? new Date(initialNotes[0].createdAt) : new Date()));
  const [openNoteId, setOpenNoteId] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mimeTypeRef = useRef<string>("");
  const chunksRef = useRef<Blob[]>([]);

  // Bug real (2026-09-23, "cuando sales de la app, la nota de voz se
  // borra"): este componente se DESMONTA por completo cada vez que se
  // cierra el superpoder (OfficeSkillsBlock lo condiciona con
  // `{active && ...}`), así que al reabrirlo React arrancaba de nuevo
  // con el prop `initialNotes` del primer render de la página — nunca
  // vuelto a pedir. Una nota grabada en una apertura anterior quedaba
  // perfectamente guardada en la DB pero invisible en la siguiente. Al
  // montar, siempre se pide la lista real.
  useEffect(() => {
    listVoiceNotesAction(cardId)
      .then((fresh) => setNotes(fresh))
      .catch(() => {
        // sin conexión momentánea — se queda con initialNotes, no rompe nada
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      const mimeType = pickAudioMimeType();
      mimeTypeRef.current = mimeType;
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const actualType = recorder.mimeType || mimeTypeRef.current || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: actualType });
        await upload(blob, actualType);
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

  // Bug real (2026-09-22, "grabé otra nota y desapareció, no se grabó"):
  // esta función no tenía catch — si createVoiceNoteAction tiraba una
  // excepción real (blip de red, el blob storage o la DB fallando), la
  // promesa quedaba rechazada sin que nadie la atajara: el spinner se
  // apagaba solo (por el finally) pero no aparecía ningún error ni se
  // agregaba la nota — quedaba como si nunca hubiese pasado nada.
  async function upload(blob: Blob, mimeType: string) {
    setUploading(true);
    setError(null);
    try {
      const ext = extForMimeType(mimeType);
      const formData = new FormData();
      formData.set("audio", new File([blob], `nota.${ext}`, { type: mimeType || "audio/webm" }));
      const result = await createVoiceNoteAction(cardId, formData);
      if (!result.ok) {
        setError("No se pudo guardar la nota — probá de nuevo.");
        return;
      }
      const created: VoiceNoteSummary = { id: result.id, status: "processing", audioUrl: result.audioUrl, transcript: null, summary: null, createdAt: new Date().toISOString() };
      setNotes((prev) => [created, ...prev]);
      setSelectedDate(new Date(created.createdAt));
      setView("list"); // confirmación visual de que se guardó — la ves aparecer ahí mismo
    } catch {
      setError("No se pudo guardar la nota — revisá tu conexión y probá de nuevo.");
    } finally {
      setUploading(false);
    }
  }

  const dayNotes = notes.filter((n) => sameDay(new Date(n.createdAt), selectedDate));
  const openNote = openNoteId ? notes.find((n) => n.id === openNoteId) ?? null : null;

  if (view === "record") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "18px 0 6px" }}>
        <button
          type="button"
          onClick={recording ? stopRecording : startRecording}
          disabled={uploading}
          aria-label={recording ? "Detener grabación" : "Grabar nota de voz"}
          style={{
            width: 92, height: 92, borderRadius: 999, border: "none",
            background: "linear-gradient(135deg,#ff6b5b,#d92c1f)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: recording ? "0 0 0 9px rgba(217,44,31,.16)" : "0 8px 26px rgba(217,44,31,.4)",
            cursor: uploading ? "default" : "pointer",
            transition: "box-shadow 220ms ease",
            flex: "none",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 38, color: "#fff" }}>
            {recording ? "stop" : "mic"}
          </span>
        </button>
        <span style={{ font: "700 12.5px 'Plus Jakarta Sans',sans-serif", color: recording ? "#e5928a" : "#F5F2EB" }}>
          {uploading ? "Guardando…" : recording ? "Detener grabación" : "Grabar nota de voz"}
        </span>

        {error && <p style={{ margin: 0, font: "400 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a", textAlign: "center" }}>{error}</p>}

        <button
          type="button"
          onClick={() => setView("list")}
          style={{
            marginTop: 8, background: "none", border: "none", padding: 0, cursor: "pointer",
            font: "600 10.5px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".03em", color: "#8a8378",
          }}
        >
          Ver notas guardadas{notes.length > 0 ? ` (${notes.length})` : ""} →
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <button
        type="button"
        onClick={() => setView("record")}
        style={{
          alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", padding: 0, cursor: "pointer",
          font: "700 10.5px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".04em", textTransform: "uppercase", color: "#C8A15A",
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 15 }}>arrow_back</span>
        Grabar
      </button>

      {notes.length === 0 ? (
        <p style={{ margin: 0, font: "400 11px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
          Sin notas grabadas todavía.
        </p>
      ) : (
        <>
          <MiniCalendar
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            dotsForDay={(d) => (notes.some((n) => sameDay(new Date(n.createdAt), d)) ? ["#E5C378"] : [])}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", color: "#756c5e" }}>
              Notas — {selectedDate.toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}
            </span>
            {dayNotes.length === 0 ? (
              <p style={{ margin: 0, font: "400 11.5px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>Sin notas grabadas este día.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {dayNotes.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => setOpenNoteId(n.id)}
                    style={{
                      textAlign: "left", border: "1px solid rgba(200,161,90,.16)", background: "rgba(255,255,255,.02)",
                      borderRadius: 12, padding: "11px 12px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: STATUS_COLOR[n.status] ?? STATUS_COLOR.processing, flex: "none" }} />
                    <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                      <span style={{ font: "700 12px 'Plus Jakarta Sans',sans-serif", color: "#F5F2EB" }}>
                        {new Date(n.createdAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false })}
                      </span>
                      <span style={{ font: "400 10.5px 'Plus Jakarta Sans',sans-serif", color: STATUS_COLOR[n.status] ?? STATUS_COLOR.processing }}>
                        {STATUS_LABEL[n.status] ?? "Procesando"}
                      </span>
                    </span>
                    <span style={{ color: "#5A5A5A", fontSize: 13, flex: "none" }}>›</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {openNote && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 26 }}>
          <div onClick={() => setOpenNoteId(null)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.72)" }} />
          <div
            style={{
              position: "relative", width: "100%", maxWidth: 380, background: "#1c1b1b", border: "1px solid rgba(200,161,90,.35)",
              borderRadius: 18, padding: 20, display: "flex", flexDirection: "column", gap: 13, boxShadow: "0 24px 70px rgba(0,0,0,.65)",
              maxHeight: "80vh", overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                <span style={{ font: "700 8.5px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".14em", textTransform: "uppercase", color: "#E5C378" }}>
                  Nota de voz
                </span>
                <span style={{ font: "600 16px 'Playfair Display',serif", color: "#F5F2EB" }}>
                  {new Date(openNote.createdAt).toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOpenNoteId(null)}
                aria-label="Cerrar"
                style={{ flex: "none", width: 26, height: 26, border: "none", borderRadius: 8, background: "rgba(255,255,255,.06)", color: "#C2BEB5", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <audio controls src={openNote.audioUrl} style={{ width: "100%", height: 34 }} />

            {openNote.status === "ready" && openNote.summary && (
              <p style={{ margin: 0, font: "400 12.5px/1.7 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>{openNote.summary}</p>
            )}
            {openNote.status === "ready" && openNote.transcript && (
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <span style={{ font: "700 9px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "#5A5A5A" }}>
                  Transcripción completa
                </span>
                <p style={{ margin: 0, font: "400 11.5px/1.65 'Plus Jakarta Sans',sans-serif", color: "#8a8378", whiteSpace: "pre-wrap" }}>{openNote.transcript}</p>
              </div>
            )}
            {openNote.status === "processing" && (
              <p style={{ margin: 0, font: "400 11.5px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
                Grabada — esperando transcripción. El audio ya se puede escuchar arriba.
              </p>
            )}
            {openNote.status === "error" && (
              <p style={{ margin: 0, font: "400 11.5px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>
                No se pudo transcribir esta nota — el audio se puede escuchar igual arriba.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
