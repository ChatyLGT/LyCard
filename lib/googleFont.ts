// Google Fonts CSS2 URLs for the fonts lib/designMd.ts knows how to detect
// (KNOWN_FONTS) — a fixed, hand-picked list so a skin only ever loads a
// stylesheet from a name we chose, never arbitrary text out of a design.md.
const GOOGLE_FONT_PARAM: Record<string, string> = {
  "Playfair Display": "Playfair+Display:wght@400;500;600;700",
  "Plus Jakarta Sans": "Plus+Jakarta+Sans:wght@400;500;600;700;800",
  "Space Grotesk": "Space+Grotesk:wght@400;500;600;700",
  "Cormorant Garamond": "Cormorant+Garamond:wght@400;500;600;700",
  "Libre Baskerville": "Libre+Baskerville:wght@400;700",
  "Work Sans": "Work+Sans:wght@400;500;600;700;800",
  "DM Sans": "DM+Sans:wght@400;500;600;700",
  Montserrat: "Montserrat:wght@400;500;600;700;800",
  Poppins: "Poppins:wght@400;500;600;700;800",
  Manrope: "Manrope:wght@400;500;600;700;800",
  Raleway: "Raleway:wght@400;500;600;700;800",
  Nunito: "Nunito:wght@400;500;600;700;800",
  Outfit: "Outfit:wght@400;500;600;700;800",
  Sora: "Sora:wght@400;500;600;700;800",
  Inter: "Inter:wght@400;500;600;700;800",
  Lato: "Lato:wght@400;700;800",
  Roboto: "Roboto:wght@400;500;700;900",
};

export function googleFontHref(name: string): string | null {
  const param = GOOGLE_FONT_PARAM[name];
  return param ? `https://fonts.googleapis.com/css2?family=${param}&display=swap` : null;
}
