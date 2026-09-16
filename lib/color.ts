// Small hex-color helpers shared between the design.md parser
// (lib/designMd.ts) and the brand-skin CSS variables computed in
// LyCardView.tsx — plain math on real RGB values, nothing simulated.

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function hexToRgbString(hex: string): string {
  return hexToRgb(hex).join(",");
}

export function lightness(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b; // perceptual, 0-255
}

export function saturation(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const l = (max + min) / 2;
  return (max - min) / (1 - Math.abs(2 * l - 1));
}

// amount > 0 lightens toward white, < 0 darkens toward black.
export function shade(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const mix = (c: number) => (amount >= 0 ? c + (255 - c) * amount : c * (1 + amount));
  const clamp = (c: number) => Math.max(0, Math.min(255, Math.round(c)));
  return "#" + [mix(r), mix(g), mix(b)].map((c) => clamp(c).toString(16).padStart(2, "0")).join("");
}
