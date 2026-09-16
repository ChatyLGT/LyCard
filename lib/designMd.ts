// Real (not simulated) best-effort parser for a design.md file — the kind
// exported by tools like Google Stitch after you describe a brand. There's
// no fixed schema for these exports, so this reads the actual text: every
// hex code present, tagged by nearby keywords when it can, falling back to
// a lightness/saturation heuristic when it can't. Nothing here is invented
// — every color in the output either came straight from the file or was
// derived from one that did (lighten/darken), and anything genuinely
// missing falls back to today's fixed gold/dark palette so an empty or
// garbled file never breaks a card's look.

import { lightness, saturation, shade } from "@/lib/color";

export type SkinColors = {
  bg: string;
  surf: string;
  surf2: string;
  ink: string;
  ink2: string;
  accent: string;
  accentDark: string;
};

export type ParsedSkin = {
  colors: SkinColors;
  font: string;
  buttonStyle: string;
};

const FALLBACK: SkinColors = {
  bg: "#0D0D0D",
  surf: "#141414",
  surf2: "#1C1C1C",
  ink: "#F5F2EB",
  ink2: "#C2BEB5",
  accent: "#C8A15A",
  accentDark: "#99732B",
};
const FALLBACK_FONT = "Plus Jakarta Sans";
const FALLBACK_BUTTON_STYLE = "Redondeado, color sólido";

// Fonts we actually know how to load from Google Fonts — matching against
// an unbounded free-text font name would mean either trusting arbitrary
// text as a URL or silently failing, neither of which is honest. Anything
// not in this list keeps the app's default typography instead of guessing.
export const KNOWN_FONTS = [
  "Playfair Display",
  "Plus Jakarta Sans",
  "Space Grotesk",
  "Cormorant Garamond",
  "Libre Baskerville",
  "Work Sans",
  "DM Sans",
  "Montserrat",
  "Poppins",
  "Manrope",
  "Raleway",
  "Nunito",
  "Outfit",
  "Sora",
  "Inter",
  "Lato",
  "Roboto",
] as const;

const HEX_RE = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;

function normalizeHex(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length === 3) {
    return "#" + h.split("").map((c) => c + c).join("").toLowerCase();
  }
  return "#" + h.toLowerCase();
}

// Keyword → color-role map. Scans line by line so a hex is only tagged by
// a keyword that actually appears near it, not anywhere in the whole file.
const ROLE_KEYWORDS: { role: keyof SkinColors; words: string[] }[] = [
  { role: "bg", words: ["background", "bg color", "base color", "canvas"] },
  { role: "surf2", words: ["surface secondary", "elevated", "card background", "container"] },
  { role: "surf", words: ["surface", "card color", "panel"] },
  { role: "ink2", words: ["secondary text", "muted", "subtitle", "text secondary"] },
  { role: "ink", words: ["text color", "foreground", "primary text", "body text"] },
  { role: "accentDark", words: ["accent dark", "gradient end", "shade", "hover"] },
  { role: "accent", words: ["accent", "primary color", "brand color", "highlight", "cta"] },
];

function extractByKeywords(raw: string): Partial<SkinColors> {
  const found: Partial<SkinColors> = {};
  const lines = raw.split("\n");
  for (const line of lines) {
    const hexMatch = line.match(HEX_RE);
    if (!hexMatch) continue;
    const lower = line.toLowerCase();
    for (const { role, words } of ROLE_KEYWORDS) {
      if (found[role]) continue;
      if (words.some((w) => lower.includes(w))) {
        found[role] = normalizeHex(hexMatch[0]);
        break;
      }
    }
  }
  return found;
}

function fillGapsHeuristically(found: Partial<SkinColors>, allHex: string[]): SkinColors {
  const used = new Set(Object.values(found));
  const unused = allHex.filter((h) => !used.has(h));
  const byLightness = [...unused].sort((a, b) => lightness(a) - lightness(b));
  const bySaturation = [...unused].sort((a, b) => saturation(b) - saturation(a));

  const take = (list: string[]) => {
    const hex = list.find((h) => !used.has(h));
    if (hex) used.add(hex);
    return hex;
  };

  const bg = found.bg ?? take(byLightness) ?? FALLBACK.bg;
  const accent = found.accent ?? take(bySaturation) ?? FALLBACK.accent;
  const ink = found.ink ?? take([...byLightness].reverse()) ?? FALLBACK.ink;

  return {
    bg,
    surf: found.surf ?? take(byLightness) ?? shade(bg, 0.06),
    surf2: found.surf2 ?? shade(found.surf ?? bg, 0.12),
    ink,
    ink2: found.ink2 ?? shade(ink, -0.25),
    accent,
    accentDark: found.accentDark ?? shade(accent, -0.35),
  };
}

function detectFont(raw: string): string {
  const lower = raw.toLowerCase();
  for (const font of KNOWN_FONTS) {
    if (lower.includes(font.toLowerCase())) return font;
  }
  return FALLBACK_FONT;
}

function detectButtonStyle(raw: string): string {
  const lower = raw.toLowerCase();
  const shape = /pill|fully rounded|rounded-full|border-radius:\s*(999|9999|50%)/.test(lower)
    ? "Pill, borde redondeado completo"
    : /sharp|square corners|border-radius:\s*0/.test(lower)
    ? "Cuadrado, bordes rectos"
    : /rounded/.test(lower)
    ? "Redondeado"
    : FALLBACK_BUTTON_STYLE.split(",")[0];
  const fill = /outline|outlined|ghost button/.test(lower)
    ? "borde, sin relleno"
    : "color sólido";
  return `${shape}, ${fill}`;
}

export function parseDesignMd(raw: string): ParsedSkin {
  if (!raw || !raw.trim()) {
    return { colors: FALLBACK, font: FALLBACK_FONT, buttonStyle: FALLBACK_BUTTON_STYLE };
  }
  const allHex = Array.from(new Set((raw.match(HEX_RE) ?? []).map(normalizeHex)));
  const tagged = extractByKeywords(raw);
  const colors = fillGapsHeuristically(tagged, allHex);
  return { colors, font: detectFont(raw), buttonStyle: detectButtonStyle(raw) };
}

const SKIN_COLOR_KEYS: (keyof SkinColors)[] = ["bg", "surf", "surf2", "ink", "ink2", "accent", "accentDark"];

// Validates the shape of ProgramSkin.colors coming back out of the DB (a
// plain Json column) before trusting it — a defensive check, not a second
// parse, since a malformed row should never crash a live card render.
export function isSkinColors(value: unknown): value is SkinColors {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return SKIN_COLOR_KEYS.every((k) => typeof v[k] === "string");
}
