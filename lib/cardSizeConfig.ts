// Tamaños ajustables de la LyCard (2026-09-23, pedido de Gunnar: "que
// pueda reducir la foto un poco, aumentar el botón de QR") -- por Card,
// no por Programa: cada dueño ajusta la suya. Todo el layout de
// LyCardView.tsx ya usa `clamp(mín, Xdvh, máx)` para cada módulo
// dimensionado -- este archivo no inventa una unidad nueva, solo agrega
// un multiplicador por módulo que se inyecta como variable CSS
// (`--scale-<key>`) y se aplica DENTRO del clamp() ya existente. Sin
// tocar nada, el default es 1 (100%, el tamaño de siempre) en los 4.

export type CardSizeKey = "photo" | "qrBtn" | "cubeMedium" | "socialIcon" | "storyBtn" | "scheduleBtn" | "logo";

export const CARD_SIZE_KEYS: CardSizeKey[] = [
  "photo",
  "qrBtn",
  "cubeMedium",
  "socialIcon",
  "storyBtn",
  "scheduleBtn",
  "logo",
];

export const CARD_SIZE_LABEL: Record<CardSizeKey, string> = {
  photo: "Foto",
  qrBtn: "Botón QR",
  cubeMedium: "Cubos laterales",
  socialIcon: "Íconos sociales",
  // 3 módulos agregados (2026-09-23, pedido de Gunnar: "faltan módulos
  // para cambiar tamaño -- el de mi camino legacy, agendar entrevista,
  // el logo").
  storyBtn: "Mi camino",
  scheduleBtn: "Agendar entrevista",
  logo: "Logo",
};

export const SIZE_MIN = 0.5;
export const SIZE_MAX = 1.5;
const SIZE_DEFAULT = 1;

export type CardSizeConfig = Record<CardSizeKey, number>;

export function defaultCardSizeConfig(): CardSizeConfig {
  return {
    photo: SIZE_DEFAULT,
    qrBtn: SIZE_DEFAULT,
    cubeMedium: SIZE_DEFAULT,
    socialIcon: SIZE_DEFAULT,
    storyBtn: SIZE_DEFAULT,
    scheduleBtn: SIZE_DEFAULT,
    logo: SIZE_DEFAULT,
  };
}

function clampSize(v: number): number {
  if (!Number.isFinite(v)) return SIZE_DEFAULT;
  return Math.min(SIZE_MAX, Math.max(SIZE_MIN, v));
}

// Nunca confía en el JSON de la DB a ciegas -- una key desconocida se
// ignora, un valor fuera de rango o no-numérico cae al default, mismo
// criterio que parseOfficeSkills/parseEscala.
export function parseCardSizeConfig(value: unknown): CardSizeConfig {
  const result = defaultCardSizeConfig();
  if (!value || typeof value !== "object" || Array.isArray(value)) return result;
  const record = value as Record<string, unknown>;
  for (const key of CARD_SIZE_KEYS) {
    const raw = record[key];
    if (typeof raw === "number") result[key] = clampSize(raw);
  }
  return result;
}

// Las variables que LyCardView.tsx inyecta en el wrapper -- formateadas
// a 2 decimales para que un slider de 5% en 5% nunca produzca un CSS
// value ilegible tipo "1.0499999999999998".
export function buildCardSizeCssVars(config: CardSizeConfig): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const key of CARD_SIZE_KEYS) {
    vars[`--scale-${key}`] = clampSize(config[key]).toFixed(2);
  }
  return vars;
}
