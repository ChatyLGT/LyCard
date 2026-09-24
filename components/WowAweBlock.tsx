"use client";

import { useRef, useState } from "react";
import { createAweWalkEntryAction, listAweWalkEntriesAction } from "@/app/c/[slug]/oficina/awe-actions";

export type AweWalkEntrySummary = {
  id: string;
  photoStartUrl: string;
  photoMidUrl: string;
  photoEndUrl: string;
  aweIndex: number;
  createdAt: string;
  voiceNote: { status: string; transcript: string | null; summary: string | null } | null;
};

const AUDIO_MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4", "audio/aac"];

function pickAudioMimeType(): string {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return "";
  for (const candidate of AUDIO_MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(candidate)) return candidate;
  }
  return "";
}

const PHOTO_SLOT = { display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 6, flex: 1 };
const PHOTO_BOX = { width: "100%", aspectRatio: "1", borderRadius: 12, background: "#0D0D0D", border: "1px dashed rgba(200,161,90,.4)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", cursor: "pointer" };

// WowAwe (2026-09-24) -- "Caminata de Asombro" real: 3 selfies +
// (opcional) una nota de voz real (mismo pipeline que Notas de Voz).
// El Índice de Asombro es SIMULADO, nunca un análisis real de las
// fotos/audio -- etiquetado como tal en toda la UI, ver
// lib/aweWalk.ts.
export default function WowAweBlock({ cardId, initialEntries }: { cardId: string; initialEntries: AweWalkEntrySummary[] }) {
  const [entries, setEntries] = useState(initialEntries);
  const [photoStart, setPhotoStart] = useState<File | null>(null);
  const [photoMid, setPhotoMid] = useState<File | null>(null);
  const [photoEnd, setPhotoEnd] = useState<File | null>(null);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mimeTypeRef = useRef<string>("");
  const chunksRef = useRef<Blob[]>([]);

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
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const actualType = recorder.mimeType || mimeTypeRef.current || "audio/webm";
        setAudioBlob(new Blob(chunksRef.current, { type: actualType }));
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch {
      setError("No pudimos acceder al micrófono -- revisá los permisos del navegador (la nota es opcional, podés guardar solo las fotos).");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function save() {
    if (!photoStart || !photoMid || !photoEnd) {
      setError("Faltan una o más de las 3 selfies.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("photoStart", photoStart);
      formData.set("photoMid", photoMid);
      formData.set("photoEnd", photoEnd);
      if (audioBlob) formData.set("audio", new File([audioBlob], "awe-walk.webm", { type: audioBlob.type || "audio/webm" }));

      const result = await createAweWalkEntryAction(cardId, formData);
      if (!result.ok) {
        setError("No se pudo guardar tu caminata -- probá de nuevo.");
        return;
      }
      const fresh = await listAweWalkEntriesAction(cardId);
      setEntries(fresh);
      setPhotoStart(null);
      setPhotoMid(null);
      setPhotoEnd(null);
      setAudioBlob(null);
      setSaved(true);
    } catch {
      setError("No se pudo guardar tu caminata -- revisá tu conexión y probá de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ margin: 0, font: "400 11.5px/1.6 'Plus Jakarta Sans',sans-serif", color: "#8a8378" }}>
        Salí a caminar 15 minutos, sin pensar en el negocio. Sacate una selfie al arrancar, otra a mitad de camino y otra al
        volver. Si querés, grabate contando qué viste.
      </p>

      {saved && (
        <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Caminata guardada.</p>
      )}
      {error && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>{error}</p>}

      <div style={{ display: "flex", gap: 8 }}>
        <PhotoPicker label="Inicio" file={photoStart} onChange={setPhotoStart} />
        <PhotoPicker label="Mitad" file={photoMid} onChange={setPhotoMid} />
        <PhotoPicker label="Final" file={photoEnd} onChange={setPhotoEnd} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {!recording ? (
          <button
            type="button"
            onClick={startRecording}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", border: "1px solid rgba(200,161,90,.4)", borderRadius: 10, background: "none", color: "#C8A15A", font: "700 11px 'Plus Jakarta Sans',sans-serif", cursor: "pointer" }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>mic</span>
            {audioBlob ? "Regrabar nota (opcional)" : "Grabar nota (opcional)"}
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", border: "none", borderRadius: 10, background: "#b3413a", color: "#F5F2EB", font: "700 11px 'Plus Jakarta Sans',sans-serif", cursor: "pointer" }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>stop</span>
            Grabando... parar
          </button>
        )}
        {audioBlob && !recording && (
          <span style={{ font: "600 10px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ nota lista</span>
        )}
      </div>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        style={{ padding: 13, border: "none", borderRadius: 10, background: saving ? "#4a3a38" : "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)", color: "#0D0D0D", font: "700 11px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", cursor: saving ? "default" : "pointer" }}
      >
        {saving ? "Guardando..." : "Guardar caminata"}
      </button>

      {entries.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "#9a8f80" }}>
            Tu historial -- Índice de Asombro (simulado, no es una medición clínica real)
          </span>
          {entries.map((entry) => (
            <div key={entry.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "#0D0D0D", borderRadius: 12, padding: 10 }}>
              <div style={{ display: "flex", gap: 3, flex: "none" }}>
                {[entry.photoStartUrl, entry.photoMidUrl, entry.photoEndUrl].map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={url} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: "cover" }} />
                ))}
              </div>
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ font: "400 10px 'Plus Jakarta Sans',sans-serif", color: "#8a8378" }}>
                  {new Date(entry.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}
                </span>
                {entry.voiceNote?.status === "ready" && entry.voiceNote.transcript && (
                  <span style={{ font: "400 10.5px/1.4 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    &quot;{entry.voiceNote.transcript}&quot;
                  </span>
                )}
                {entry.voiceNote?.status === "processing" && (
                  <span style={{ font: "400 10.5px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>Transcribiendo tu nota...</span>
                )}
              </div>
              <span style={{ flex: "none", font: "700 15px 'Playfair Display',serif", color: "#7FB0C4" }}>{entry.aweIndex}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PhotoPicker({ label, file, onChange }: { label: string; file: File | null; onChange: (f: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const url = file ? URL.createObjectURL(file) : null;
  return (
    <div style={PHOTO_SLOT}>
      <button type="button" onClick={() => inputRef.current?.click()} style={PHOTO_BOX}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span className="material-symbols-outlined" style={{ fontSize: 22, color: "#C8A15A" }}>photo_camera</span>
        )}
      </button>
      <span style={{ font: "400 9px 'Plus Jakarta Sans',sans-serif", color: "#8a8378" }}>{label}</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="user"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onChange(f);
        }}
      />
    </div>
  );
}
