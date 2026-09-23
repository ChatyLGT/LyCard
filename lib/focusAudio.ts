// Modo Foco (pedido de Gunnar, 2026-09-23) — audio funcional generado en
// vivo con Web Audio API, sin depender de ninguna pista externa (evita
// de raíz el problema de licencias: nada que curar, nada que alojar,
// nada de streaming en producción). Tres capas por modo: un pulso de
// volumen (LFO) a la frecuencia objetivo, ruido de fondo (rosa/marrón) y
// un pad armónico sostenido, mezclables.
//
// Cáscara honesta: la evidencia real detrás de esto es "modulación de
// amplitud constante, sin distracciones, ayuda a sostener la atención"
// — no "sincroniza tus neuronas" ni nada que suene a control mental. El
// copy de cada modo se queda corto a propósito, nunca promete lo que no
// se puede probar.
//
// Este archivo es puro (sin `AudioContext`, sin nada de browser) para
// que sea testeable 100% en Node — el armado del grafo de Web Audio en
// sí vive en components/FocusModeBlock.tsx, verificado con E2E +
// Playwright visual, mismo criterio que ya usamos para MallaGraph.tsx
// (three.js) y el grabador de VoiceNotesBlock.tsx (MediaRecorder).

export type NoiseColor = "pink" | "brown";

export type FocusModeKey = "foco" | "creativo" | "relajacion" | "sueno";

export type FocusModeConfig = {
  key: FocusModeKey;
  label: string;
  descripcion: string;
  pulseHz: number; // frecuencia del LFO que modula el volumen
  pulseDepth: number; // 0-1, cuánto sube/baja el volumen con el pulso
  noiseColor: NoiseColor;
  noiseGain: number; // 0-1, volumen relativo del ruido de fondo
  padHz: number[]; // frecuencias del acorde sostenido (Hz)
  padGain: number; // 0-1, volumen relativo del pad
};

export const FOCUS_MODES: Record<FocusModeKey, FocusModeConfig> = {
  foco: {
    key: "foco",
    label: "Foco profundo",
    descripcion: "Pulso rápido (rango Beta) + ruido marrón de fondo — para sostener atención en una tarea, sin distracciones.",
    pulseHz: 15,
    pulseDepth: 0.35,
    noiseColor: "brown",
    noiseGain: 0.35,
    padHz: [130.81, 155.56, 196.0], // Cm3 -- triada apagada, no distrae
    padGain: 0.12,
  },
  creativo: {
    key: "creativo",
    label: "Creativo",
    descripcion: "Pulso más lento (rango Theta) + ruido rosa — para divergir, no para concentrarte en un solo punto.",
    pulseHz: 6,
    pulseDepth: 0.3,
    noiseColor: "pink",
    noiseGain: 0.3,
    padHz: [146.83, 174.61, 220.0], // Dm3
    padGain: 0.16,
  },
  relajacion: {
    key: "relajacion",
    label: "Relajación",
    descripcion: "Pulso suave (rango Alpha) + ruido rosa — para bajar revoluciones sin quedarte dormido.",
    pulseHz: 10,
    pulseDepth: 0.25,
    noiseColor: "pink",
    noiseGain: 0.28,
    padHz: [174.61, 220.0, 261.63], // F3 mayor abierto
    padGain: 0.14,
  },
  sueno: {
    key: "sueno",
    label: "Sueño",
    descripcion: "Pulso muy lento (rango Delta) + ruido marrón grave — pensado para escuchar mientras te vas quedando dormido.",
    pulseHz: 2.5,
    pulseDepth: 0.2,
    noiseColor: "brown",
    noiseGain: 0.4,
    padHz: [98.0, 123.47], // C2/Eb2 -- muy grave, casi imperceptible
    padGain: 0.08,
  },
};

export const FOCUS_MODE_ORDER: FocusModeKey[] = ["foco", "creativo", "relajacion", "sueno"];

function isFocusModeKey(v: string): v is FocusModeKey {
  return (FOCUS_MODE_ORDER as string[]).includes(v);
}

export function getFocusMode(key: string): FocusModeConfig {
  return isFocusModeKey(key) ? FOCUS_MODES[key] : FOCUS_MODES.foco;
}

export const DURATION_OPTIONS_SECONDS = [600, 1200, 2700] as const;
export type DurationSeconds = (typeof DURATION_OPTIONS_SECONDS)[number];

export function isDurationSeconds(v: number): v is DurationSeconds {
  return (DURATION_OPTIONS_SECONDS as readonly number[]).includes(v);
}

export function formatDurationLabel(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  return `${minutes} min`;
}

// mm:ss para el timer en vivo -- nunca negativo, nunca más de 99:59
export function formatCountdown(secondsLeft: number): string {
  const clamped = Math.max(0, Math.round(secondsLeft));
  const minutes = Math.min(99, Math.floor(clamped / 60));
  const seconds = clamped % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
