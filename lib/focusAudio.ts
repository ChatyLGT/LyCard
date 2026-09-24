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
    descripcion: "Pulso rápido (rango Beta) + base de house minimal (kick, bajo, hats), 100% generada en vivo — para sostener atención en una tarea, sin distracciones.",
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
    descripcion: "Pulso más lento (rango Theta) + groove lounge suave (acordes cortos, bajo, sin kick) — para divergir, no para concentrarte en un solo punto.",
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
    descripcion: "Pulso suave (rango Alpha) + lounge suave con kick a media velocidad — para bajar revoluciones sin quedarte dormido.",
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
    descripcion: "Pulso muy lento (rango Delta) + ruido marrón grave, sin ritmo — pensado para escuchar mientras te vas quedando dormido.",
    pulseHz: 2.5,
    pulseDepth: 0.2,
    noiseColor: "brown",
    noiseGain: 0.4,
    padHz: [98.0, 123.47], // C2/Eb2 -- muy grave, casi imperceptible
    padGain: 0.08,
  },
};

export const FOCUS_MODE_ORDER: FocusModeKey[] = ["foco", "creativo", "relajacion", "sueno"];

// Base musical por modo (pedido de Gunnar, 2026-09-23: "conectarse a
// algún servicio de música house/electrónica/lounge que acompañe las
// ondas"). No hay forma de licenciar/curar pistas reales desde acá, así
// que se genera también en vivo con Web Audio (mismo criterio que el
// resto de Modo Foco) — un kick + bajo + hats + acordes cortos, en vez
// de un pad estático. El armado real de los osciladores vive en
// components/FocusModeBlock.tsx, igual que el resto del motor.
export type MusicStyle = "house" | "lounge";

export type MusicPattern = {
  key: string; // "house" | "techno" | "minimal" | "lounge" | "downtempo" | "chill" -- id estable, se guarda en el estado del componente
  label: string; // lo que ve Gunnar en el selector ("House", "Techno"...)
  style: MusicStyle;
  bpm: number;
  bassHz: number; // raíz del bajo, una octava abajo de la raíz del pad del modo
  kickSteps: number[]; // steps 0-15 (corcheas de 16, 1 compás de 4/4) donde suena el kick
  hatSteps: number[]; // steps donde suena el hi-hat
  bassSteps: number[]; // steps donde suena el bajo
  stabSteps: number[]; // steps donde suena un acorde corto (usa el padHz del modo)
};

// `bassHz` una octava más arriba que la primera versión (2026-09-23,
// bug real reportado por Gunnar: "no se escucha nada de música, solo la
// onda"). C2/D2/F2 (65-87Hz) es casi inaudible en el parlante chico de
// un celular -- el fundamental cae por debajo de lo que ese parlante
// puede reproducir, sin importar cuánto gain se le ponga. C3/D3/F3
// (130-175Hz) cae dentro del rango real de un parlante de celular, y el
// kick pasa de un sweep 150→42Hz a uno 220→90Hz por el mismo motivo (ver
// scheduleKick en components/FocusModeBlock.tsx). Confirmado por Gunnar
// (2026-09-24): "si funciono".
//
// 2-3 variantes por modo (2026-09-24, pedido de Gunnar: "poder elegir
// el beat en cada onda") -- nunca sueltas: cada variante respeta el
// mismo rango de tempo y la misma lógica funcional del modo (Foco
// siempre tiene kick real porque sostener atención pide un pulso
// insistente; Creativo/Relajación nunca tienen un kick tan duro como
// Foco porque son para bajar revoluciones o divergir, no para
// concentrarte en un punto). `[]` = sin variantes: Sueño se queda sin
// selector, a propósito, mismo motivo que antes (ver docstring vieja
// más abajo en PLAN.md) -- nunca se le agrega ritmo.
export const FOCUS_MUSIC_VARIANTS: Record<FocusModeKey, MusicPattern[]> = {
  foco: [
    {
      key: "house",
      label: "House",
      style: "house",
      bpm: 124,
      bassHz: 130.81, // C3
      kickSteps: [0, 4, 8, 12],
      hatSteps: [2, 6, 10, 14],
      bassSteps: [0, 4, 8, 12],
      stabSteps: [],
    },
    {
      key: "techno",
      label: "Techno",
      style: "house",
      bpm: 128,
      bassHz: 130.81,
      kickSteps: [0, 4, 8, 12],
      hatSteps: [1, 3, 5, 7, 9, 11, 13, 15], // hats en cada corchea -- más mecánico, más insistente
      bassSteps: [0, 4, 8, 12],
      stabSteps: [],
    },
    {
      key: "minimal",
      label: "Minimal",
      style: "house",
      bpm: 122,
      bassHz: 130.81,
      kickSteps: [0, 8], // medio tiempo -- mucho más espacio entre golpes
      hatSteps: [],
      bassSteps: [0, 8],
      stabSteps: [],
    },
  ],
  creativo: [
    {
      key: "lounge",
      label: "Lounge",
      style: "lounge",
      bpm: 92,
      bassHz: 146.83, // D3
      kickSteps: [],
      hatSteps: [4, 12],
      bassSteps: [0, 6, 8, 14],
      stabSteps: [0, 8],
    },
    {
      key: "downtempo",
      label: "Downtempo",
      style: "lounge",
      bpm: 80,
      bassHz: 146.83,
      kickSteps: [0], // un solo golpe suave por compás -- ambiental, no bailable
      hatSteps: [8],
      bassSteps: [0, 8],
      stabSteps: [0, 8],
    },
  ],
  relajacion: [
    {
      key: "lounge",
      label: "Lounge",
      style: "lounge",
      bpm: 100,
      bassHz: 174.61, // F3
      kickSteps: [0, 8],
      hatSteps: [],
      bassSteps: [0, 8],
      stabSteps: [0, 8],
    },
    {
      key: "chill",
      label: "Chill House",
      style: "house",
      bpm: 108,
      bassHz: 174.61,
      kickSteps: [0, 4, 8, 12], // el único four-on-the-floor fuera de Foco -- pero suave (gains bajos ya definidos en el motor)
      hatSteps: [6, 14],
      bassSteps: [0, 4, 8, 12],
      stabSteps: [0, 8],
    },
  ],
  sueno: [],
};

// Duración real de un step (corchea de 16, 1/4 de negra) en segundos,
// para el scheduler de lookahead de Web Audio.
export function stepDurationSeconds(bpm: number): number {
  return 60 / bpm / 4;
}

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
