"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  FOCUS_MODES,
  FOCUS_MODE_ORDER,
  FOCUS_MUSIC_VARIANTS,
  DURATION_OPTIONS_SECONDS,
  formatDurationLabel,
  formatCountdown,
  stepDurationSeconds,
  type FocusModeKey,
  type NoiseColor,
  type MusicPattern,
} from "@/lib/focusAudio";
import { createVoiceNoteAction } from "@/app/c/[slug]/oficina/voiceNotes-actions";

const LABEL: CSSProperties = { font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", color: "#756c5e" };
const MUTED: CSSProperties = { margin: 0, font: "400 11.5px/1.6 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" };

// Genera ruido rosa/marrón en el propio navegador -- es un algoritmo
// (dominio público, el mismo que usa cualquier sintetizador de ruido),
// no un archivo de audio, así que no hay licencia que curar ni pista
// que alojar. 4 segundos en loop alcanza: es ruido, no tiene melodía que
// se note repitiendo.
function buildNoiseBuffer(ctx: AudioContext, color: NoiseColor): AudioBuffer {
  const length = ctx.sampleRate * 4;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  if (color === "brown") {
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
  } else {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  }
  return buffer;
}

type Engine = {
  ctx: AudioContext;
  nodes: AudioScheduledSourceNode[];
  schedulerId?: ReturnType<typeof setInterval>;
  // Dos buses independientes (2026-09-23, pedido de Gunnar: "no se
  // escucha la música, solo la onda -- ¿no podríamos subir/bajar el
  // volumen de las dos cosas por separado?"): `waveBus` es el pulso +
  // ruido + pad de siempre, `musicBus` es el kick/bajo/hats/acordes.
  // Ambos cuelgan del mismo `master` (así que la modulación del pulso
  // sigue afectando a los dos), pero cada uno tiene su propio gain
  // ajustable en vivo -- ver setWaveVolume/setMusicVolume más abajo.
  waveBus: GainNode;
  musicBus: GainNode;
};

// Base musical en vivo (lib/focusAudio.ts#FOCUS_MUSIC_VARIANTS) -- ni MP3 ni
// streaming, un step-sequencer real con lookahead (patrón estándar de
// Web Audio: programar cada golpe con su propio AudioContext.currentTime
// en vez de setTimeout, así no se desincroniza aunque el hilo principal
// se trabe un instante). Cada golpe es un nodo one-shot que se limpia
// solo (start+stop programado) -- no hace falta trackearlo para pararlo
// a mano, alcanza con cortar el scheduler.
const SCHEDULER_TICK_MS = 25;
const SCHEDULE_AHEAD_SEC = 0.15;
const PATTERN_STEPS = 16;

function buildHatBuffer(ctx: AudioContext): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * 0.06);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

// Frecuencias del kick/bajo subidas una octava respecto a la primera
// versión (2026-09-23, bug real: "no se escucha nada de música, solo la
// onda" -- un parlante de celular apenas reproduce nada por debajo de
// ~100Hz, así que un sweep 150→42Hz quedaba prácticamente en silencio
// sin importar el gain).
function scheduleKick(ctx: AudioContext, dest: AudioNode, time: number) {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(220, time);
  osc.frequency.exponentialRampToValueAtTime(90, time + 0.11);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.95, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(time);
  osc.stop(time + 0.16);
}

function scheduleHat(ctx: AudioContext, dest: AudioNode, hatBuffer: AudioBuffer, time: number) {
  const src = ctx.createBufferSource();
  src.buffer = hatBuffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 7000;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.24, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  src.start(time);
  src.stop(time + 0.07);
}

function scheduleBass(ctx: AudioContext, dest: AudioNode, freq: number, time: number, dur: number) {
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.value = freq;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 650;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(0.5, time + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  osc.start(time);
  osc.stop(time + dur + 0.02);
}

function scheduleStab(ctx: AudioContext, dest: AudioNode, freqs: number[], time: number, dur: number) {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(0.24, time + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
  gain.connect(dest);
  for (const freq of freqs) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    osc.connect(gain);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }
}

// Arranca el step-sequencer para la variante elegida (sueño no ofrece
// ninguna -- ver FOCUS_MUSIC_VARIANTS). `dest` es el bus de música: la
// música queda mezclada bajo la misma modulación del pulso que el resto
// del motor, pero con su propio volumen independiente (musicBus).
function startMusicScheduler(
  ctx: AudioContext,
  dest: AudioNode,
  pattern: MusicPattern,
  stabChord: number[]
): ReturnType<typeof setInterval> {
  const hatBuffer = buildHatBuffer(ctx);
  const stepDur = stepDurationSeconds(pattern.bpm);
  let nextStepTime = ctx.currentTime + 0.05;
  let stepIndex = 0;

  return setInterval(() => {
    while (nextStepTime < ctx.currentTime + SCHEDULE_AHEAD_SEC) {
      const step = stepIndex % PATTERN_STEPS;
      if (pattern.kickSteps.includes(step)) scheduleKick(ctx, dest, nextStepTime);
      if (pattern.hatSteps.includes(step)) scheduleHat(ctx, dest, hatBuffer, nextStepTime);
      if (pattern.bassSteps.includes(step)) scheduleBass(ctx, dest, pattern.bassHz, nextStepTime, stepDur * 3.5);
      if (pattern.stabSteps.includes(step)) scheduleStab(ctx, dest, stabChord, nextStepTime, stepDur * 6);
      nextStepTime += stepDur;
      stepIndex++;
    }
  }, SCHEDULER_TICK_MS);
}

// Arma el grafo completo: pulso (LFO modulando el gain principal) +
// ruido de fondo + un pad armónico sostenido + (salvo en sueño) una
// base house/lounge real via startMusicScheduler, todo mezclado en un
// solo GainNode maestro -- así la música respira con el mismo pulso.
// Cáscara honesta: esto es modulación de amplitud real, no "sincroniza
// tus neuronas" -- ver lib/focusAudio.ts.
function startEngine(mode: (typeof FOCUS_MODES)[FocusModeKey], musicPattern: MusicPattern | null): Engine {
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();
  // Bug real (Gunnar, 2026-09-23: "no escucho nada"): varios navegadores
  // mobile (Safari/iOS en particular) crean el AudioContext en estado
  // "suspended" aunque el gesto del click ya haya ocurrido -- sin este
  // resume() explícito, todo el grafo de abajo se arma y arranca sin
  // tirar ningún error, pero no suena nada. No hace falta esperar la
  // promesa: los nodos se conectan igual, resume() solo destraba la
  // salida real.
  ctx.resume().catch(() => {});
  const nodes: AudioScheduledSourceNode[] = [];

  const master = ctx.createGain();
  const baseGain = 0.55;
  master.gain.value = baseGain;
  master.connect(ctx.destination);

  const lfo = ctx.createOscillator();
  lfo.frequency.value = mode.pulseHz;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = baseGain * mode.pulseDepth;
  lfo.connect(lfoDepth);
  lfoDepth.connect(master.gain);
  lfo.start();
  nodes.push(lfo);

  // Dos buses independientes, ambos cuelgan de `master` (así el pulso
  // sigue modulando todo por igual) -- waveBus/musicBus.gain quedan
  // como AudioParam ajustables en vivo desde el componente, sin
  // reconstruir el motor (ver setWaveVolume/setMusicVolume).
  const waveBus = ctx.createGain();
  waveBus.gain.value = 1;
  waveBus.connect(master);

  const musicBus = ctx.createGain();
  musicBus.gain.value = 1;
  musicBus.connect(master);

  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = buildNoiseBuffer(ctx, mode.noiseColor);
  noiseSource.loop = true;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = mode.noiseGain;
  noiseSource.connect(noiseGain);
  noiseGain.connect(waveBus);
  noiseSource.start();
  nodes.push(noiseSource);

  const padGainNode = ctx.createGain();
  padGainNode.gain.value = 0;
  padGainNode.gain.linearRampToValueAtTime(mode.padGain, ctx.currentTime + 2.5);
  padGainNode.connect(waveBus);
  for (const freq of mode.padHz) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    osc.connect(padGainNode);
    osc.start();
    nodes.push(osc);
  }

  const schedulerId = musicPattern ? startMusicScheduler(ctx, musicBus, musicPattern, mode.padHz) : undefined;

  return { ctx, nodes, schedulerId, waveBus, musicBus };
}

function stopEngine(engine: Engine) {
  if (engine.schedulerId !== undefined) clearInterval(engine.schedulerId);
  for (const node of engine.nodes) {
    try {
      node.stop();
    } catch {
      // ya parado -- no pasa nada
    }
  }
  engine.ctx.close().catch(() => {});
}

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

type Step = "setup" | "running" | "reflect" | "saved";

// Modo Foco (pedido de Gunnar, 2026-09-23) -- "algo similar a Brain.fm"
// pero honesto y sin costo de licencias: 100% audio sintetizado en el
// navegador (Web Audio API), nada de pistas externas. Al terminar la
// sesión, en vez de saltar a otro Superpoder (frágil si ese Programa no
// tiene Notas de Voz habilitado), graba la reflexión con el mismo
// pipeline real de Notas de Voz, directo acá adentro.
export default function FocusModeBlock({ cardId }: { cardId: string }) {
  const [step, setStep] = useState<Step>("setup");
  const [modeKey, setModeKey] = useState<FocusModeKey>("foco");
  // Variante de estilo dentro del modo (2026-09-24, pedido de Gunnar:
  // "poder elegir el beat en cada onda") -- arranca en la primera
  // variante del modo default ("house", primera de Foco). Sueño no
  // tiene ninguna (FOCUS_MUSIC_VARIANTS.sueno = []), así que se queda
  // en "" y el setup no le muestra selector.
  const [variantKey, setVariantKey] = useState<string>(FOCUS_MUSIC_VARIANTS.foco[0].key);
  const [activePattern, setActivePattern] = useState<MusicPattern | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number>(1200);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [paused, setPaused] = useState(false);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Mezclador independiente Onda/Música (2026-09-23, pedido de Gunnar:
  // "no se escucha la música, solo la onda -- ¿no podríamos subir/bajar
  // el volumen de las dos cosas por separado?"). 0-2 = 0%-200%, ajusta
  // el AudioParam en vivo sin reconstruir el motor.
  const [waveVolume, setWaveVolume] = useState(1);
  const [musicVolume, setMusicVolume] = useState(1);

  const engineRef = useRef<Engine | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mimeTypeRef = useRef<string>("");
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (step !== "running" || paused) return;
    if (secondsLeft <= 0) {
      endSession();
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [step, paused, secondsLeft]);

  // Si se cierra el sheet en pleno vuelo (OfficeSkillsBlock desmonta
  // este componente al cerrar), el audio no debe seguir sonando en loop
  // para siempre en segundo plano.
  useEffect(() => {
    return () => {
      if (engineRef.current) stopEngine(engineRef.current);
    };
  }, []);

  function beginSession() {
    setError(null);
    const variants = FOCUS_MUSIC_VARIANTS[modeKey];
    const pattern = variants.find((v) => v.key === variantKey) ?? variants[0] ?? null;
    try {
      engineRef.current = startEngine(FOCUS_MODES[modeKey], pattern);
      engineRef.current.waveBus.gain.value = waveVolume;
      engineRef.current.musicBus.gain.value = musicVolume;
    } catch {
      setError("Este navegador no puede reproducir audio funcional ahora mismo.");
      return;
    }
    setActivePattern(pattern);
    setSecondsLeft(durationSeconds);
    setPaused(false);
    setStep("running");
  }

  function togglePause() {
    setPaused((p) => !p);
  }

  // Al cambiar de modo, la variante seleccionada tiene que resetearse a
  // la primera del modo nuevo -- una key de otro modo (ej. "downtempo",
  // que no existe en Foco) quedaría huérfana.
  function selectMode(key: FocusModeKey) {
    setModeKey(key);
    setVariantKey(FOCUS_MUSIC_VARIANTS[key][0]?.key ?? "");
  }

  function updateWaveVolume(v: number) {
    setWaveVolume(v);
    if (engineRef.current) engineRef.current.waveBus.gain.value = v;
  }

  function updateMusicVolume(v: number) {
    setMusicVolume(v);
    if (engineRef.current) engineRef.current.musicBus.gain.value = v;
  }

  function endSession() {
    if (engineRef.current) {
      stopEngine(engineRef.current);
      engineRef.current = null;
    }
    setStep("reflect");
  }

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

  async function upload(blob: Blob, mimeType: string) {
    setUploading(true);
    setError(null);
    try {
      const ext = extForMimeType(mimeType);
      const formData = new FormData();
      formData.set("audio", new File([blob], `modo-foco.${ext}`, { type: mimeType || "audio/webm" }));
      const result = await createVoiceNoteAction(cardId, formData);
      if (!result.ok) {
        setError("No se pudo guardar tu nota — probá de nuevo.");
        return;
      }
      setStep("saved");
    } catch {
      setError("No se pudo guardar tu nota — revisá tu conexión y probá de nuevo.");
    } finally {
      setUploading(false);
    }
  }

  function resetToSetup() {
    setStep("setup");
    setError(null);
  }

  if (step === "setup") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <p style={MUTED}>
          Audio generado en vivo en tu navegador — pulso de volumen, ruido de fondo y, en Foco/Creativo/Relajación, una base house/lounge real (kick, bajo, hats). Sueño se queda sin ritmo a propósito.
          Sin pistas externas, sin promesas de neurociencia que no podamos probar.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={LABEL}>Modo</span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {FOCUS_MODE_ORDER.map((key) => {
              const mode = FOCUS_MODES[key];
              const selected = key === modeKey;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => selectMode(key)}
                  style={{
                    textAlign: "left",
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: `1px solid ${selected ? "rgba(200,161,90,.6)" : "rgba(255,255,255,.08)"}`,
                    background: selected ? "rgba(200,161,90,.12)" : "rgba(255,255,255,.03)",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                  }}
                >
                  <span style={{ font: "700 12px 'Plus Jakarta Sans',sans-serif", color: selected ? "#E5C378" : "#F5F2EB" }}>{mode.label}</span>
                  <span style={{ font: "400 10px/1.4 'Plus Jakarta Sans',sans-serif", color: "#8a8378" }}>{mode.descripcion}</span>
                </button>
              );
            })}
          </div>
        </div>

        {FOCUS_MUSIC_VARIANTS[modeKey].length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={LABEL}>Estilo de música</span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {FOCUS_MUSIC_VARIANTS[modeKey].map((variant) => {
                const selected = variant.key === variantKey;
                return (
                  <button
                    key={variant.key}
                    type="button"
                    onClick={() => setVariantKey(variant.key)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 10,
                      border: `1px solid ${selected ? "rgba(200,161,90,.6)" : "rgba(255,255,255,.08)"}`,
                      background: selected ? "rgba(200,161,90,.12)" : "rgba(255,255,255,.03)",
                      color: selected ? "#E5C378" : "#C2BEB5",
                      font: "700 11px 'Plus Jakarta Sans',sans-serif",
                      cursor: "pointer",
                    }}
                  >
                    {variant.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={LABEL}>Duración</span>
          <div style={{ display: "flex", gap: 8 }}>
            {DURATION_OPTIONS_SECONDS.map((secs) => (
              <button
                key={secs}
                type="button"
                onClick={() => setDurationSeconds(secs)}
                style={{
                  flex: 1,
                  padding: "9px 0",
                  borderRadius: 10,
                  border: `1px solid ${secs === durationSeconds ? "rgba(200,161,90,.6)" : "rgba(255,255,255,.08)"}`,
                  background: secs === durationSeconds ? "rgba(200,161,90,.12)" : "rgba(255,255,255,.03)",
                  color: secs === durationSeconds ? "#E5C378" : "#C2BEB5",
                  font: "700 11.5px 'Plus Jakarta Sans',sans-serif",
                  cursor: "pointer",
                }}
              >
                {formatDurationLabel(secs)}
              </button>
            ))}
          </div>
        </div>

        {error && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>{error}</p>}

        <button
          type="button"
          onClick={beginSession}
          style={{
            padding: "12px 0",
            borderRadius: 12,
            border: "none",
            background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)",
            color: "#0D0D0D",
            font: "700 12px 'Plus Jakarta Sans',sans-serif",
            letterSpacing: ".06em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Empezar sesión
        </button>
      </div>
    );
  }

  if (step === "running") {
    const mode = FOCUS_MODES[modeKey];
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, padding: "10px 0" }}>
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: 999,
            border: "1px solid rgba(200,161,90,.4)",
            background: "radial-gradient(circle,rgba(200,161,90,.18),transparent 70%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: paused ? "none" : `focusPulse ${Math.max(0.6, 1 / (mode.pulseHz / 8))}s ease-in-out infinite`,
          }}
        >
          <span style={{ font: "700 22px 'Playfair Display',serif", color: "#F5F2EB" }}>{formatCountdown(secondsLeft)}</span>
        </div>
        <style>{`@keyframes focusPulse { 0%,100% { opacity: .75; transform: scale(1); } 50% { opacity: 1; transform: scale(1.04); } }`}</style>
        <span style={{ font: "700 12px 'Plus Jakarta Sans',sans-serif", color: "#E5C378" }}>{mode.label}</span>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ display: "flex", justifyContent: "space-between", font: "600 9.5px 'Plus Jakarta Sans',sans-serif", color: "#8a8378" }}>
              <span>Onda (pulso + ruido)</span>
              <span style={{ color: "#C2BEB5" }}>{Math.round(waveVolume * 100)}%</span>
            </span>
            <input
              type="range"
              min={0}
              max={2}
              step={0.05}
              value={waveVolume}
              onChange={(e) => updateWaveVolume(Number(e.target.value))}
              style={{ width: "100%", accentColor: "#C8A15A" }}
            />
          </label>
          {activePattern && (
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ display: "flex", justifyContent: "space-between", font: "600 9.5px 'Plus Jakarta Sans',sans-serif", color: "#8a8378" }}>
                <span>Música ({activePattern.label})</span>
                <span style={{ color: "#C2BEB5" }}>{Math.round(musicVolume * 100)}%</span>
              </span>
              <input
                type="range"
                min={0}
                max={2}
                step={0.05}
                value={musicVolume}
                onChange={(e) => updateMusicVolume(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#C8A15A" }}
              />
            </label>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, width: "100%" }}>
          <button
            type="button"
            onClick={togglePause}
            style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.04)", color: "#C2BEB5", font: "700 11px 'Plus Jakarta Sans',sans-serif", cursor: "pointer" }}
          >
            {paused ? "Reanudar" : "Pausar"}
          </button>
          <button
            type="button"
            onClick={endSession}
            style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid rgba(229,146,138,.4)", background: "rgba(229,146,138,.1)", color: "#e5928a", font: "700 11px 'Plus Jakarta Sans',sans-serif", cursor: "pointer" }}
          >
            Terminar
          </button>
        </div>
      </div>
    );
  }

  if (step === "reflect") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "10px 0" }}>
        <p style={{ margin: 0, font: "700 13px 'Playfair Display',serif", color: "#F5F2EB", textAlign: "center" }}>¿Qué sacaste de esta sesión?</p>
        <p style={MUTED}>Grabá una nota corta — queda guardada como una Nota de Voz de esta tarjeta, con su transcripción.</p>
        <button
          type="button"
          onClick={recording ? stopRecording : startRecording}
          disabled={uploading}
          aria-label={recording ? "Detener grabación" : "Grabar reflexión"}
          style={{
            width: 72,
            height: 72,
            borderRadius: 999,
            border: "none",
            background: "linear-gradient(135deg,#ff6b5b,#d92c1f)",
            boxShadow: recording ? "0 0 0 8px rgba(217,44,31,.16)" : "0 8px 24px rgba(217,44,31,.4)",
            cursor: "pointer",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 26, color: "#fff" }}>{recording ? "stop" : "mic"}</span>
        </button>
        {uploading && <span style={{ font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8a8378" }}>Guardando…</span>}
        {error && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>{error}</p>}
        <button type="button" onClick={resetToSetup} style={{ background: "none", border: "none", color: "#8a8378", font: "600 10.5px 'Plus Jakarta Sans',sans-serif", cursor: "pointer" }}>
          Saltar y volver a elegir modo
        </button>
      </div>
    );
  }

  // step === "saved"
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "16px 0" }}>
      <span className="material-symbols-outlined" style={{ fontSize: 36, color: "#7BC98E" }}>check_circle</span>
      <p style={{ margin: 0, font: "700 13px 'Plus Jakarta Sans',sans-serif", color: "#F5F2EB" }}>Nota guardada.</p>
      <button
        type="button"
        onClick={resetToSetup}
        style={{ padding: "9px 16px", borderRadius: 10, border: "1px solid rgba(200,161,90,.3)", background: "none", color: "#C2BEB5", font: "700 11px 'Plus Jakarta Sans',sans-serif", cursor: "pointer" }}
      >
        Nueva sesión
      </button>
    </div>
  );
}
