import { isSkinColors, KNOWN_FONTS, type SkinColors } from "@/lib/designMd";
import { shade } from "@/lib/color";
import type { Program, ProgramSkin } from "@/generated/prisma/client";

// Fase W3 (2026-09-24, pedido de Gunnar): WowStore vive dentro de la
// Oficina Virtual de una Card, así que tiene que respetar el mismo skin
// de marca que ya aplica esa Card -- ni un color ni una fuente propios,
// el MISMO mecanismo real que ya usa components/LyCardView.tsx
// (Program.skins, el activo vía `where: { active: true }`), no uno
// nuevo. Nada acá es simulado: si hay skin activo, sale de verdad de
// ProgramSkin.colors/font; si no, cae al gold/black de siempre.
export type WowStoreSkin = SkinColors & { font: string };

export const DEFAULT_WOWSTORE_SKIN: WowStoreSkin = {
  bg: "#131313",
  surf: "#201f1f",
  surf2: "#181818",
  ink: "#F5F2EB",
  ink2: "#8a8378",
  accent: "#C8A15A",
  accentDark: "#99732B",
  font: "Plus Jakarta Sans",
};

export function resolveWowStoreSkin(program: (Program & { skins: ProgramSkin[] }) | null | undefined): WowStoreSkin {
  const active = program?.skins?.[0];
  if (!active) return DEFAULT_WOWSTORE_SKIN;
  const colors = isSkinColors(active.colors) ? active.colors : null;
  const font = (KNOWN_FONTS as readonly string[]).includes(active.font) ? active.font : DEFAULT_WOWSTORE_SKIN.font;
  return colors ? { ...colors, font } : { ...DEFAULT_WOWSTORE_SKIN, font };
}

// CSS custom properties que cada pantalla de WowStore setea una vez en
// su wrapper raíz -- el resto de los estilos inline referencian
// var(--ws-accent,#C8A15A) etc, nunca el hex fijo, para que cambiar el
// skin del Programa cambie WowStore sin tocar código.
export function wowStoreSkinVars(skin: WowStoreSkin): Record<string, string> {
  return {
    ["--ws-bg"]: skin.bg,
    ["--ws-surf"]: skin.surf,
    ["--ws-surf2"]: skin.surf2,
    ["--ws-ink"]: skin.ink,
    ["--ws-ink2"]: skin.ink2,
    ["--ws-accent"]: skin.accent,
    ["--ws-accent-light"]: shade(skin.accent, 0.35),
    ["--ws-accent-dark"]: skin.accentDark,
    ["--ws-font"]: `"${skin.font}"`,
  };
}
