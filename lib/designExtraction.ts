// Simulated "AI reads your brand guidelines" step (2026-09-16) — the one
// integration point for a real model (Gemini, per Gunnar) later, once
// there's an account/API key for it. Until then this returns a plausible
// fixed heuristic; only the color palette (computed by the caller from the
// image's real pixels, see BrandDesignUploader.tsx) is genuine.
export type DesignExtraction = { font: string; buttonStyle: string };

const FONT_OPTIONS = [
  "Playfair Display + Plus Jakarta Sans",
  "Inter",
  "Georgia + Helvetica Neue",
  "Poppins",
];

const BUTTON_STYLE_OPTIONS = [
  "Píldora, bordes redondeados, degradé",
  "Cuadrado, bordes rectos, color sólido",
  "Redondeado suave, con sombra marcada",
];

export function simulateDesignExtraction(paletteHex: string[]): DesignExtraction {
  // Deterministic pick from the palette itself, so the same image always
  // "reads" the same way instead of looking random on every upload.
  const seed = paletteHex.join("").split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return {
    font: FONT_OPTIONS[seed % FONT_OPTIONS.length],
    buttonStyle: BUTTON_STYLE_OPTIONS[seed % BUTTON_STYLE_OPTIONS.length],
  };
}
