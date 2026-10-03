"use client";

import { useState, useRef, useEffect, useTransition, type CSSProperties, type ReactElement } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Card, OriginMemento, Program, ProgramSkin, Puesto } from "@/generated/prisma/client";
import { t, type Lang } from "@/lib/i18n";
import { rankById, medalById } from "@/lib/data";
import { parseEscala } from "@/lib/escalas";
import { registerInterviewAction, sendContactMessageAction, sendQrByWhatsappAction } from "@/app/c/actions";
import { startLegacyFunnelAction } from "@/app/c/legacy-funnel-actions";
import { PROGRAM_DURATIONS } from "@/lib/legacyProgramDurations";
import {
  listRecipientsAction,
  createRecipientQuickAction,
  deleteRecipientAction2,
  addRecipientLinkSourceAction,
  addRecipientTextSourceAction,
  addRecipientFileSourceAction,
  deleteRecipientSourceAction,
  updateRecipientMetaAction,
  type RecipientWithSources,
} from "@/app/c/recipient-actions";
import { APP_VERSION, CHANGELOG } from "@/lib/version";
import { isSkinColors, KNOWN_FONTS } from "@/lib/designMd";
import { googleFontHref } from "@/lib/googleFont";
import { hexToRgbString, lightness, shade } from "@/lib/color";
import { parseCardSizeConfig, buildCardSizeCssVars, type CardSizeConfig } from "@/lib/cardSizeConfig";
import CardSizePanel from "@/components/CardSizePanel";

type ModalKey =
  | "od"
  | "ancient"
  | "medal"
  | "story"
  | "info"
  | "invite"
  | "legado"
  | "contactMessage"
  | "cardInfo"
  | "versionInfo"
  | "contacts"
  | null;

const THEME_VARS: Record<"dark" | "light", CSSProperties> = {
  dark: {
    ["--card" as string]: "transparent",
    ["--ink" as string]: "#F5F2EB",
    ["--ink2" as string]: "#C2BEB5",
    ["--surf" as string]: "#141414",
    ["--surf2" as string]: "#1C1C1C",
    ["--line" as string]: "rgba(200,161,90,.22)",
    ["--line2" as string]: "rgba(200,161,90,.5)",
    ["--pill" as string]: "rgba(20,20,20,.95)",
    ["--goldtxt" as string]: "#E5C378",
    ["--photofade" as string]: "#0D0D0D",
    ["--photofade2" as string]: "rgba(13,13,13,.52)",
    ["--photofade3" as string]: "rgba(13,13,13,.25)",
    ["--nameshadow" as string]: "0 1px 2px rgba(0,0,0,.35)",
    ["--qrbg" as string]: "rgba(20,20,20,.95)",
  },
  light: {
    ["--card" as string]: "#FAF6F0",
    ["--ink" as string]: "#161412",
    ["--ink2" as string]: "#5a5449",
    ["--surf" as string]: "#FFFFFF",
    ["--surf2" as string]: "#F4EFE6",
    ["--line" as string]: "rgba(184,141,62,.45)",
    ["--line2" as string]: "rgba(184,141,62,.65)",
    ["--pill" as string]: "rgba(255,255,255,.9)",
    ["--goldtxt" as string]: "#7A5908",
    ["--photofade" as string]: "#FAF6F0",
    ["--photofade2" as string]: "rgba(250,246,240,.94)",
    ["--photofade3" as string]: "rgba(250,246,240,.6)",
    ["--nameshadow" as string]: "0 1px 1px rgba(255,255,255,.7)",
    ["--qrbg" as string]: "#FFFFFF",
  },
};

const ICON_BTN: CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 999,
  background: "rgba(20,20,20,.72)",
  border: "1px solid rgba(var(--accentRgb,200,161,90),.5)",
  backdropFilter: "blur(8px)",
  color: "var(--accentLight,#E5C378)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

// The two tier chips flanking the name (2026-09-16) — a gem-gradient dot
// with an icon on top instead of a plain color dot, so the tier is
// legible even without the text label it used to carry. `bg` is a
// MEDALS-shaped gradient string, always light enough for a dark glyph.
const TIER_DOT = (bg: string): CSSProperties => ({
  width: 30,
  height: 30,
  borderRadius: 999,
  flex: "none",
  background: bg || "var(--accentMid,#C8A15A)",
  border: "1px solid rgba(255,255,255,.25)",
  boxShadow: "inset 0 -2px 4px rgba(0,0,0,.35), 0 2px 6px rgba(0,0,0,.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
});

// The two stacked "islands" (card name + version, 2026-09-16) at the top
// of the photo — same pill chrome as ICON_BTN, but clickable text pills
// instead of icon circles, opening the bottom-sheet modal on tap (same
// modalIn spring + backdrop blur every other modal already uses).
const ISLAND_BADGE: CSSProperties = {
  padding: "4px 10px",
  borderRadius: 999,
  background: "rgba(20,20,20,.72)",
  border: "1px solid rgba(var(--accentRgb,200,161,90),.5)",
  backdropFilter: "blur(8px)",
  color: "var(--accentLight,#E5C378)",
  font: "700 9px var(--brandFont,'Plus Jakarta Sans'),sans-serif",
  letterSpacing: ".08em",
  whiteSpace: "nowrap",
  cursor: "pointer",
  transition: "transform .15s ease, opacity .15s ease",
};

const BADGE_BTN: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "5px 14px",
  borderRadius: 999,
  background: "var(--pill,rgba(20,20,20,.95))",
  border: "1px solid var(--line2,rgba(var(--accentRgb,200,161,90),.5))",
  boxShadow: "0 0 14px rgba(var(--accentRgb,200,161,90),.3)",
  backdropFilter: "blur(8px)",
  cursor: "pointer",
};

// The bottom "podium" row: a medium cube either side of the large QR cube.
// El multiplicador --scale-cubeMedium se hereda del wrapper raíz de
// LyCardView aunque esto sea una constante de módulo -- las variables
// CSS resuelven por árbol de DOM en el navegador, no en JS (2026-09-23,
// ver lib/cardSizeConfig.ts).
const CUBE_MEDIUM: CSSProperties = {
  flex: "none",
  width: "clamp(calc(62px*var(--scale-cubeMedium,1)),calc(15dvh*var(--scale-cubeMedium,1)),calc(82px*var(--scale-cubeMedium,1)))",
  height: "clamp(calc(62px*var(--scale-cubeMedium,1)),calc(15dvh*var(--scale-cubeMedium,1)),calc(82px*var(--scale-cubeMedium,1)))",
  borderRadius: 18,
  border: "1px solid rgba(255,230,163,.45)",
  background: "linear-gradient(160deg,var(--accentLight,#E5C378),var(--accentMid,#C8A15A) 55%,var(--accentDeep,#99732B))",
  boxShadow: "0 6px 18px rgba(var(--accentRgb,200,161,90),.38)",
  color: "var(--onAccent,#141414)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
  padding: "0 4px",
  cursor: "pointer",
};

const CUBE_MEDIUM_ALT: CSSProperties = {
  ...CUBE_MEDIUM,
  background: "var(--surf,#141414)",
  border: "1px solid var(--line2,rgba(var(--accentRgb,200,161,90),.5))",
  boxShadow: "0 4px 14px rgba(0,0,0,.35)",
  color: "var(--goldtxt,#E5C378)",
};

const CUBE_LABEL: CSSProperties = {
  font: "700 8.5px var(--brandFont,'Plus Jakarta Sans'),sans-serif",
  letterSpacing: ".06em",
  textTransform: "uppercase",
  textAlign: "center",
  lineHeight: 1.15,
};

// Glassy "mirror" badge — bright inner highlight top, dark falloff bottom,
// like a polished lens sitting on the gem plate behind it. The Sweep gleam
// (rendered inside) adds the moving reflection.
const SOCIAL_ICON: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  flex: "none",
  width: "clamp(calc(24px*var(--scale-socialIcon,1)),calc(6.6dvh*var(--scale-socialIcon,1)),calc(27px*var(--scale-socialIcon,1)))",
  height: "clamp(calc(24px*var(--scale-socialIcon,1)),calc(6.6dvh*var(--scale-socialIcon,1)),calc(27px*var(--scale-socialIcon,1)))",
  borderRadius: 999,
  color: "#FBF8F1",
  background: "linear-gradient(160deg,rgba(255,255,255,.32) 0%,rgba(255,255,255,.06) 45%,rgba(255,255,255,.14) 100%)",
  border: "1px solid rgba(255,255,255,.4)",
  boxShadow:
    "inset 0 1px 1px rgba(255,255,255,.55), inset 0 -3px 5px rgba(0,0,0,.3), 0 2px 6px rgba(0,0,0,.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

// The plate each side's icon cluster sits on — gives 1-3 icons a defined,
// "mounted" shape instead of floating loose dots when a card only has a
// couple of channels filled in.
//
// Pulido visual (2026-09-29, pedido de Gunnar): antes tenía dos tonos de
// piedra distintos -- jade (verde) a la izquierda, ruby (rojo/rosa) a la
// derecha. Ninguno de los dos existe en la paleta del brandbook (#0D0D0D,
// #C8A15A, #F5F2EB, #5A5A5A) -- verde y rojo/rosa saturados quedaban
// fuera de marca. Los dos lados usan ahora el mismo tono dorado (la
// variable --accentRgb, que ya respeta el skin de marca del Programa si
// tiene uno activo, en vez de un hex fijo) -- mismo "engaste" visual, dos
// lados iguales, sin inventar un color secundario que el brandbook nunca
// definió.
const SOCIAL_DOCK: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "clamp(6px,1.8dvh,10px)",
  padding: "clamp(5px,1.4dvh,7px)",
  borderRadius: 999,
  backdropFilter: "blur(6px)",
};

const GOLD_GEM: CSSProperties = {
  background: "linear-gradient(165deg,rgba(var(--accentRgb,200,161,90),.42) 0%,rgba(13,13,13,.7) 100%)",
  border: "1px solid rgba(var(--accentRgb,200,161,90),.55)",
  boxShadow: "0 0 16px rgba(var(--accentRgb,200,161,90),.35), inset 0 1px 1px rgba(255,255,255,.15)",
};

const GEM_TONE: Record<"jade" | "ruby", CSSProperties> = {
  jade: GOLD_GEM,
  ruby: GOLD_GEM,
};

function Sweep() {
  return (
    <span
      style={{
        position: "absolute",
        inset: 0,
        background:
          "linear-gradient(90deg,transparent,rgba(255,255,255,.2),transparent)",
        animation: "sweepGleam 4s cubic-bezier(.4,0,.2,1) infinite",
        pointerEvents: "none",
      }}
    />
  );
}

function Icon({ name, size = 19, style }: { name: string; size?: number; style?: CSSProperties }) {
  return (
    <span className="material-symbols-outlined" style={{ fontSize: size, ...style }}>
      {name}
    </span>
  );
}

// Slim outline glyphs (stroke-based) sized for the small circular badges
// that flank the Virtual Office button — a lighter, more "jewelry" feel
// than flat brand-color logos.
const SOCIAL_SVG: Record<string, ReactElement> = {
  fb: (
    <>
      <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5.2" />
      <path d="M14.3 20.4v-6.5h2.15l.32-2.5h-2.47V9.7c0-.72.2-1.21 1.23-1.21h1.31V6.28c-.23-.03-1-.1-1.9-.1-1.88 0-3.16 1.15-3.16 3.25v1.85H9.6v2.5h2.18v6.5" />
    </>
  ),
  ig: (
    <>
      <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5.2" />
      <circle cx="12" cy="12" r="3.9" />
      <circle cx="17.05" cy="6.95" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  tiktok: (
    <path
      d="M13.6 3v10.9a3.05 3.05 0 1 1-2.2-2.93v-2.1a5.15 5.15 0 1 0 4.2 5.06v-5.2a6.1 6.1 0 0 0 3.6 1.17V7.3a3.85 3.85 0 0 1-3.6-2.98V3z"
      fill="currentColor"
      stroke="none"
    />
  ),
  li: (
    <>
      <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="4.4" />
      <circle cx="7.85" cy="8.05" r="1.05" fill="currentColor" stroke="none" />
      <path d="M7.85 11v6.3M12.15 11v6.3M12.15 13.9c0-1.9 1.05-2.75 2.35-2.75 1.55 0 2.15.98 2.15 2.85v4.3" />
    </>
  ),
  yt: (
    <>
      <rect x="2.6" y="6" width="18.8" height="12" rx="4" />
      <path d="M10.3 9.5 15.4 12l-5.1 2.5z" fill="currentColor" stroke="none" />
    </>
  ),
  web: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.55 2.5 3.9 5.75 3.9 9s-1.35 6.5-3.9 9c-2.55-2.5-3.9-5.75-3.9-9s1.35-6.5 3.9-9z" />
    </>
  ),
};

const SOCIAL_LABEL: Record<string, string> = {
  fb: "Facebook",
  ig: "Instagram",
  tiktok: "TikTok",
  li: "LinkedIn",
  yt: "YouTube",
  web: "Sitio Web",
};

function SocialLink({ channel, card }: { channel: keyof typeof SOCIAL_LABEL; card: Card }) {
  const href = socialHref(channel, card[channel as "fb" | "ig" | "tiktok" | "li" | "yt" | "web"]);
  if (!href) return null;
  return (
    <a key={channel} aria-label={SOCIAL_LABEL[channel]} href={href} target="_blank" rel="noopener" style={SOCIAL_ICON}>
      <Sweep />
      <svg
        viewBox="0 0 24 24"
        style={{ width: "60%", height: "60%", position: "relative" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {SOCIAL_SVG[channel]}
      </svg>
    </a>
  );
}

type SocialChannel = keyof typeof SOCIAL_LABEL;

function SocialDock({
  channels,
  card,
  tone,
}: {
  channels: SocialChannel[];
  card: Card;
  tone: "jade" | "ruby";
}) {
  const filled = channels.filter((ch) => socialHref(ch, card[ch as "fb" | "ig" | "tiktok" | "li" | "yt" | "web"]));
  if (filled.length === 0) return null;
  return (
    <div style={{ ...SOCIAL_DOCK, ...GEM_TONE[tone] }}>
      {filled.map((ch) => (
        <SocialLink key={ch} channel={ch} card={card} />
      ))}
    </div>
  );
}

// PASO 4 (2026-10-02) -- textos exactos pasados por Gunnar para el
// modal "Info [nombre]", sección "Nuestra metodología" y "Tu
// información es tuya". No son copy editable por N0 todavía (fijo),
// a diferencia de otros textos de este archivo.
const CODICE_METHODOLOGY_TEXT = `Tu gemelo digital no se arma con un formulario. Se construye con conversaciones estructuradas, basadas en la investigación sobre toma de decisiones y la neuropsicología aplicada, que identifican cómo decides, qué priorizas y por qué.
1. Escuchamos. Partimos de lo que compartiste con nosotros y de tu trayectoria pública.
2. Ordenamos. Con tu autorización, organizamos esa información en tu Códice: la base de conocimiento privada de tu gemelo.
3. Validamos. Tú revisas y corriges. Nada queda sin tu aprobación.
4. Evolucionamos. Durante tres meses de entendimiento, implementación y entrenamiento, tu Códice se perfecciona con cada interacción.
Esta tarjeta es el tiempo cero de ese proceso: el primer reflejo de lo que entendimos de ti.`;

const CODICE_PRIVACY_TEXT = "Tu Códice es privado y te pertenece. Puedes pedirnos que lo borremos cuando quieras.";

// PASO 5 (2026-10-02) -- "Deja tu Legado" abre este Documento de
// Bienvenida. Calcado de la estructura REAL del de Rafael Rico
// Carrascosa (edición agosto 2026, el único que existe hasta ahora),
// leído de la fuente que pasó Gunnar. Los capítulos I, II, III, IV,
// VII y "Antes de empezar" son boilerplate del programa -- quedan
// fijos, con el único cambio de sacarles las referencias específicas
// de Rafael (su trasfondo bíblico, Mayordomo 4.0) para que sirvan
// para cualquier destinatario. La Carta de Apertura y las 3 primeras
// sesiones del Capítulo V SÍ son 100% específicas de Rafael en el
// original -- ahí van marcadas [PLACEHOLDER], porque son el único
// contenido que de verdad cambia por persona.
type LegadoSection = { num?: string; kicker: string; title: string; paragraphs: string[] };

const LEGADO_CAP_1: LegadoSection = {
  num: "I",
  kicker: "Capítulo I",
  title: "¿Qué es EinarOS?",
  paragraphs: [
    "Un sistema operativo de inteligencia diseñado para que el conocimiento humano no se degrade al pasar por una máquina -- ni al pasar de una generación a otra.",
    "EinarOS nació de una observación incómoda: cuando una inteligencia artificial pierde el contexto, inventa. Cuando un ser humano pierde el contexto -- por el paso del tiempo, por el ruido, por el dolor -- también inventa. El mecanismo es el mismo. Y el resultado, también: una realidad distorsionada que se transmite como si fuera verdad.",
    "Toda nuestra arquitectura existe para resolver ese problema. Un sistema que preserva el contexto completo de una persona -- su criterio, su método, sus razones -- para que lo que se transmita sea fiel al original y no una copia empobrecida.",
    "LOS CUATRO DOMINIOS\nI CARBONO -- El dominio humano. Su historia, sus convicciones, su criterio, sus decisiones. Todo lo que no puede ser generado -- solo escuchado.\nII SILICIO -- El dominio de la máquina. Capacidad de procesar, estructurar y sostener conocimiento a una escala que una agenda humana no alcanza.\nIII BRIDGE -- La capa de traducción entre ambos mundos. Donde su experiencia se convierte en estructura sin perder su voz.\nIV HORUS EYE -- La auditoría. Un dominio dedicado exclusivamente a verificar que nada se distorsione, se invente o se contamine en el camino.",
    "Nota práctica: usted no necesita entender la arquitectura para beneficiarse de ella. Es el motor, no el tablero. Su trabajo durante estas cuatro semanas será, simplemente, hablar con honestidad.",
  ],
};

const LEGADO_CAP_2: LegadoSection = {
  num: "II",
  kicker: "Capítulo II",
  title: "El programa Legacy",
  paragraphs: [
    "Legacy es la aplicación de EinarOS a una sola vida. La suya. Tres movimientos, un resultado: que su conocimiento deje de depender de su tiempo.",
    "01 PRESERVA -- Protegemos la experiencia, la visión y el aprendizaje de una vida entera antes de que el tiempo los erosione.\n02 TRANSMITE -- Convertimos esa trayectoria en algo que otros pueden leer, aplicar y continuar sin necesidad de que usted esté presente.\n03 MULTIPLICA -- Montamos el equipo y la operación que toman ese material y lo convierten en impacto y en ingreso sostenido.",
    "LOS CUATRO MOVIMIENTOS DEL PROCESO\n1 CAPTURA -- Escuchamos. Grabamos. Sin filtro y sin apuro.\n2 ESTRUCTURA -- Ordenamos su criterio hasta volverlo un sistema aplicable.\n3 ACTIVA -- Su criterio empieza a responder y a operar sin usted presente.\n4 MULTIPLICA -- El equipo lo lleva al mercado, a sus clientes y su comunidad.",
    "PARA EVITAR MALENTENDIDOS\nLEGACY NO ES: una biografía. Un homenaje. Una entrevista de archivo. Un video institucional. Un ejercicio de nostalgia bien producido.\nLEGACY SÍ ES: un sistema operativo construido sobre su criterio, con un equipo real trabajando encima de él y metas comerciales escritas con fecha.",
    "Su conocimiento deja de depender solo de su tiempo y se convierte en una guía viva, aplicable y trascendente.",
  ],
};

const LEGADO_CAP_3: LegadoSection = {
  num: "III",
  kicker: "Capítulo III",
  title: "El Códice",
  paragraphs: [
    "El entregable central del programa. No es un resumen de sus entrevistas: es el documento maestro donde su criterio queda escrito con precisión suficiente para que otro lo aplique sin traicionarlo.",
    "Un manual explica qué hacer. El Códice explica por qué -- y esa diferencia es todo. Cuando su equipo enfrente una decisión que usted nunca anticipó, un manual se queda mudo. El Códice responde, porque contiene el razonamiento y no solo la conclusión.",
    "Se construye por capas. Cada sesión agrega una. Al final de la cuarta semana usted recibe el documento completo, verificado y en su poder.",
    "LAS CINCO CAPAS\nI ORIGEN -- De dónde viene su llamado, qué lo formó y por qué eligió este camino y no otro.\nII DOCTRINA -- Sus principios no negociables y los fundamentos que sostienen cada uno.\nIII MÉTODO -- Cómo trabaja usted. Su proceso explícito: qué funciona, qué no, y por qué razón.\nIV ACTIVOS -- Sus productos, sus contenidos, su comunidad y todo lo comercializable que ya existe.\nV PROYECCIÓN -- Hacia dónde va esto en cinco y diez años, y qué estructura hace falta para llegar.",
    "«El Códice es su criterio, escrito con la precisión suficiente para que otro pueda decidir como usted decidiría.»",
  ],
};

const LEGADO_CAP_4: LegadoSection = {
  num: "IV",
  kicker: "Capítulo IV",
  title: "El camino: cuatro semanas",
  paragraphs: [
    "Cinco sesiones de 45 minutos. Dos por semana durante las dos primeras. Una semana de producción. Y una entrega final.",
    "Sobre el ritmo: cuatro semanas es el plazo que nos permite entregar con confianza plena y sin atajos. Si su agenda lo exige, las sesiones se reagendan -- lo que no se negocia es que cada capa quede cerrada antes de abrir la siguiente.",
    "SEMANA 1 · FUNDACIÓN -- Sesiones 1 y 2, Origen y Doctrina. Abrimos el Códice. Recorremos su historia, su formación y los principios que gobiernan todo lo que hace. Es la semana en la que más se habla y menos se decide.\nSEMANA 2 · SISTEMA -- Sesiones 3 y 4, Método y Activos. Convertimos su forma de trabajar en un método explícito y hacemos el inventario real de lo que ya existe.\nSEMANA 3 · PRODUCCIÓN -- Sin sesión, trabajamos nosotros. Redactamos el Códice, diseñamos la oficina virtual y armamos la propuesta de equipo. Usted solo entrega los documentos pendientes. Recibirá un avance a mitad de semana.\nSEMANA 4 · ACTIVACIÓN -- Sesión 5, entrega y puesta en marcha. Le entregamos el Códice completo, el plan de la oficina virtual y los primeros roles definidos. Salimos de esa sesión con tareas asignadas y fechas, no con buenas intenciones.",
    "CALENDARIO SUGERIDO\nSemana 1 -- Sesión 1 · Origen → Sesión 2 · Doctrina (2 encuentros)\nSemana 2 -- Sesión 3 · Método → Sesión 4 · Activos (2 encuentros)\nSemana 3 -- Producción del Códice y diseño de la oficina virtual (sin sesión)\nSemana 4 -- Sesión 5 · Entrega del Códice y activación del equipo (1 encuentro)",
    "Formato de cada encuentro: Google Meet · 45 minutos · grabación y transcripción automática con Fathom. Todos los archivos quedan alojados en su carpeta.",
  ],
};

const LEGADO_CAP_7: LegadoSection = {
  num: "VII",
  kicker: "Capítulo VII",
  title: "Sus datos, sus reglas",
  paragraphs: [
    "Le vamos a pedir que comparta cosas que no se comparten con cualquiera. Por eso el control queda de su lado desde el primer minuto, sin letra chica.",
    "Usted es el propietario. Todo el material vive en una carpeta a su nombre. Nosotros trabajamos con permiso de acceso, no de posesión.",
    "Puede revocar el acceso cuando quiera. Sin aviso previo, sin explicación y sin penalidad de ningún tipo.",
    "Puede pedir que se elimine cualquier pieza. Una grabación, una transcripción o el documento entero. Se ejecuta dentro de las 24 horas.",
    "Nada se comparte con terceros sin su autorización expresa y por escrito, caso por caso.",
    "Nada se vende. Sus datos no son un producto de EinarOS y nunca lo serán.",
    "Si decide retirarse a mitad del proceso, se lleva todo lo producido hasta ese momento. Sin condiciones.",
    "Nada entra al Códice sin su aprobación. Usted lee y valida cada capa antes de que se considere cerrada.",
    "Antes de la primera sesión firmaremos juntos el Consentimiento Informado, que deja por escrito cada uno de estos puntos. Léalo con calma. Si algo no le cierra, se cambia antes de empezar -- no después.",
    "«Un legado que no se controla no es un legado. Es una filtración.»",
  ],
};

const LEGADO_ANTES: LegadoSection = {
  kicker: "Antes de empezar",
  title: "Lo único que necesita para la primera sesión",
  paragraphs: [
    "Leer el Consentimiento Informado y traer sus dudas anotadas.\nUn lugar tranquilo donde pueda hablar 45 minutos sin interrupciones.\nCámara y micrófono probados unos minutos antes de la hora.\nDisposición a hablar sin editarse. Lo que se guarda no entra al Códice, y lo que no entra no se transmite.",
    "Nada más. No prepare presentaciones ni resúmenes. Del orden nos ocupamos nosotros.",
    "Empecemos.",
    "Cuarenta y cinco minutos separan lo que usted sabe de lo que su equipo va a poder hacer con ello.",
  ],
};

function legadoCartaParagraphs(nombre: string): string[] {
  return [
    `[PLACEHOLDER] Apertura personal para ${nombre} -- quién es, qué construyó, por qué su trayectoria puntual es la base de este programa. Gunnar la escribe a mano por destinatario.`,
    `[PLACEHOLDER] Segundo párrafo personal -- qué hay detrás del trabajo de ${nombre} que merece convertirse en infraestructura, no solo quedar como un dato de su biografía.`,
    "Este documento explica qué vamos a hacer juntos durante las próximas cuatro semanas. Le pido que lea una cosa con atención, porque define todo lo demás: no venimos a hacerle un homenaje. No vamos a producir un libro conmemorativo ni un video bonito para el archivo.",
    "Venimos a extraer su criterio, ordenarlo hasta que sea operable, y montar alrededor de él un equipo y una oficina virtual que empiece a moverlo como negocio real. Su llamado necesita estructura para escalar. La entrega y la visión ya las puso usted. Lo que falta es el sistema -- y esa es nuestra parte del trabajo.",
    "Trabajamos con una convicción que probablemente le resulte familiar: los talentos no se entierran, se ponen a producir. Este programa existe para que lo que usted construyó siga produciendo cuando usted no esté en la sala.",
    "No documentamos lo que usted hizo. Construimos lo que usted todavía va a hacer.",
  ];
}

// Capítulo V -- las 3 primeras sesiones (Origen/Doctrina/Método) son
// 100% específicas de la persona en el original de Rafael; las 2
// últimas (Activos/Proyección) ya eran genéricas ahí, quedan fijas.
type LegadoSesion = { num: string; semana: string; capa: string; titulo: string; cuerpo: string; trae: string; queda: string };

function legadoSesiones(nombre: string): LegadoSesion[] {
  return [
    {
      num: "01",
      semana: "Semana 1 · Capa I",
      capa: "Origen",
      titulo: "De dónde viene todo esto",
      cuerpo: `[PLACEHOLDER] La trayectoria de ${nombre}. Cuándo y cómo apareció su camino actual. Los momentos que cambiaron su dirección.`,
      trae: "[PLACEHOLDER]",
      queda: "Capa I del Códice y el mapa de su trayectoria.",
    },
    {
      num: "02",
      semana: "Semana 1 · Capa II",
      capa: "Doctrina",
      titulo: "Sus principios no negociables",
      cuerpo: `[PLACEHOLDER] Los fundamentos que sostienen el trabajo de ${nombre}: qué defiende sin excepción y qué está dispuesto a matizar. Acá se define la línea que su equipo nunca podrá cruzar.`,
      trae: "[PLACEHOLDER]",
      queda: "Capa II y el marco de principios del proyecto.",
    },
    {
      num: "03",
      semana: "Semana 2 · Capa III",
      capa: "Método",
      titulo: "Cómo trabaja usted",
      cuerpo: `[PLACEHOLDER] Desarmamos el trabajo de ${nombre} pieza por pieza: por qué cada parte está donde está y qué principio enseña cada una. Su forma de trabajar deja de ser intuición y pasa a ser método documentado.`,
      trae: "[PLACEHOLDER]",
      queda: "Capa III y el método replicable por terceros.",
    },
    {
      num: "04",
      semana: "Semana 2 · Capa IV",
      capa: "Activos",
      titulo: "Inventario de lo que ya tiene",
      cuerpo: "Hacemos la cuenta real: canales, contenidos, comunidad, contactos clave, materiales, prototipos, versiones de lo que ya construyó. Casi siempre aparece más valor del que la persona recordaba tener.",
      trae: "Enlaces a sus canales, números de audiencia y lista de contactos clave.",
      queda: "Capa IV y el inventario comercializable.",
    },
    {
      num: "05",
      semana: "Semana 4 · Capa V",
      capa: "Proyección y entrega",
      titulo: "El Códice y la puesta en marcha",
      cuerpo: "Le entregamos el Códice completo y la estructura de la oficina virtual. Definimos los primeros roles, las primeras metas y quién hace qué. Es la única sesión donde se toman decisiones operativas y se asignan responsables con fecha.",
      trae: "Su visión a cinco años, con la ambición sin recortar.",
      queda: "Códice completo, plan operativo y equipo definido.",
    },
  ];
}

const LEGADO_ENTRE_SESIONES =
  "No le vamos a pedir tarea. Nosotros procesamos la grabación, redactamos la capa correspondiente y se la enviamos para que la revise antes del siguiente encuentro. Si algo quedó mal escrito, se corrige ahí mismo. Nada entra al Códice sin su visto bueno.";

const LEGADO_TRES_PRIMERAS = "Las tres primeras sesiones responden una sola pregunta: ¿qué sabe usted que nadie más sabe?";

const LEGADO_CAP_6_INTRO =
  "Aquí está la parte que distingue a Legacy de cualquier ejercicio de memoria: al terminar el Códice, montamos el equipo que lo pone a producir.";

function legadoCap6Placeholder(nombre: string): string {
  return `[PLACEHOLDER] Qué necesita el proyecto de ${nombre} para operar como negocio -- qué produce, a quién le vende, y qué le come el tiempo hoy que un equipo le puede resolver.`;
}

const LEGADO_CAP_6_CIERRE =
  "Eso es una oficina virtual: un equipo distribuido que trabaja sobre su Códice y responde a sus principios, sin que usted tenga que estar en cada decisión.";

const LEGADO_ROLES: { rol: string; desc: string }[] = [
  { rol: "Contenido y formación", desc: "Produce material a partir del Códice: guías, videos, cursos, dinámicas para grupos y facilitadores." },
  { rol: "Alianzas y comercial", desc: "Abre relaciones estratégicas. Convierte interés en ventas y licencias." },
  { rol: "Operación y producción", desc: "Fabricación, inventario, envíos, cobros y soporte. Lo que hoy le come el tiempo, resuelto por otros." },
  { rol: "Comunidad", desc: "Sostiene y hace crecer la audiencia en sus canales. Convierte espectadores en clientes y clientes en embajadores." },
  { rol: "Agentes EinarOS", desc: "Inteligencia artificial entrenada con su Códice: responde consultas, prepara borradores y da seguimiento sin descanso." },
];

const LEGADO_CAP_6_CIERRE_FINAL =
  "El objetivo de la semana 4 no es entregarle un documento bonito. Es que salga de esa sesión con roles asignados, metas escritas y el primer movimiento comercial en marcha.";

function socialHref(channel: string, value: string) {
  const v = value.trim();
  if (!v) return null;
  if (channel === "wa") return `https://wa.me/${v.replace(/[^\d]/g, "")}`;
  if (channel === "ig") return `https://instagram.com/${v.replace(/^@/, "")}`;
  if (channel === "li")
    return v.startsWith("http") ? v : `https://linkedin.com/${v.replace(/^\//, "")}`;
  if (channel === "x") return `https://x.com/${v.replace(/^@/, "")}`;
  if (channel === "fb")
    return v.startsWith("http") ? v : `https://facebook.com/${v.replace(/^\//, "")}`;
  if (channel === "tiktok") return `https://tiktok.com/@${v.replace(/^@/, "")}`;
  if (channel === "yt")
    return v.startsWith("http") ? v : `https://youtube.com/${v.replace(/^@/, "")}`;
  if (channel === "web") return v.startsWith("http") ? v : `https://${v}`;
  return null;
}

// Title-only override for the fixed set of button/modal labels a Program's
// N0 can customize (lib/cardLabels.ts) — atajo version of PLAN.md Fase 9.
// Only ever non-null for project cards (see app/c/[slug]/page.tsx), so
// company/personal cards fall through to the i18n default unchanged.
function cardLabel(program: Program | null, lang: Lang, key: string): string {
  const overrides = program?.cardLabels;
  if (overrides && typeof overrides === "object" && !Array.isArray(overrides)) {
    const v = (overrides as Record<string, unknown>)[key];
    if (typeof v === "string" && v.trim()) return v;
  }
  return t(lang, key);
}

export default function LyCardView({
  card,
  qrSvg,
  isAdmin,
  isHost,
  isAuthenticatedOwner,
  badge,
  originMemento,
  program,
  puesto,
  interviewSlots,
  recipient,
}: {
  card: Card;
  qrSvg: string;
  // Only still needed to decide whether the N0 badge links into /admin —
  // a Company owner can also read "N0" (they're their own network's root)
  // but isn't an Admin and /admin would just bounce them to a login screen.
  isAdmin: boolean;
  isHost: boolean;
  // Pulido visual (2026-09-29): más angosto que `isHost` -- true solo con
  // sesión real (Admin o Member dueño de esta Card). `isHost` sigue dando
  // acceso funcional completo a cualquiera que abra la Card Origen aunque
  // sea sin sesión; esto es solo para gatear detalles que son "para el
  // dueño real", como la islita de versión.
  isAuthenticatedOwner: boolean;
  // Viewer-relative N0/N1/.../NA (2026-09-16) — replaces the old
  // isAdmin-only "N0" badge; see lib/badge.ts for how it's computed.
  badge: string;
  originMemento: OriginMemento | null;
  // `skins` carries only the active one (query already filters it, see
  // app/c/[slug]/page.tsx) — 0 or 1 entries, never more.
  program: (Program & { skins: ProgramSkin[] }) | null;
  puesto: Puesto | null;
  // Horarios reales de "Agendar tu Entrevista" (Auditoría 2026-09-23) --
  // ya resueltos server-side, sin fechas vencidas: InterviewSlot real del
  // Programa si tiene, si no el fallback fijo de lib/interviewSlots.ts.
  interviewSlots: { id: string; label: string; labelEn: string; time: string }[];
  // Tarjeta personalizada por destinatario (2026-10-02, PASO 1) --
  // `?para=<slug>` resuelto server-side en app/c/[slug]/page.tsx. null
  // = link genérico, la tarjeta se ve exactamente como siempre.
  // PASO 4 (2026-10-02): el dossier completo del destinatario, no solo
  // el nombre que ya usaba el saludo de bienvenida de PASO 1.
  recipient?: RecipientWithSources | null;
}) {
  const router = useRouter();
  const isProject = card.kind === "project";
  const isCompany = card.kind === "company";
  const isPersonal = card.kind === "personal";
  // The logo that opens the Virtual Office (2026-09-16) — Program's for
  // project, the Company's own for company; personal keeps the decorative
  // gem, no logo concept there. Falls back to the gem when nothing's set.
  const officeLogoUrl = isProject ? program?.logoUrl : isCompany ? card.logoUrl : null;
  // Project cards' official social channels live on the Program, not the
  // Card (each N0 defines their project's branding once, at Program level —
  // see PLAN.md Fase 7.1). card.wa stays personal/per-host regardless of kind.
  const socialCard: Card =
    isProject && program
      ? { ...card, ig: program.ig, li: program.li, x: program.x, fb: program.fb, tiktok: program.tiktok, yt: program.yt, web: program.web }
      : card;
  // Sigla/denominación/descripción del Puesto asignado (la escalera que
  // arma el N0, PLAN.md Fase 9.2) — cae al texto propio de la Card si no
  // hay Puesto elegido, para no romper tarjetas ya cargadas.
  const displaySiglas = puesto?.siglas || card.siglas;
  const displayDenominacion = puesto?.denominacion || card.tooltip;
  const displayDescripcion = puesto?.descripcion || undefined;
  // Name island (2026-09-16), same slot as the version island below it —
  // a project card's name comes from its Program (already the one place
  // the N0 names their brand); Business/Personal get their own editable
  // label from the Card editor, defaulting to "Mi Tarjeta de Empresa/Personal".
  const cardIslandLabel = isProject
    ? `${program?.name || "Legacy"} Card`
    : card.islandLabel || (isCompany ? "Mi Tarjeta de Empresa" : "Mi Tarjeta Personal");
  const [theme, setTheme] = useState<"dark" | "light">(
    (card.defaultTheme as "dark" | "light") || "dark"
  );
  const [lang, setLang] = useState<Lang>((card.defaultLang as Lang) || "es");
  const L = (key: string) => cardLabel(program, lang, key);
  const [modal, setModal] = useState<ModalKey>(null);

  // Tamaños ajustables (2026-09-23, pedido de Gunnar: "aprieto de forma
  // sostenida y salta el ajuste") -- solo el dueño puede activarlo.
  // `liveSizeConfig` es el estado que arma las variables CSS del wrapper
  // de más abajo, así que mover un slider en CardSizePanel cambia la
  // tarjeta real al toque, no una vista previa aparte.
  const savedSizeConfig = parseCardSizeConfig(card.sizeConfig);
  const [liveSizeConfig, setLiveSizeConfig] = useState<CardSizeConfig>(savedSizeConfig);
  const [sizePanelOpen, setSizePanelOpen] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressStart = useRef<{ x: number; y: number } | null>(null);

  function cancelLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    longPressStart.current = null;
  }
  function handleCardPointerDown(e: React.PointerEvent) {
    if (!isHost || modal || scheduleOpen) return;
    longPressStart.current = { x: e.clientX, y: e.clientY };
    longPressTimer.current = setTimeout(() => {
      setLiveSizeConfig(savedSizeConfig);
      setSizePanelOpen(true);
    }, 550);
  }
  function handleCardPointerMove(e: React.PointerEvent) {
    if (!longPressStart.current) return;
    const dx = e.clientX - longPressStart.current.x;
    const dy = e.clientY - longPressStart.current.y;
    if (Math.hypot(dx, dy) > 12) cancelLongPress();
  }
  function handleSizePanelClose(nextSaved: CardSizeConfig | null) {
    if (nextSaved) setLiveSizeConfig(nextSaved);
    setSizePanelOpen(false);
  }
  const [portal, setPortal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const portalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      if (portalTimer.current) clearTimeout(portalTimer.current);
    };
  }, []);

  // Alto real del viewport (2026-10-03, pedido de Gunnar: "no cubre todo
  // el tamaño a lo largo.. se queda con un espacio sustancial abajo" al
  // abrirla como ícono en el home de su iPhone) -- bug real y conocido de
  // WebKit: `100dvh` mide bien dentro de Safari (donde sí existe una
  // barra inferior que puede aparecer/desaparecer), pero en una PWA
  // standalone (manifest `display:"standalone"`, sin ninguna barra de
  // Safari) ese mismo cálculo deja un espacio muerto abajo del tamaño de
  // la barra que ya no existe.
  //
  // Primera vuelta (v1.68.2) usaba `window.innerHeight` leído una vez al
  // montar -- Gunnar reportó que seguía igual. Causa más probable: el
  // ícono del home en iOS cachea el lanzamiento previo a nivel sistema
  // (aparte del Service Worker), así que el dispositivo puede seguir
  // mostrando el bundle viejo hasta un relanzamiento real. Pero además
  // hay un segundo bug documentado de WebKit, más sutil: en standalone,
  // la primera lectura de `window.innerHeight` al montar puede llegar
  // ANTES de que WebKit termine de asentar el layout real de pantalla
  // completa (sin barras), y queda con un valor viejo hasta el próximo
  // evento de resize real -- que en standalone puede no llegar nunca
  // solo. Por eso ahora: 1) se prioriza `visualViewport.height` sobre
  // `window.innerHeight` (la API pensada específicamente para medir el
  // viewport real, más confiable en iOS que el valor plano), y 2) se
  // vuelve a medir con un pequeño delay después del primer pintado
  // (además de en el montaje), para agarrar el valor ya asentado si el
  // primero vino mal.
  const [appVh, setAppVh] = useState<number | null>(null);
  useEffect(() => {
    function readVh() {
      return Math.round(window.visualViewport?.height ?? window.innerHeight);
    }
    function updateVh() {
      setAppVh(readVh());
    }
    updateVh();
    const settleTimer = setTimeout(updateVh, 300);
    window.addEventListener("resize", updateVh);
    window.addEventListener("orientationchange", updateVh);
    window.addEventListener("pageshow", updateVh);
    window.visualViewport?.addEventListener("resize", updateVh);
    return () => {
      clearTimeout(settleTimer);
      window.removeEventListener("resize", updateVh);
      window.removeEventListener("orientationchange", updateVh);
      window.removeEventListener("pageshow", updateVh);
      window.visualViewport?.removeEventListener("resize", updateVh);
    };
  }, []);

  function flash(text: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(text);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }

  function enterOffice() {
    // Misma animación de "portal" de antes, pero ahora te lleva a la
    // Oficina Virtual completa (app/c/[slug]/oficina) en vez de abrir un
    // modal encima de la tarjeta — pedido explícito de Gunnar: "quiero que
    // me lleve a una nueva pantalla", con vuelta por botón, no un resumen
    // atrapado en un modal.
    setPortal(true);
    if (portalTimer.current) clearTimeout(portalTimer.current);
    portalTimer.current = setTimeout(() => {
      router.push(`/c/${card.slug}/oficina`);
    }, 900);
  }

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [scheduleName, setScheduleName] = useState("");
  const [scheduleWa, setScheduleWa] = useState("");
  const [scheduleEmail, setScheduleEmail] = useState("");
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduleResult, setScheduleResult] = useState<{ slotLabel: string } | null>(null);
  const [scheduling, startScheduling] = useTransition();

  // PASO 6 (2026-10-02) -- con destinatario, el mismo botón "Agendar"
  // abre este funnel nuevo en vez del de siempre (ver más abajo, dentro
  // de scheduleOpen). Calcado del funnel REAL de MayanCity (captura que
  // mandó Gunnar): wizard de 4 pantallas con barra de progreso --
  // 1) video ("Antes de agendar...") 2) tus datos (nombre precargado,
  // email, WhatsApp, programa, privacidad) 3) elegí tu sesión (horario
  // real) 4) confirmación. Los datos quedan 100% en LyCard: nunca se
  // conecta con la app de MayanCity ni se crea ninguna billetera
  // blockchain -- reusa el alta Freemium self-service y
  // registerInterviewAction, el mismo sistema de entrevistas de siempre.
  const [legacyStep, setLegacyStep] = useState<1 | 2 | 3>(1);
  const [legacyName, setLegacyName] = useState(recipient?.nombre ?? "");
  const [legacyEmail, setLegacyEmail] = useState("");
  const [legacyWa, setLegacyWa] = useState("");
  const [legacyDuracion, setLegacyDuracion] = useState<string | null>(null);
  const [legacyPrivacy, setLegacyPrivacy] = useState(false);
  const [legacySlotId, setLegacySlotId] = useState<string | null>(null);
  const [legacyError, setLegacyError] = useState<string | null>(null);
  const [legacyResult, setLegacyResult] = useState<{ cardSlug: string; interviewLabel: string } | null>(null);
  const [legacySubmitting, startLegacySubmitting] = useTransition();

  function closeSchedule() {
    setScheduleOpen(false);
    setSelectedSlot(null);
    setScheduleName("");
    setScheduleWa("");
    setScheduleEmail("");
    setScheduleError(null);
    setScheduleResult(null);
    setLegacyStep(1);
    setLegacyName(recipient?.nombre ?? "");
    setLegacyEmail("");
    setLegacyWa("");
    setLegacyDuracion(null);
    setLegacyPrivacy(false);
    setLegacySlotId(null);
    setLegacyError(null);
    setLegacyResult(null);
  }

  function submitLegacyDatos() {
    setLegacyError(null);
    if (!legacyName.trim()) return setLegacyError("Escribí tu nombre.");
    if (!legacyEmail.trim()) return setLegacyError("Escribí tu email.");
    if (!legacyWa.trim()) return setLegacyError("Escribí tu WhatsApp.");
    if (!legacyDuracion) return setLegacyError("Elegí un programa.");
    if (!legacyPrivacy) return setLegacyError("Tenés que aceptar el aviso de privacidad para seguir.");
    setLegacyStep(3);
  }

  function submitLegacyFunnel() {
    setLegacyError(null);
    if (!legacySlotId) return setLegacyError("Elegí un horario.");
    if (!legacyDuracion) return setLegacyError("Elegí un programa.");
    startLegacySubmitting(async () => {
      const res = await startLegacyFunnelAction({
        referrerCardSlug: card.slug,
        nombre: legacyName,
        email: legacyEmail,
        whatsapp: legacyWa,
        programDuracion: legacyDuracion,
        aceptaPrivacidad: legacyPrivacy,
        slotId: legacySlotId,
      });
      if (res.ok) {
        setLegacyResult({ cardSlug: res.cardSlug, interviewLabel: res.interviewLabel });
      } else if (res.error === "email") {
        setLegacyError("Ese email no parece válido.");
      } else if (res.error === "nombre") {
        setLegacyError("Escribí tu nombre.");
      } else if (res.error === "whatsapp") {
        setLegacyError("Escribí tu WhatsApp.");
      } else if (res.error === "slot") {
        setLegacyError("Ese horario ya se llenó -- elegí otro.");
      } else {
        setLegacyError("No se pudo crear tu tarjeta -- probá de nuevo.");
      }
    });
  }

  function submitSchedule() {
    setScheduleError(null);
    if (!selectedSlot) return setScheduleError(t(lang, "scheduleErrSlot"));
    if (!scheduleName.trim()) return setScheduleError(t(lang, "scheduleErrName"));
    if (!scheduleWa.trim()) return setScheduleError(t(lang, "scheduleErrWa"));
    startScheduling(async () => {
      const res = await registerInterviewAction({
        cardSlug: card.slug,
        slotId: selectedSlot,
        name: scheduleName,
        whatsapp: scheduleWa,
        email: scheduleEmail,
      });
      if (res.ok) {
        setScheduleResult({ slotLabel: res.slotLabel });
      } else if (res.error === "full") {
        setScheduleError(t(lang, "scheduleErrFull"));
      } else if (res.error === "email") {
        setScheduleError(t(lang, "scheduleErrEmail"));
      } else {
        setScheduleError(t(lang, "scheduleErrSlot"));
      }
    });
  }

  // Destinatarios (2026-10-02) -- "Enviar Invitación" pasa de ser un
  // simple formulario de email a ser el lugar donde se crea un
  // destinatario con nombre, se le arma su dossier de fuentes (links,
  // archivos, notas -- "cualquier cosa", pedido textual de Gunnar, para
  // armar el NotebookLM después), y se entra directo a su link
  // personalizado (/c/[slug]?para=[slug]). Se carga perezoso la primera
  // vez que se abre el modal, no en cada render de la tarjeta.
  const [recipients, setRecipients] = useState<RecipientWithSources[]>([]);
  const [recipientsLoaded, setRecipientsLoaded] = useState(false);
  const [newRecipientName, setNewRecipientName] = useState("");
  const [recipientError, setRecipientError] = useState<string | null>(null);
  const [creatingRecipient, startCreatingRecipient] = useTransition();
  const [openRecipientId, setOpenRecipientId] = useState<string | null>(null);
  const [sourceType, setSourceType] = useState<"link" | "archivo" | "texto">("link");
  const [sourceLabel, setSourceLabel] = useState("");
  const [sourceLinkValue, setSourceLinkValue] = useState("");
  const [sourceTextValue, setSourceTextValue] = useState("");
  const [addingSource, startAddingSource] = useTransition();
  const sourceFileInputRef = useRef<HTMLInputElement>(null);

  // PASO 4 (2026-10-02) -- gate de palabra secreta del botón "Info
  // [nombre]". Sin palabra configurada para este destinatario, el gate
  // se salta directo (no hay nada que validar todavía, "placeholder").
  const [infoUnlocked, setInfoUnlocked] = useState(false);
  const [infoSecretInput, setInfoSecretInput] = useState("");
  const [infoSecretError, setInfoSecretError] = useState<string | null>(null);
  const infoNeedsGate = !!recipient?.palabraSecreta.trim();
  const infoContentVisible = !infoNeedsGate || infoUnlocked;

  function submitInfoSecret() {
    if (!recipient) return;
    if (infoSecretInput.trim().toLowerCase() === recipient.palabraSecreta.trim().toLowerCase()) {
      setInfoUnlocked(true);
      setInfoSecretError(null);
    } else {
      setInfoSecretError("Esa no es la palabra. Probá de nuevo.");
    }
  }

  // Edición in-place de palabra secreta / link de cuaderno por
  // destinatario, desde el mismo panel de Destinatarios (modal
  // "invite") -- se guarda al salir del campo (onBlur), sin botón
  // aparte, mismo criterio liviano que el resto de ese panel.
  function updateRecipientLocal(id: string, patch: Partial<RecipientWithSources>) {
    setRecipients((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function saveRecipientMeta(id: string, patch: { palabraSecreta?: string; cuadernoUrl?: string }) {
    updateRecipientMetaAction(id, patch);
  }

  useEffect(() => {
    if (modal === "invite" && !recipientsLoaded) {
      listRecipientsAction(card.slug).then((rows) => {
        setRecipients(rows);
        setRecipientsLoaded(true);
      });
    }
  }, [modal, recipientsLoaded, card.slug]);

  function submitCreateRecipient() {
    setRecipientError(null);
    startCreatingRecipient(async () => {
      const res = await createRecipientQuickAction(card.slug, newRecipientName);
      if (res.ok) {
        setRecipients((rs) => [...rs, res.recipient]);
        setNewRecipientName("");
        setOpenRecipientId(res.recipient.id);
      } else {
        setRecipientError(res.error === "empty" ? "Escribí un nombre." : "No se pudo crear -- probá de nuevo.");
      }
    });
  }

  async function removeRecipient(id: string) {
    setRecipients((rs) => rs.filter((r) => r.id !== id));
    await deleteRecipientAction2(id);
  }

  function submitAddSource(recipientId: string) {
    startAddingSource(async () => {
      let res: Awaited<ReturnType<typeof addRecipientLinkSourceAction>>;
      if (sourceType === "link") {
        if (!sourceLinkValue.trim()) return;
        res = await addRecipientLinkSourceAction(recipientId, sourceLabel, sourceLinkValue);
      } else if (sourceType === "texto") {
        if (!sourceTextValue.trim()) return;
        res = await addRecipientTextSourceAction(recipientId, sourceLabel, sourceTextValue);
      } else {
        const file = sourceFileInputRef.current?.files?.[0];
        if (!file) return;
        res = await addRecipientFileSourceAction(recipientId, sourceLabel, file);
      }
      if (res.ok) {
        setRecipients((rs) => rs.map((r) => (r.id === recipientId ? { ...r, sources: [...r.sources, res.source] } : r)));
        setSourceLabel("");
        setSourceLinkValue("");
        setSourceTextValue("");
        if (sourceFileInputRef.current) sourceFileInputRef.current.value = "";
      }
    });
  }

  async function removeSource(recipientId: string, sourceId: string) {
    setRecipients((rs) => rs.map((r) => (r.id === recipientId ? { ...r, sources: r.sources.filter((s) => s.id !== sourceId) } : r)));
    await deleteRecipientSourceAction(sourceId);
  }

  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [messageText, setMessageText] = useState("");
  const [contactError, setContactError] = useState<string | null>(null);
  const [contactSent, setContactSent] = useState(false);
  const [contacting, startContacting] = useTransition();

  function submitContact() {
    setContactError(null);
    if (!senderName.trim()) return setContactError(t(lang, "contactErrName"));
    if (!messageText.trim()) return setContactError(t(lang, "contactErrMessage"));
    startContacting(async () => {
      const res = await sendContactMessageAction({
        cardSlug: card.slug,
        senderName,
        senderEmail,
        message: messageText,
      });
      if (res.ok) {
        setContactSent(true);
      } else if (res.error === "not_configured") {
        setContactError(t(lang, "contactErrNotConfigured"));
      } else if (res.error === "email") {
        setContactError(t(lang, "contactErrEmail"));
      } else {
        setContactError(t(lang, "contactErrMessage"));
      }
    });
  }

  // Fullscreen CV viewer, opened by tapping the profession tag under the
  // name (2026-09-16) — one shared demo PDF for every card until there's a
  // real per-Member CV to upload/store.
  const [cvOpen, setCvOpen] = useState(false);

  // Host sends their own QR over WhatsApp instead of scanning it themselves
  // (2026-09-16) — simulated like every other WhatsApp send in this app:
  // no real provider yet, just a fake delay and a success state, with the
  // one integration point isolated in sendQrByWhatsappAction for later.
  const [qrSendOpen, setQrSendOpen] = useState(false);
  const [qrWa, setQrWa] = useState("");
  const [qrError, setQrError] = useState<string | null>(null);
  const [qrSent, setQrSent] = useState(false);
  const [qrSending, startQrSending] = useTransition();

  function closeQrSend() {
    setQrSendOpen(false);
    setQrWa("");
    setQrError(null);
    setQrSent(false);
  }

  function submitQrSend() {
    setQrError(null);
    if (!qrWa.trim()) return setQrError(t(lang, "scheduleErrWa"));
    startQrSending(async () => {
      const res = await sendQrByWhatsappAction({ cardSlug: card.slug, whatsapp: qrWa });
      if (res.ok) setQrSent(true);
      else setQrError(t(lang, "scheduleErrWa"));
    });
  }

  const light = theme === "light";
  // Program-defined Medallón/Sabiduría scales (PLAN.md Fase 9.4/9.5) — empty
  // (no Program, or Program hasn't set one) falls back to the fixed scale
  // in lib/data.ts, same as everywhere else in Fase 9.
  const medalScale = parseEscala(program?.medalScale);
  const rankScale = parseEscala(program?.rankScale);
  const medalFallback = medalById(card.medal);
  const rankFallback = rankById(card.rank);
  const medalTier = medalScale.find((m) => m.key === card.medal) ?? {
    key: medalFallback.id,
    nombre: lang === "en" ? medalFallback.en : medalFallback.es,
    subtitulo: lang === "en" ? medalFallback.enSub : medalFallback.esSub,
    icono: "",
    color: medalFallback.gem,
    descripcion: "",
  };
  const rankTier = rankScale.find((r) => r.key === card.rank) ?? {
    key: rankFallback.id,
    nombre: lang === "en" ? rankFallback.en : rankFallback.es,
    subtitulo: lang === "en" ? rankFallback.enSub : rankFallback.esSub,
    icono: rankFallback.icon,
    color: "",
    descripcion: "",
  };
  const rankLabel = rankTier.nombre.toUpperCase();

  // "Gente contactada" dot flanking the name, left side (2026-09-16) — was
  // fully simulated (`medalById("plata")` hardcoded) until now. Real field
  // (Card.contacts) + Program-scoped scale (Program.contactsScale), same
  // shape/fallback pattern as medalTier above. The *count* behind it is
  // still not tracked anywhere, only the tier label/icon are real now.
  const contactsScale = parseEscala(program?.contactsScale);
  const contactsFallback = medalById(card.contacts);
  const contactsTier = contactsScale.find((c) => c.key === card.contacts) ?? {
    key: contactsFallback.id,
    nombre: lang === "en" ? contactsFallback.en : contactsFallback.es,
    subtitulo: lang === "en" ? contactsFallback.enSub : contactsFallback.esSub,
    icono: "",
    color: contactsFallback.gem,
    descripcion: "",
  };

  // Fase 2 del sistema de skins (2026-09-16): el skin activo del Programa
  // (si hay uno) pisa el tema dark/light de siempre — una identidad de
  // marca fija, no un par claro/oscuro — inyectando el mismo tipo de
  // variables CSS que ya usaba THEME_VARS más un puñado nuevas para las
  // partes de LyCardView que antes tenían el dorado/oscuro fijo escrito a
  // mano. Sin skin activo, brandVars queda vacío y cada var() cae a su
  // literal de siempre — cero cambio visual.
  //
  // Un skin ahora puede traer un segundo set de colores para modo claro
  // (2026-09-18, pedido de Gunnar) — sin ese segundo set, el toggle
  // sigue oculto (mostrar un botón que no cambia nada era el bug
  // original que esto reemplaza); con los dos sets, brandVars elige el
  // que corresponda al `theme` actual en vez de pisarlo siempre con el
  // (único) set de antes.
  const activeSkin = program?.skins?.[0] ?? null;
  const skinColors = activeSkin && isSkinColors(activeSkin.colors) ? activeSkin.colors : null;
  const skinLightColors = activeSkin && isSkinColors(activeSkin.lightColors) ? activeSkin.lightColors : null;
  const activeSkinColors = theme === "light" && skinLightColors ? skinLightColors : skinColors;
  const brandVars: CSSProperties = activeSkinColors
    ? {
        ["--ink" as string]: activeSkinColors.ink,
        ["--ink2" as string]: activeSkinColors.ink2,
        ["--surf" as string]: activeSkinColors.surf,
        ["--surf2" as string]: activeSkinColors.surf2,
        ["--surfHi" as string]: activeSkinColors.surf2,
        ["--line" as string]: `rgba(${hexToRgbString(activeSkinColors.accent)},.22)`,
        ["--line2" as string]: `rgba(${hexToRgbString(activeSkinColors.accent)},.5)`,
        ["--pill" as string]: `rgba(${hexToRgbString(activeSkinColors.surf)},.95)`,
        ["--goldtxt" as string]: activeSkinColors.accent,
        ["--photofade" as string]: activeSkinColors.bg,
        ["--photofade2" as string]: `rgba(${hexToRgbString(activeSkinColors.bg)},.52)`,
        ["--photofade3" as string]: `rgba(${hexToRgbString(activeSkinColors.bg)},.25)`,
        ["--qrbg" as string]: `rgba(${hexToRgbString(activeSkinColors.surf)},.95)`,
        ["--nameshadow" as string]:
          lightness(activeSkinColors.bg) > 140 ? "0 1px 1px rgba(255,255,255,.7)" : "0 1px 2px rgba(0,0,0,.35)",
        ["--card" as string]: "transparent",
        ["--deepBg" as string]: activeSkinColors.bg,
        ["--accentLight" as string]: shade(activeSkinColors.accent, 0.35),
        ["--accentMid" as string]: activeSkinColors.accent,
        ["--accentDeep" as string]: activeSkinColors.accentDark,
        ["--accentRgb" as string]: hexToRgbString(activeSkinColors.accent),
        ["--onAccent" as string]: lightness(activeSkinColors.accent) > 150 ? "#141414" : "#F5F2EB",
        ...(activeSkin && (KNOWN_FONTS as readonly string[]).includes(activeSkin.font)
          ? { ["--brandFont" as string]: `"${activeSkin.font}"` }
          : {}),
      }
    : {};

  // Carga la Google Font real del skin activo, si es una que reconocemos —
  // nunca confía en texto libre como URL. Sin skin o fuente desconocida,
  // no hace nada (queda la tipografía fija de siempre).
  useEffect(() => {
    const font = activeSkin?.font;
    if (!font) return;
    const href = googleFontHref(font);
    if (!href) return;
    if (document.querySelector(`link[data-lycard-font="${font}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.lycardFont = font;
    document.head.appendChild(link);
  }, [activeSkin?.font]);

  const modalMap: Record<
    Exclude<ModalKey, null>,
    { icon: string; kicker: string; head?: string; body?: string; meta?: string }
  > = {
    od: {
      icon: puesto?.icono || "diamond",
      // Sigla (ej. "O.D.") es la posición asignada dentro del Programa —
      // va chica, arriba. Denominación (ej. "Original Dreamer") es el
      // nombre completo de esa posición — va como título grande, debajo.
      // Antes estaba al revés (PLAN.md Fase 9.1).
      kicker: displaySiglas,
      head: displayDenominacion,
      body: displayDescripcion || t(lang, "odBody"),
      // meta condicional (2026-10-03): "Sin configurar" mientras el
      // Programa no definió su propio Puesto -- antes decía siempre
      // "Activo y Certificado" aunque el body ya avisara que no hay nada
      // cargado, contradicción dentro del mismo modal.
      meta: displayDescripcion ? t(lang, "odMeta") : t(lang, "odMetaEmpty"),
    },
    ancient: {
      icon: rankTier.icono || "auto_awesome",
      kicker: L("ancKicker"),
      // Dynamic per the card's actual rank tier (PLAN.md Fase 9.5) — used
      // to always say "Ancient Pioneer" regardless of the real rank.
      head: `✦ ${rankTier.nombre} ✦`,
      body: rankTier.descripcion || t(lang, "ancBody"),
      meta: rankTier.descripcion ? t(lang, "ancMeta") : t(lang, "ancMetaEmpty"),
    },
    medal: {
      icon: medalTier.icono || "workspace_premium",
      kicker: medalTier.subtitulo || t(lang, "medalKicker"),
      head: medalTier.nombre,
      body: medalTier.descripcion || t(lang, "medalBody"),
      meta: medalTier.descripcion ? t(lang, "medalMeta") : t(lang, "medalMetaEmpty"),
    },
    // Tier label/icon are real (Card.contacts + Program.contactsScale,
    // 2026-09-16) — the *count* behind it is still simulated, no real
    // send/contact tally feeds it yet.
    contacts: {
      icon: contactsTier.icono || "military_tech",
      kicker: contactsTier.subtitulo || t(lang, "medalKicker"),
      head: `${contactsTier.nombre} · Contactados`,
      body:
        contactsTier.descripcion ||
        "Personas a las que le enviaste tu QR o contactaste desde tu LyCard. Todavía es un dato simulado — la cuenta real llega con el envío por WhatsApp de verdad.",
      meta: "Simulado",
    },
    story: {
      icon: "auto_stories",
      kicker: isProject ? L("storyKicker") : t(lang, isCompany ? "storyKickerCompany" : "storyKickerPersonal"),
      // Each host's own words (PLAN.md Fase 9.3, editable at /m/dashboard) —
      // project falls back to the fixed Legacy copy until they write their
      // own; company/personal have no built-in lore to fall back to, so
      // theirs is a plain "not written yet" placeholder instead (2026-09-16).
      head: card.storyQuote || (isProject ? t(lang, "storyHead") : t(lang, "storyHeadEmpty", { name: card.name })),
      body: card.storyBody || (isProject ? t(lang, "storyBody") : t(lang, "storyBodyEmpty", { name: card.name })),
      meta: isProject ? t(lang, "storyMeta") : undefined,
    },
    // PASO 4 (2026-10-02): con destinatario, "Info Legacy" pasa a ser
    // "Info [nombre]" -- el resto (isCompany/default) sigue exactamente
    // igual, nunca se toca sin destinatario.
    info: recipient
      ? { icon: "diamond", kicker: `Info ${recipient.nombre}` }
      : isCompany
      ? { icon: "storefront", kicker: t(lang, "companyInfoKicker"), head: card.title || card.name, body: card.quote, meta: t(lang, "companyInfoMeta") }
      : { icon: "diamond", kicker: L("infoKicker") },
    invite: { icon: "mail", kicker: L("inviteKicker") },
    // PASO 5 (2026-10-02): "Deja tu Legado" -- el Documento de
    // Bienvenida, solo con destinatario.
    legado: { icon: "auto_stories", kicker: recipient ? `Para ${recipient.nombre}` : "Documento de Bienvenida" },
    contactMessage: { icon: "chat", kicker: t(lang, "contactKicker") },
    // Name island (2026-09-16) — short explainer of what this Card type is
    // for. Fixed copy per kind, not Program-configurable yet.
    cardInfo: {
      icon: isProject ? "military_tech" : isCompany ? "storefront" : "badge",
      kicker: cardIslandLabel,
      head: t(lang, isProject ? "cardInfoProjectHead" : isCompany ? "cardInfoCompanyHead" : "cardInfoPersonalHead"),
      body: t(lang, isProject ? "cardInfoProjectBody" : isCompany ? "cardInfoCompanyBody" : "cardInfoPersonalBody"),
    },
    // Version island (2026-09-16) — the visual bitácora: current entry's
    // note as the body, a breadcrumb of the last couple versions as meta.
    versionInfo: {
      icon: "history_edu",
      kicker: t(lang, "versionInfoKicker"),
      head: `v${CHANGELOG[0].version}`,
      body: CHANGELOG[0].notes,
      meta: CHANGELOG.slice(1, 3).map((e) => `v${e.version}`).join(" · ") || t(lang, "versionInfoMeta"),
    },
  };
  const activeModal = modal ? modalMap[modal] : null;

  function closeModal() {
    setModal(null);
    setOpenRecipientId(null);
    setNewRecipientName("");
    setRecipientError(null);
    setSenderName("");
    setSenderEmail("");
    setMessageText("");
    setContactError(null);
    setContactSent(false);
    setInfoUnlocked(false);
    setInfoSecretInput("");
    setInfoSecretError(null);
  }

  return (
    <div
      onPointerDown={handleCardPointerDown}
      onPointerMove={handleCardPointerMove}
      onPointerUp={cancelLongPress}
      onPointerLeave={cancelLongPress}
      onPointerCancel={cancelLongPress}
      style={{
        height: appVh ? `${appVh}px` : "100dvh",
        width: "100%",
        display: "flex",
        justifyContent: "center",
        overflow: "hidden",
        background: "var(--deepBg,#09090b)",
        fontFamily: "var(--brandFont,'Plus Jakarta Sans'),sans-serif",
        WebkitFontSmoothing: "antialiased",
        ...THEME_VARS[theme],
        ...brandVars,
        ...buildCardSizeCssVars(liveSizeConfig),
      }}
    >
      <div style={{ position: "relative", width: "100%", maxWidth: 430, height: "100%", overflow: "hidden" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            // Bottom padding sube de +10px a +24px (2026-09-17) — los
            // puntitos del CardCarousel viven a +6px/+12px del borde real
            // (ver CardCarousel.tsx), pisando el botón/CTA final si la
            // tarjeta solo dejaba +10px de aire. Ahora queda un respiro
            // real entre el último elemento y los puntitos.
            padding:
              "calc(env(safe-area-inset-top,0px) + 10px) 14px calc(env(safe-area-inset-bottom,0px) + 24px)",
            gap: "clamp(6px,1.4dvh,14px)",
            background: "var(--card,transparent)",
            overflow: "hidden",
            transition: "background-color .3s ease",
          }}
        >
          {/* Portrait */}
          {/* Pulido visual (2026-09-29, pedido de Gunnar): este wrapper
              tenía flex:1 1 auto sin tope -- crecía para absorber TODO el
              espacio sobrante de la columna principal, pero su único hijo
              que de verdad crece (la foto, abajo) tiene un maxHeight fijo
              (357px*scale). En pantallas altas o con tarjetas con poco
              contenido, una vez la foto tocaba su tope, el resto del
              espacio quedaba varado ADENTRO de este wrapper, después de la
              fila de redes sociales -- el hueco grande reportado, entre
              redes y la frase. Ponerle a este wrapper el MISMO tope que su
              foto (+70px de margen para la fila de redes que se superpone
              -28px sobre la foto) evita que crezca de más -- si sobra
              espacio real, ahora queda al final de la tarjeta (debajo del
              botón "Agendar"), nunca partiendo el medio. Verificado con
              capturas reales antes/después, no a ojo. */}
          <div
            style={{
              position: "relative",
              flex: "1 1 auto",
              minHeight: 0,
              maxHeight: "calc(357px*var(--scale-photo,1) + 70px)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div
              style={{
                position: "relative",
                width: "100%",
                // -15% (2026-09-17, pedido de Gunnar): 130/420 → 110/357,
                // para que el panel de botones/social de abajo respire más.
                // 2026-09-23: multiplicador --scale-photo ajustable por el
                // dueño (long-press en la tarjeta), ver lib/cardSizeConfig.ts.
                flex: "1 1 auto",
                minHeight: "calc(110px*var(--scale-photo,1))",
                maxHeight: "calc(357px*var(--scale-photo,1))",
                borderRadius: 24,
                overflow: "hidden",
                border: "1px solid var(--line,rgba(var(--accentRgb,200,161,90),.22))",
                boxShadow: "0 16px 40px rgba(0,0,0,.85)",
                background: "var(--deepBg,#0D0D0D)",
              }}
            >
              {card.portraitUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={card.portraitUrl}
                  alt={card.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "rgba(245,242,235,.3)",
                    font: "500 11px var(--brandFont,'Plus Jakarta Sans'),sans-serif",
                    letterSpacing: ".08em",
                    textTransform: "uppercase",
                  }}
                >
                  Retrato oficial
                </div>
              )}

              {/* Single flex row (2026-09-16) instead of 3 independently
                  top-positioned clusters: alignItems:"center" makes every
                  child's vertical center land on the row's true center —
                  which, since both islands share one style/one line of
                  text, is the same point as the center of the gap between
                  them. Equal flex:1 spacers keep the island stack
                  horizontally centered no matter how wide either icon
                  cluster is, same as the old left:50% trick but now
                  sharing one cross-axis with the icon circles. */}
              <div style={{ position: "absolute", top: 14, left: 14, right: 14, zIndex: 30, display: "flex", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {/* Para NA (nadie logueado con relación a esta Card), este
                      ícono siempre terminaba en /admin/login de todos modos
                      (pedido de Gunnar, 2026-09-19: "que el ícono cambie...
                      porque al final es donde te lleva") — mostrarlo como
                      "personalizar" ahí era engañoso. Sigue siendo tune/
                      /admin/[slug] para cualquiera con badge real (N0..N,
                      donde sí tiene sentido personalizar). */}
                  {badge === "NA" ? (
                    <Link href="/admin/login" aria-label={L("loginIcon")} style={ICON_BTN}>
                      <Icon name="login" size={17} />
                    </Link>
                  ) : (
                    <Link href={`/admin/${card.slug}`} aria-label={L("customize")} style={ICON_BTN}>
                      <Icon name="tune" size={17} />
                    </Link>
                  )}
                  {/* Viewer-relative N badge (2026-09-16) — always renders,
                      never hidden, so this cluster's width never changes.
                      MasterN0 keeps the shortcut into /admin; every other
                      value (N1, N2, NA...) is purely informational. */}
                  {badge === "N0" && isAdmin ? (
                    <Link
                      href="/admin"
                      aria-label="MasterN0"
                      style={{ ...ICON_BTN, font: "800 10px var(--brandFont,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".02em" }}
                    >
                      N0
                    </Link>
                  ) : (
                    <span
                      aria-label="Tu nivel"
                      style={{ ...ICON_BTN, cursor: "default", font: "800 10px var(--brandFont,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".02em" }}
                    >
                      {badge}
                    </span>
                  )}
                </div>

                <div style={{ flex: 1 }} />

                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <button
                    type="button"
                    aria-label="Sobre esta tarjeta"
                    onClick={() => setModal("cardInfo")}
                    style={ISLAND_BADGE}
                  >
                    {cardIslandLabel}
                  </button>
                  {isAuthenticatedOwner && (
                    <button
                      type="button"
                      aria-label="Versión de la app"
                      onClick={() => setModal("versionInfo")}
                      style={ISLAND_BADGE}
                    >
                      V. {APP_VERSION}
                    </button>
                  )}
                </div>

                <div style={{ flex: 1 }} />

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    type="button"
                    aria-label="Idioma"
                    onClick={() => setLang((l) => (l === "es" ? "en" : "es"))}
                    style={{ ...ICON_BTN, font: "700 11px var(--brandFont,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".06em" }}
                  >
                    {lang === "es" ? "ES" : "EN"}
                  </button>
                  {/* Sin skin: el par claro/oscuro de siempre. Con skin
                      activo, solo se muestra si el skin también definió un
                      segundo set de colores para modo claro (2026-09-18) —
                      mostrarlo con un solo set sería el bug original que
                      esto reemplaza (un botón que no cambiaba nada). */}
                  {(!skinColors || skinLightColors) && (
                    <button
                      type="button"
                      aria-label="Tema"
                      onClick={() => setTheme((th) => (th === "dark" ? "light" : "dark"))}
                      style={ICON_BTN}
                    >
                      <Icon name={light ? "dark_mode" : "light_mode"} />
                    </button>
                  )}
                </div>
              </div>

              <div
                style={{
                  position: "absolute",
                  inset: "auto 0 0 0",
                  height: 120,
                  background:
                    "linear-gradient(to top,var(--photofade,#0D0D0D) 0%,var(--photofade2,rgba(13,13,13,.52)) 45%,var(--photofade3,rgba(13,13,13,.25)) 72%,transparent 100%)",
                  opacity: 0.78,
                  pointerEvents: "none",
                  transition: "background .3s ease",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: "auto 0 0 0",
                  padding: "16px 16px 30px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  gap: 10,
                  zIndex: 10,
                  pointerEvents: "none",
                }}
              >
                {/* Name flanked by two tier dots (2026-09-16): left is
                    "gente contactada" (tier is real, count still
                    simulated), right is the medal dot that used to live,
                    with its text, in the badge row below. Each dot's icon
                    is now editable per Card/Program, same as its color. */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, pointerEvents: "auto" }}>
                  <button
                    type="button"
                    onClick={() => setModal("contacts")}
                    aria-label="Personas contactadas"
                    style={TIER_DOT(contactsTier.color)}
                  >
                    <Icon name={contactsTier.icono || "military_tech"} size={14} style={{ color: "#141414" }} />
                  </button>
                  <h1
                    style={{
                      margin: 0,
                      font: card.name ? "600 24px/1.2 var(--brandFont,'Playfair Display'),serif" : "italic 600 24px/1.2 var(--brandFont,'Playfair Display'),serif",
                      letterSpacing: "-.01em",
                      color: card.name ? "var(--ink,#F5F2EB)" : "var(--ink2,#8A8680)",
                      textShadow: "var(--nameshadow,0 1px 2px rgba(0,0,0,.35))",
                    }}
                  >
                    {/* Espacio marcado (2026-10-03, pedido de Gunnar) --
                        tarjeta sin nombre cargado todavía: en vez de un
                        <h1> vacío (invisible, nadie sabe que ahí va el
                        nombre), un placeholder atenuado/itálico, mismo
                        criterio que el placeholder gris de un input. */}
                    {card.name || t(lang, "namePlaceholder")}
                  </h1>
                  <button
                    type="button"
                    onClick={() => setModal("medal")}
                    aria-label="Nivel de Medallón"
                    style={TIER_DOT(medalTier.color)}
                  >
                    <Icon name={medalTier.icono || "military_tech"} size={14} style={{ color: "#141414" }} />
                  </button>
                </div>

                {
                  // +15% (2026-09-17, pedido de Gunnar) sobre el tamaño que
                  // ya había bajado un 30% en v1.11.1 — no es una vuelta al
                  // tamaño original, es un ajuste sobre ese achique.
                  //
                  // Antes este botón entero desaparecía si card.title
                  // estaba vacío -- invisible, ni rastro de que ahí va el
                  // CV (2026-10-03, pedido de Gunnar). Ahora siempre se ve,
                  // con un placeholder atenuado cuando no hay título
                  // cargado. De paso, ensanchado: a 172px fijo un título
                  // real tipo "PhD en Neuropsicología" quedaba cortado con
                  // puntos suspensivos ("se me hace esta muy corto") --
                  // ahora crece con el contenido hasta un tope más generoso.
                }
                <button
                  type="button"
                  onClick={() => setCvOpen(true)}
                  aria-label="Ver CV"
                  style={{
                    ...BADGE_BTN,
                    pointerEvents: "auto",
                    padding: "4px 14px",
                    gap: 5,
                    width: "auto",
                    minWidth: 172,
                    maxWidth: "92%",
                    justifyContent: "center",
                  }}
                >
                  <Sweep />
                  <Icon name="work" size={9} style={{ flex: "none", color: card.title ? "var(--goldtxt,#E5C378)" : "var(--ink2,#8A8680)" }} />
                  <span
                    style={{
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      font: card.title ? "700 8px var(--brandFont,'Plus Jakarta Sans'),sans-serif" : "italic 600 8px var(--brandFont,'Plus Jakarta Sans'),sans-serif",
                      letterSpacing: ".14em",
                      textTransform: card.title ? "uppercase" : "none",
                      color: card.title ? "var(--goldtxt,#E5C378)" : "var(--ink2,#8A8680)",
                    }}
                  >
                    {card.title || t(lang, "titlePlaceholder")}
                  </span>
                </button>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: 8, pointerEvents: "auto" }}>
                  <button type="button" onClick={() => setModal("od")} style={BADGE_BTN}>
                    <Sweep />
                    <Icon name={puesto?.icono || "diamond"} size={12} style={{ color: "var(--goldtxt,#E5C378)" }} />
                    <span style={{ font: "700 10px var(--brandFont,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".16em", textTransform: "uppercase", color: "var(--goldtxt,#E5C378)" }}>
                      {displaySiglas}
                    </span>
                  </button>
                  <button type="button" onClick={() => setModal("ancient")} style={BADGE_BTN}>
                    <Sweep />
                    <Icon name={rankTier.icono || "auto_awesome"} size={14} style={{ color: "var(--accentLight,#E5C378)" }} />
                    <span style={{ font: "700 10px var(--brandFont,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".16em", textTransform: "uppercase", color: "var(--goldtxt,#E5C378)" }}>
                      {rankLabel}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <div
              style={{
                position: "relative",
                marginTop: -28,
                zIndex: 20,
                width: "100%",
                maxWidth: 358,
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
                gap: "clamp(8px,2.4dvh,16px)",
              }}
            >
              <SocialDock channels={["fb", "ig", "tiktok"]} card={socialCard} tone="jade" />
              <button
                type="button"
                onClick={enterOffice}
                aria-label="Oficina Virtual"
                style={{
                  position: "relative",
                  flex: "none",
                  width: `${80 * liveSizeConfig.logo}px`,
                  height: `${80 * liveSizeConfig.logo}px`,
                  borderRadius: 999,
                  padding: 2,
                  background: "linear-gradient(180deg,rgba(229,195,120,.7),rgba(var(--accentRgb,200,161,90),.5),var(--deepBg,#141414))",
                  border: "1px solid rgba(var(--accentRgb,200,161,90),.4)",
                  boxShadow: "0 12px 32px rgba(0,0,0,.85)",
                  cursor: "pointer",
                  overflow: "hidden",
                }}
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                    height: "100%",
                    borderRadius: 999,
                    background: "linear-gradient(180deg,var(--surfHi,#1C1C1C),var(--surf,#141414) 55%,var(--deepBg,#0D0D0D))",
                    border: "1px solid rgba(255,255,255,.1)",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {officeLogoUrl ? (
                    // objectFit:"contain" (2026-10-02, reportado por Gunnar: "se
                    // ve cortado, como que quedó muy grande") -- un logo
                    // rectangular/wordmark con "cover" se recorta a la fuerza
                    // contra este círculo; "contain" + un respiro interno
                    // siempre muestra el logo completo, nunca lo corta.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={officeLogoUrl} alt="" style={{ width: "78%", height: "78%", objectFit: "contain" }} />
                  ) : (
                    <>
                      <Sweep />
                      <svg
                        viewBox="0 0 100 100"
                        style={{
                          width: `${56 * liveSizeConfig.logo}px`,
                          height: `${56 * liveSizeConfig.logo}px`,
                          animation: "emblemFloat 3s ease-in-out infinite",
                          filter: "drop-shadow(0 2px 8px rgba(var(--accentRgb,200,161,90),.5))",
                        }}
                        fill="none"
                      >
                        <defs>
                          <linearGradient id="jgg" gradientUnits="userSpaceOnUse" x1="10" x2="90" y1="10" y2="90">
                            <stop offset="0%" stopColor="#FFFFFF" />
                            <stop offset="25%" stopColor="#FFF0CA" />
                            <stop offset="55%" stopColor="var(--accentMid,#D4AF37)" />
                            <stop offset="85%" stopColor="var(--accentDeep,#99732B)" />
                            <stop offset="100%" stopColor="var(--accentLight,#E5C378)" />
                          </linearGradient>
                          <radialGradient id="orbg" cx="50%" cy="40%" r="60%">
                            <stop offset="0%" stopColor="#FFFFFF" />
                            <stop offset="50%" stopColor="#FFE6A3" />
                            <stop offset="100%" stopColor="var(--accentMid,#C8A15A)" />
                          </radialGradient>
                        </defs>
                        <path d="M14 74 C 32 47, 68 47, 86 74" stroke="url(#jgg)" strokeLinecap="round" strokeWidth="6.2" />
                        <path d="M23 74 V 64 M34 74 V 58 M46 74 V 53 M58 74 V 53 M70 74 V 58 M81 74 V 64" stroke="#F0D38D" strokeLinecap="round" strokeWidth="3.2" />
                        <path d="M48 20 C 43 36, 27 52, 18 70 C 28 70, 56 63, 82 72" stroke="url(#jgg)" strokeLinecap="round" strokeWidth="6" />
                        <circle cx="50" cy="49" r="4.8" fill="url(#orbg)" stroke="#FFFFFF" strokeWidth="1.4" />
                      </svg>
                    </>
                  )}
                </span>
              </button>
              <SocialDock channels={["li", "yt", "web"]} card={socialCard} tone="ruby" />
            </div>
          </div>

          {/* Quote + story + socials */}
          <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "clamp(6px,1dvh,12px)" }}>
            {/* Tarjeta personalizada por destinatario (2026-10-02, PASO 1,
                corregido): va acá, en el lugar de la frase/lema -- no un
                cartel aparte arriba de la foto. Sin line-clamp (a diferencia
                de card.quote, que sí lo tiene) porque el mensaje de
                bienvenida es mucho más largo que un lema corto. */}
            {recipient ? (
              <p
                style={{
                  margin: 0,
                  padding: "0 16px",
                  font: "italic 400 clamp(12px,2.6dvh,15px)/1.4 var(--brandFont,'Playfair Display'),serif",
                  letterSpacing: ".01em",
                  color: "var(--ink2,var(--ink2,#C2BEB5))",
                }}
              >
                Hola, {recipient.nombre}. Gracias por tu interés en el Programa Legacy. Esta tarjeta está personalizada
                para ti, a partir de la información que compartiste con nosotros. Bienvenido.
              </p>
            ) : (
              <p
                style={{
                  margin: 0,
                  padding: "0 16px",
                  font: "italic 400 clamp(12px,2.6dvh,15px)/1.4 var(--brandFont,'Playfair Display'),serif",
                  letterSpacing: ".01em",
                  color: "var(--ink2,var(--ink2,#C2BEB5))",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {card.quote}
              </p>
            )}
            {/* -20% (2026-09-17, pedido de Gunnar) */}
            <button
              type="button"
              onClick={() => setModal("story")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: `calc(clamp(5px,0.8dvh,7px) * ${liveSizeConfig.storyBtn}) ${13 * liveSizeConfig.storyBtn}px`,
                borderRadius: 999,
                background: "var(--surf,#141414)",
                border: "1px solid var(--line2,rgba(var(--accentRgb,200,161,90),.4))",
                color: "var(--goldtxt,#E5C378)",
                fontWeight: 600,
                fontSize: `${9 * liveSizeConfig.storyBtn}px`,
                fontFamily: "var(--brandFont,'Plus Jakarta Sans'),sans-serif",
                letterSpacing: ".14em",
                textTransform: "uppercase",
                cursor: "pointer",
                boxShadow: "0 2px 10px rgba(0,0,0,.25)",
              }}
            >
              <span style={{ color: "var(--accentMid,#C8A15A)" }}>✦</span>
              <span>{L(isProject ? "storyBtn" : isCompany ? "storyBtnCompany" : "storyBtnPersonal")}</span>
              <Icon name="north_east" size={Math.round(12 * liveSizeConfig.storyBtn)} style={{ opacity: 0.8 }} />
            </button>
          </div>

          {/* Cubes: left (info/save-contact) / QR (large) / right (invite/message) */}
          <div style={{ flex: "0 0 auto", display: "flex", alignItems: "flex-end", justifyContent: "center", gap: "clamp(10px,3dvw,18px)" }}>
            {isPersonal ? (
              <a href={`/c/${card.slug}/vcard`} download style={CUBE_MEDIUM} aria-label={t(lang, "vcardBtn")}>
                <Icon name="contact_page" size={22} />
                <span style={CUBE_LABEL}>{t(lang, "vcardBtn")}</span>
              </a>
            ) : recipient ? (
              // PASO 4 (2026-10-02): con destinatario, este cubo se
              // renombra a "Info [nombre]" y abre el contenido nuevo
              // (gate de palabra secreta + dossier) en vez del de
              // siempre -- ver modal === "info" && recipient más abajo.
              <button type="button" onClick={() => setModal("info")} style={CUBE_MEDIUM} aria-label={`Info ${recipient.nombre}`}>
                <Icon name="diamond" size={22} />
                <span style={CUBE_LABEL}>{`Info ${recipient.nombre}`}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setModal("info")}
                style={CUBE_MEDIUM}
                aria-label={L(isCompany ? "companyInfoBtn" : "infoBtn")}
              >
                <Icon name={isCompany ? "storefront" : "diamond"} size={22} />
                <span style={CUBE_LABEL}>{L(isCompany ? "companyInfoBtn" : "infoBtn")}</span>
              </button>
            )}

            {/* QR area, unified across the 3 kinds (2026-09-16): the owner
                sees their real QR and taps it to send it over WhatsApp
                (simulated); anyone else sees a "Create your Legacy Card"
                funnel instead of a scannable code. Replaces the old
                project-only split (a dev-testing "simulate scan" shortcut
                for the host, a copy-link button for company/personal). */}
            {isHost ? (
              <button
                type="button"
                onClick={() => setQrSendOpen(true)}
                aria-label="Enviar QR por WhatsApp"
                style={{
                  position: "relative",
                  flex: "none",
                  padding: 10,
                  borderRadius: 20,
                  background: "var(--qrbg,rgba(20,20,20,.95))",
                  border: "1px solid var(--line2,rgba(212,175,55,.55))",
                  boxShadow: "0 12px 36px rgba(0,0,0,.85)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <span style={{ position: "absolute", top: 7, left: 7, width: 16, height: 16, borderTop: "2px solid var(--accentMid,#D4AF37)", borderLeft: "2px solid var(--accentMid,#D4AF37)", borderRadius: "6px 0 0 0" }} />
                <span style={{ position: "absolute", top: 7, right: 7, width: 16, height: 16, borderTop: "2px solid var(--accentMid,#D4AF37)", borderRight: "2px solid var(--accentMid,#D4AF37)", borderRadius: "0 6px 0 0" }} />
                <span style={{ position: "absolute", bottom: 7, left: 7, width: 16, height: 16, borderBottom: "2px solid var(--accentMid,#D4AF37)", borderLeft: "2px solid var(--accentMid,#D4AF37)", borderRadius: "0 0 0 6px" }} />
                <span style={{ position: "absolute", bottom: 7, right: 7, width: 16, height: 16, borderBottom: "2px solid var(--accentMid,#D4AF37)", borderRight: "2px solid var(--accentMid,#D4AF37)", borderRadius: "0 0 6px 0" }} />
                <div
                  style={{ width: "clamp(calc(84px*var(--scale-qrBtn,1)),calc(15dvh*var(--scale-qrBtn,1)),calc(140px*var(--scale-qrBtn,1)))", height: "clamp(calc(84px*var(--scale-qrBtn,1)),calc(15dvh*var(--scale-qrBtn,1)),calc(140px*var(--scale-qrBtn,1)))", background: "#fff", borderRadius: 8, padding: 6 }}
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
              </button>
            ) : (
              <Link
                href={`/m/login?ref=${card.slug}`}
                aria-label={L("createCardBtn")}
                style={{
                  position: "relative",
                  flex: "none",
                  width: "clamp(calc(84px*var(--scale-qrBtn,1)),calc(15dvh*var(--scale-qrBtn,1)),calc(140px*var(--scale-qrBtn,1)))",
                  height: "clamp(calc(84px*var(--scale-qrBtn,1)),calc(15dvh*var(--scale-qrBtn,1)),calc(140px*var(--scale-qrBtn,1)))",
                  borderRadius: 20,
                  background: "linear-gradient(160deg,var(--accentLight,#E5C378),var(--accentMid,#C8A15A) 55%,var(--accentDeep,#99732B))",
                  border: "1px solid rgba(255,230,163,.5)",
                  boxShadow: "0 12px 36px rgba(var(--accentRgb,200,161,90),.45)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: 10,
                  color: "var(--onAccent,#141414)",
                  textDecoration: "none",
                }}
              >
                <Icon name="add_card" size={32} />
                <span
                  style={{
                    font: "800 10.5px var(--brandFont,'Plus Jakarta Sans'),sans-serif",
                    letterSpacing: ".07em",
                    textTransform: "uppercase",
                    textAlign: "center",
                    lineHeight: 1.25,
                  }}
                >
                  {L("createCardBtn")}
                </span>
              </Link>
            )}

            {isPersonal ? (
              <button type="button" onClick={() => setModal("contactMessage")} style={CUBE_MEDIUM_ALT} aria-label={t(lang, "sendMessageBtn")}>
                <Icon name="chat" size={22} />
                <span style={CUBE_LABEL}>{t(lang, "sendMessageBtn")}</span>
              </button>
            ) : recipient ? (
              // PASO 5 (2026-10-02): con destinatario, este cubo pasa a
              // ser "Deja tu Legado" -- el Documento de Bienvenida.
              <button type="button" onClick={() => setModal("legado")} style={CUBE_MEDIUM_ALT} aria-label="Deja tu Legado">
                <Icon name="auto_stories" size={22} />
                <span style={CUBE_LABEL}>Deja tu Legado</span>
              </button>
            ) : isHost ? (
              // El panel de Destinatarios (Thread C) es gestión interna
              // -- antes se veía igual para cualquier visitante anónimo,
              // ahora queda atrás de isHost (hallazgo al armar PASO 5,
              // ver PLAN.md).
              <button type="button" onClick={() => setModal("invite")} style={CUBE_MEDIUM_ALT} aria-label={L("inviteBtn")}>
                <Icon name="mail" size={22} />
                <span style={CUBE_LABEL}>{L("inviteBtn")}</span>
              </button>
            ) : (
              <button type="button" onClick={() => setModal("contactMessage")} style={CUBE_MEDIUM_ALT} aria-label={t(lang, "sendMessageBtn")}>
                <Icon name="chat" size={22} />
                <span style={CUBE_LABEL}>{t(lang, "sendMessageBtn")}</span>
              </button>
            )}
          </div>

          {/* Schedule CTA — project books an interview, company books a meeting,
              personal books a coffee. Used to skip personal entirely; now on
              all 3 kinds (2026-09-16), each with its own copy. */}
          {/* -30% (2026-09-17, pedido de Gunnar) */}
          {/* marginTop:"auto" (2026-10-02, reportado por Gunnar en iPhone 13:
              "la tarjeta en la parte de abajo tiene un espacio considerable")
              -- confirmado con screenshot real a 390x844: el tope de altura
              de la foto (línea ~895, fix del 2026-09-29) evita que el hueco
              parta el medio de la tarjeta, como quería ese fix, pero deja
              el sobrante VACÍO después de este botón. Siendo el último
              elemento de la columna, marginTop:"auto" absorbe ese sobrante
              empujando el botón al borde real de abajo -- el CTA principal
              queda siempre anclado ahí, nunca flotando sobre un vacío. */}
          <div style={{ flex: "0 0 auto", width: "100%", marginTop: "auto" }}>
            <button
              type="button"
              onClick={() => setScheduleOpen(true)}
              style={{
                width: "100%",
                padding: `calc(clamp(6px,1.1dvh,10px) * ${liveSizeConfig.scheduleBtn}) 14px`,
                border: "1px solid rgba(255,230,163,.45)",
                borderRadius: 16,
                background: "linear-gradient(90deg,var(--accentLight,#E5C378),var(--accentMid,#C8A15A) 50%,var(--accentDeep,#99732B))",
                color: "var(--onAccent,#141414)",
                fontWeight: 800,
                fontSize: `${9 * liveSizeConfig.scheduleBtn}px`,
                fontFamily: "var(--brandFont,'Plus Jakarta Sans'),sans-serif",
                letterSpacing: ".16em",
                textTransform: "uppercase",
                boxShadow: "0 6px 22px rgba(var(--accentRgb,200,161,90),.42)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                cursor: "pointer",
              }}
            >
              <Icon name="event" size={Math.round(13 * liveSizeConfig.scheduleBtn)} />
              <span>
                {L(
                  isProject
                    ? isHost
                      ? "scheduleBtnHost"
                      : "scheduleBtn"
                    : isCompany
                    ? isHost
                      ? "meetingBtnHost"
                      : "meetingBtn"
                    : isHost
                    ? "coffeeBtnHost"
                    : "coffeeBtn"
                )}
              </span>
            </button>
          </div>
        </div>

        {/* Modal */}
        {modal && activeModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 60,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              padding: "0 12px",
              background: "rgba(0,0,0,.8)",
              backdropFilter: "blur(2px)",
            }}
          >
            <div onClick={closeModal} style={{ position: "absolute", inset: 0 }} />
            <div
              style={{
                position: "relative",
                width: "100%",
                maxWidth: 406,
                // La bitácora de versiones (2026-09-19, pedido de Gunnar) es
                // la única que necesita el modal entero más chico — un 50%
                // menos de alto (44vh en vez de 88vh) — porque de acá en
                // más solo su propia lista de versiones scrollea adentro
                // (overflowY:hidden acá afuera), no todo el modal.
                maxHeight: modal === "versionInfo" ? "44vh" : "88vh",
                overflowY: modal === "versionInfo" ? "hidden" : "auto",
                background: "linear-gradient(180deg,var(--surfHi,#1C1C1C),var(--deepBg,#0D0D0D))",
                border: "1px solid rgba(var(--accentRgb,200,161,90),.4)",
                borderBottom: "none",
                borderRadius: "24px 24px 0 0",
                padding: "22px 22px 28px",
                boxShadow: "0 -10px 45px rgba(0,0,0,.95)",
                display: "flex",
                flexDirection: "column",
                gap: 14,
                animation: "modalIn .25s ease-out",
              }}
            >
              <span style={{ width: 48, height: 5, borderRadius: 999, background: "rgba(var(--accentRgb,200,161,90),.4)", margin: "0 auto" }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon name={activeModal.icon} style={{ color: "var(--accentMid,#C8A15A)" }} />
                  <span style={{ font: "700 11px var(--brandFont,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".2em", textTransform: "uppercase", color: "var(--accentLight,#E5C378)" }}>
                    {activeModal.kicker}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  aria-label="Cerrar"
                  style={{ width: 32, height: 32, borderRadius: 999, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", color: "var(--ink2,#C2BEB5)", cursor: "pointer", flex: "none" }}
                >
                  ✕
                </button>
              </div>

              {modal === "info" && recipient ? (
                // PASO 4 (2026-10-02) -- "Info [nombre]": contenido
                // nuevo, solo con destinatario. Gate de palabra secreta
                // primero (si el destinatario tiene una configurada),
                // dossier + Códice después. Nunca toca el "info"
                // original de abajo (sin destinatario, no cambia).
                !infoContentVisible ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <p style={{ margin: 0, font: "400 12.5px/1.75 var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--ink2,#C2BEB5)" }}>
                      Esta sección está protegida. Ingresá la palabra secreta que te compartimos para ver tu información.
                    </p>
                    <input
                      value={infoSecretInput}
                      onChange={(e) => setInfoSecretInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && submitInfoSecret()}
                      placeholder="Palabra secreta"
                      style={{ background: "var(--deepBg,#0D0D0D)", border: "1px solid rgba(var(--accentRgb,200,161,90),.3)", borderRadius: 10, padding: "11px 14px", color: "var(--ink,#F5F2EB)", font: "400 14px var(--brandFont,'Plus Jakarta Sans'),sans-serif", outline: "none" }}
                    />
                    {infoSecretError && <span style={{ font: "600 11px var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "#e5928a" }}>{infoSecretError}</span>}
                    <button
                      type="button"
                      onClick={submitInfoSecret}
                      style={{
                        width: "100%",
                        padding: 14,
                        border: "none",
                        borderRadius: 12,
                        background: "linear-gradient(90deg,var(--accentLight,#E5C378),var(--accentMid,#C8A15A) 50%,var(--accentDeep,#99732B))",
                        color: "var(--deepBg,#0D0D0D)",
                        font: "700 12.5px var(--brandFont,'Plus Jakarta Sans'),sans-serif",
                        letterSpacing: ".12em",
                        textTransform: "uppercase",
                        cursor: "pointer",
                      }}
                    >
                      Continuar
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                    <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <h4 style={{ margin: 0, font: "600 13px var(--brandFont,'Playfair Display'),serif", color: "var(--accentLight,#E5C378)" }}>
                        Qué información usamos
                      </h4>
                      {recipient.sources.length === 0 ? (
                        <p style={{ margin: 0, font: "400 11.5px/1.6 var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--ink2,#8a8378)" }}>
                          Todavía no cargamos fuentes para tu perfil.
                        </p>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {recipient.sources.map((s) => (
                            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8, background: "rgba(0,0,0,.25)" }}>
                              <Icon name={s.type === "link" ? "link" : s.type === "archivo" ? "attach_file" : "notes"} size={14} style={{ color: "var(--accentMid,#C8A15A)", flexShrink: 0 }} />
                              <span style={{ flex: "none", font: "700 9.5px var(--brandFont,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".04em", textTransform: "uppercase", color: "var(--accentMid,#C8A15A)" }}>
                                {s.type === "link" ? "Link" : s.type === "archivo" ? "Archivo" : "Nota"}
                              </span>
                              <span style={{ flex: 1, minWidth: 0, font: "400 11px var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--ink2,#C2BEB5)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {s.label || (s.type === "texto" ? s.value.slice(0, 40) : s.value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>

                    <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <h4 style={{ margin: 0, font: "600 13px var(--brandFont,'Playfair Display'),serif", color: "var(--accentLight,#E5C378)" }}>
                        Cómo la usamos
                      </h4>
                      <p style={{ margin: 0, font: "400 12px/1.7 var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--ink2,#C2BEB5)" }}>
                        [PLACEHOLDER] Usamos esta información únicamente para construir tu Códice -- la base de
                        conocimiento privada de tu Gemelo Digital. No se comparte con terceros ni se usa para otro fin.
                      </p>
                    </section>

                    <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <h4 style={{ margin: 0, font: "600 13px var(--brandFont,'Playfair Display'),serif", color: "var(--accentLight,#E5C378)" }}>
                        Nuestra metodología
                      </h4>
                      <p style={{ margin: 0, whiteSpace: "pre-line", font: "400 12px/1.7 var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--ink2,#C2BEB5)" }}>
                        {CODICE_METHODOLOGY_TEXT}
                      </p>
                    </section>

                    <a
                      href="/docs/codice-ejemplo.pdf"
                      target="_blank"
                      rel="noopener"
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, background: "var(--surf,#141414)", border: "1px solid rgba(var(--accentRgb,200,161,90),.25)", textDecoration: "none" }}
                    >
                      <Icon name="picture_as_pdf" size={20} style={{ color: "var(--accentMid,#C8A15A)" }} />
                      <span style={{ flex: 1, font: "700 11.5px var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--ink,#F5F2EB)" }}>Ver PDF de ejemplo de tu Códice</span>
                      <span style={{ flex: "none", padding: "2px 8px", borderRadius: 5, background: "rgba(0,0,0,.4)", border: "1px solid rgba(255,255,255,.15)", font: "700 9px var(--brandFont,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink2,#8a8378)" }}>
                        Ejemplo
                      </span>
                    </a>

                    {recipient.cuadernoUrl && (
                      <a
                        href={recipient.cuadernoUrl}
                        target="_blank"
                        rel="noopener"
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 13, borderRadius: 12, border: "1px solid rgba(var(--accentRgb,200,161,90),.4)", color: "var(--accentLight,#E5C378)", font: "700 11.5px var(--brandFont,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".06em", textTransform: "uppercase", textDecoration: "none" }}
                      >
                        <Icon name="menu_book" size={18} />
                        Abrir mi cuaderno
                      </a>
                    )}

                    <section style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 4, borderTop: "1px solid rgba(255,255,255,.08)" }}>
                      <h4 style={{ margin: 0, font: "600 13px var(--brandFont,'Playfair Display'),serif", color: "var(--accentLight,#E5C378)" }}>
                        Tu información es tuya
                      </h4>
                      <p style={{ margin: 0, font: "400 12px/1.7 var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--ink2,#C2BEB5)" }}>
                        {CODICE_PRIVACY_TEXT}
                      </p>
                      {socialHref("wa", card.wa) && (
                        <a
                          href={`${socialHref("wa", card.wa)}?text=${encodeURIComponent(`Hola, soy ${recipient.nombre}. Quiero pedir que borren mi información del Códice.`)}`}
                          target="_blank"
                          rel="noopener"
                          style={{ font: "700 11px var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "#e5928a", textDecoration: "underline", alignSelf: "flex-start" }}
                        >
                          Pedir que borren mi información
                        </a>
                      )}
                    </section>

                    <Link
                      href="/onboarding"
                      style={{
                        width: "100%",
                        padding: 14,
                        borderRadius: 12,
                        background: "linear-gradient(90deg,var(--accentLight,#E5C378),var(--accentMid,#C8A15A) 50%,var(--accentDeep,#99732B))",
                        color: "var(--deepBg,#0D0D0D)",
                        font: "700 12.5px var(--brandFont,'Plus Jakarta Sans'),sans-serif",
                        letterSpacing: ".12em",
                        textTransform: "uppercase",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        textDecoration: "none",
                      }}
                    >
                      <Icon name="auto_awesome" size={18} />
                      Crear mi Gemelo Digital
                    </Link>
                  </div>
                )
              ) : modal === "info" && isProject ? (
                <>
                  <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", borderRadius: 16, overflow: "hidden", border: "1px solid rgba(var(--accentRgb,200,161,90),.4)", background: "#000" }}>
                    {card.videoThumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={card.videoThumbnailUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : null}
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                      <span style={{ width: 56, height: 56, borderRadius: 999, padding: 2, background: "linear-gradient(45deg,var(--accentDeep,#99732B),var(--accentMid,#C8A15A),var(--accentLight,#E5C378))", boxShadow: "0 0 25px rgba(var(--accentRgb,200,161,90),.8)", display: "flex" }}>
                        <span style={{ width: "100%", height: "100%", borderRadius: 999, background: "rgba(0,0,0,.8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Icon name="play_arrow" size={26} style={{ color: "var(--accentLight,#E5C378)", marginLeft: 3 }} />
                        </span>
                      </span>
                    </div>
                    <div style={{ position: "absolute", bottom: 10, left: 12, right: 12, display: "flex", alignItems: "center", justifyContent: "space-between", pointerEvents: "none" }}>
                      <span style={{ padding: "2px 8px", borderRadius: 5, background: "rgba(0,0,0,.7)", border: "1px solid rgba(255,255,255,.2)", font: "600 10px var(--brandFont,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink,#F5F2EB)" }}>
                        {t(lang, "infoTag")}
                      </span>
                      <span style={{ font: "600 10px var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--accentLight,#E5C378)" }}>4K ULTRA HD</span>
                    </div>
                  </div>
                  <h3 style={{ margin: 0, font: "600 17px var(--brandFont,'Playfair Display'),serif", color: "var(--accentLight,#E5C378)" }}>{L("infoTitle")}</h3>
                  <p style={{ margin: 0, font: "400 12.5px/1.75 var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--ink2,#C2BEB5)" }}>{t(lang, "infoP1")}</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
                    {[
                      ["token", t(lang, "pil1"), t(lang, "pil1s")],
                      ["groups", t(lang, "pil2"), t(lang, "pil2s")],
                      ["shield_with_heart", t(lang, "pil3"), t(lang, "pil3s")],
                    ].map(([icon, label, sub]) => (
                      <div key={icon} style={{ padding: "11px 8px", borderRadius: 12, background: "var(--surf,#141414)", border: "1px solid rgba(var(--accentRgb,200,161,90),.25)", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, textAlign: "center" }}>
                        <Icon name={icon} style={{ color: "var(--accentMid,#C8A15A)" }} />
                        <span style={{ font: "700 10px var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--ink,#F5F2EB)" }}>{label}</span>
                        <span style={{ font: "400 9px var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--ink2,#C2BEB5)" }}>{sub}</span>
                      </div>
                    ))}
                  </div>
                  <p style={{ margin: 0, font: "400 12.5px/1.75 var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--ink2,#C2BEB5)" }}>
                    {t(lang, "infoP2", { name: card.name })}
                  </p>
                  <a
                    href={
                      socialHref("wa", card.wa) ||
                      "#"
                    }
                    target="_blank"
                    rel="noopener"
                    style={{
                      width: "100%",
                      padding: 14,
                      borderRadius: 12,
                      background: "linear-gradient(90deg,var(--accentLight,#E5C378),var(--accentMid,#C8A15A) 50%,var(--accentDeep,#99732B))",
                      color: "var(--deepBg,#0D0D0D)",
                      font: "700 12.5px var(--brandFont,'Plus Jakarta Sans'),sans-serif",
                      letterSpacing: ".12em",
                      textTransform: "uppercase",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <Icon name="forum" size={18} />
                    <span>{t(lang, "infoCta", { name: card.name })}</span>
                  </a>
                </>
              ) : modal === "legado" && recipient ? (
                // PASO 5 (2026-10-02) -- Documento de Bienvenida, calcado
                // de la estructura real del de Rafael Rico Carrascosa.
                // Ver comentario arriba de LEGADO_CAP_1 para qué quedó
                // fijo y qué quedó [PLACEHOLDER].
                <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, textAlign: "center", paddingBottom: 10, borderBottom: "1px solid rgba(var(--accentRgb,200,161,90),.25)" }}>
                    <span style={{ font: "700 9.5px var(--brandFont,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".2em", textTransform: "uppercase", color: "var(--ink2,#8a8378)" }}>
                      Documento de Bienvenida · Edición Personal
                    </span>
                    <h3 style={{ margin: "4px 0 0", font: "600 20px var(--brandFont,'Playfair Display'),serif", color: "var(--accentLight,#E5C378)" }}>
                      LEGACY <span style={{ opacity: 0.6, fontWeight: 400 }}>by EinarOS</span>
                    </h3>
                    <span style={{ font: "400 11.5px var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--ink2,#C2BEB5)" }}>
                      Preparado exclusivamente para {recipient.nombre}
                    </span>
                    <span style={{ font: "600 10px var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--ink2,#8a8378)" }}>[PLACEHOLDER: título/rol de {recipient.nombre}]</span>
                    <span style={{ marginTop: 8, font: "italic 400 12px var(--brandFont,'Playfair Display'),serif", color: "var(--ink2,#C2BEB5)" }}>La experiencia se convierte en legado.</span>
                    <span style={{ font: "500 9px var(--brandFont,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink2,#8a8378)" }}>
                      EinarOS v3.0 · Programa Legacy · {new Date().toLocaleDateString("es", { month: "long", year: "numeric" }).toUpperCase()}
                    </span>
                  </div>

                  <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <span style={{ font: "700 9.5px var(--brandFont,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".18em", textTransform: "uppercase", color: "var(--accentMid,#C8A15A)" }}>
                      Carta de apertura
                    </span>
                    <p style={{ margin: 0, font: "600 13px var(--brandFont,'Playfair Display'),serif", color: "var(--ink,#F5F2EB)" }}>{recipient.nombre},</p>
                    {legadoCartaParagraphs(recipient.nombre).map((p, i) => (
                      <p key={i} style={{ margin: 0, font: "400 12px/1.75 var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: p.startsWith("[PLACEHOLDER]") ? "var(--ink2,#8a8378)" : "var(--ink2,#C2BEB5)", fontStyle: p.startsWith("[PLACEHOLDER]") ? "italic" : "normal" }}>
                        {p}
                      </p>
                    ))}
                    <p style={{ margin: "6px 0 0", font: "600 11.5px var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--ink,#F5F2EB)" }}>
                      Gunnar Pareja Ballivián
                      <br />
                      <span style={{ font: "400 9.5px var(--brandFont,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".06em", textTransform: "uppercase", color: "var(--ink2,#8a8378)" }}>
                        Arquitecto de EinarOS · Dirección del Programa Legacy
                      </span>
                    </p>
                  </section>

                  {[LEGADO_CAP_1, LEGADO_CAP_2, LEGADO_CAP_3, LEGADO_CAP_4].map((cap) => (
                    <section key={cap.num} style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,.08)" }}>
                      <span style={{ font: "700 9.5px var(--brandFont,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".18em", textTransform: "uppercase", color: "var(--accentMid,#C8A15A)" }}>
                        {cap.kicker}
                      </span>
                      <h4 style={{ margin: 0, font: "600 14px var(--brandFont,'Playfair Display'),serif", color: "var(--accentLight,#E5C378)" }}>{cap.title}</h4>
                      {cap.paragraphs.map((p, i) => (
                        <p key={i} style={{ margin: 0, whiteSpace: "pre-line", font: "400 12px/1.75 var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--ink2,#C2BEB5)" }}>
                          {p}
                        </p>
                      ))}
                    </section>
                  ))}

                  <section style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,.08)" }}>
                    <span style={{ font: "700 9.5px var(--brandFont,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".18em", textTransform: "uppercase", color: "var(--accentMid,#C8A15A)" }}>
                      Capítulo V
                    </span>
                    <h4 style={{ margin: 0, font: "600 14px var(--brandFont,'Playfair Display'),serif", color: "var(--accentLight,#E5C378)" }}>Qué esperar en cada sesión</h4>
                    <p style={{ margin: 0, font: "400 12px/1.75 var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--ink2,#C2BEB5)" }}>
                      Cada encuentro dura 45 minutos exactos y se graba con transcripción automática. No hay preguntas trampa ni exámenes: es una conversación dirigida con un objetivo definido.
                    </p>
                    {legadoSesiones(recipient.nombre).map((s, idx) => (
                      <div key={s.num} style={{ display: "flex", flexDirection: "column", gap: 4, padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)" }}>
                        <span style={{ font: "700 9px var(--brandFont,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".12em", textTransform: "uppercase", color: "var(--accentMid,#C8A15A)" }}>
                          {s.num} · {s.semana} -- {s.capa}
                        </span>
                        <span style={{ font: "600 12px var(--brandFont,'Playfair Display'),serif", color: "var(--ink,#F5F2EB)" }}>{s.titulo}</span>
                        <p style={{ margin: 0, font: `${s.cuerpo.startsWith("[PLACEHOLDER]") ? "italic" : "normal"} 400 11.5px/1.65 var(--brandFont,'Plus Jakarta Sans'),sans-serif`, color: s.cuerpo.startsWith("[PLACEHOLDER]") ? "var(--ink2,#8a8378)" : "var(--ink2,#C2BEB5)" }}>
                          {s.cuerpo}
                        </p>
                        <span style={{ font: "400 10.5px/1.5 var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--ink2,#8a8378)" }}>
                          <b>Usted trae:</b> {s.trae}
                        </span>
                        <span style={{ font: "400 10.5px/1.5 var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--ink2,#8a8378)" }}>
                          <b>Queda construido:</b> {s.queda}
                        </span>
                        {idx === 2 && (
                          <p style={{ margin: "4px 0 0", font: "italic 400 11px/1.6 var(--brandFont,'Playfair Display'),serif", color: "var(--accentLight,#E5C378)" }}>{LEGADO_TRES_PRIMERAS}</p>
                        )}
                      </div>
                    ))}
                    <p style={{ margin: 0, font: "400 12px/1.75 var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--ink2,#C2BEB5)" }}>{LEGADO_ENTRE_SESIONES}</p>
                  </section>

                  <section style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,.08)" }}>
                    <span style={{ font: "700 9.5px var(--brandFont,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".18em", textTransform: "uppercase", color: "var(--accentMid,#C8A15A)" }}>
                      Capítulo VI
                    </span>
                    <h4 style={{ margin: 0, font: "600 14px var(--brandFont,'Playfair Display'),serif", color: "var(--accentLight,#E5C378)" }}>Del Códice al negocio</h4>
                    <p style={{ margin: 0, font: "400 12px/1.75 var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--ink2,#C2BEB5)" }}>{LEGADO_CAP_6_INTRO}</p>
                    <p style={{ margin: 0, fontStyle: "italic", font: "italic 400 12px/1.75 var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--ink2,#8a8378)" }}>{legadoCap6Placeholder(recipient.nombre)}</p>
                    <p style={{ margin: 0, font: "400 12px/1.75 var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--ink2,#C2BEB5)" }}>{LEGADO_CAP_6_CIERRE}</p>
                    <span style={{ marginTop: 4, font: "700 9.5px var(--brandFont,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink2,#8a8378)" }}>Estructura propuesta</span>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "9px 11px", borderRadius: 10, background: "rgba(var(--accentRgb,200,161,90),.08)", border: "1px solid rgba(var(--accentRgb,200,161,90),.25)" }}>
                      <span style={{ font: "700 10.5px var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--accentLight,#E5C378)" }}>Dirección -- {recipient.nombre}</span>
                      <span style={{ font: "400 11px/1.6 var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--ink2,#C2BEB5)" }}>Usted define doctrina, aprueba contenido y marca el rumbo. Deja de operar y pasa a dirigir.</span>
                    </div>
                    {LEGADO_ROLES.map((r) => (
                      <div key={r.rol} style={{ display: "flex", flexDirection: "column", gap: 3, padding: "9px 11px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)" }}>
                        <span style={{ font: "700 10.5px var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--ink,#F5F2EB)" }}>{r.rol}</span>
                        <span style={{ font: "400 11px/1.6 var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--ink2,#C2BEB5)" }}>{r.desc}</span>
                      </div>
                    ))}
                    <p style={{ margin: 0, font: "400 12px/1.75 var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--ink2,#C2BEB5)" }}>{LEGADO_CAP_6_CIERRE_FINAL}</p>
                  </section>

                  {[LEGADO_CAP_7, LEGADO_ANTES].map((cap) => (
                    <section key={cap.kicker} style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,.08)" }}>
                      <span style={{ font: "700 9.5px var(--brandFont,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".18em", textTransform: "uppercase", color: "var(--accentMid,#C8A15A)" }}>
                        {cap.kicker}
                      </span>
                      <h4 style={{ margin: 0, font: "600 14px var(--brandFont,'Playfair Display'),serif", color: "var(--accentLight,#E5C378)" }}>{cap.title}</h4>
                      {cap.paragraphs.map((p, i) => (
                        <p key={i} style={{ margin: 0, whiteSpace: "pre-line", font: "400 12px/1.75 var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--ink2,#C2BEB5)" }}>
                          {p}
                        </p>
                      ))}
                    </section>
                  ))}

                  <div style={{ textAlign: "center", paddingTop: 14, borderTop: "1px solid rgba(var(--accentRgb,200,161,90),.25)" }}>
                    <span style={{ font: "500 9px var(--brandFont,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".12em", textTransform: "uppercase", color: "var(--ink2,#8a8378)" }}>
                      Legacy by EinarOS · EinarOS v3.0 · Documento de Bienvenida · Edición {recipient.nombre}
                    </span>
                  </div>
                </div>
              ) : modal === "invite" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <p style={{ margin: 0, font: "400 12px/1.6 var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--ink2,#C2BEB5)" }}>
                    Cada destinatario tiene su propio link personalizado -- tocá &quot;Abrir&quot; para entrar directo a su tarjeta. Sumale fuentes (links, archivos, notas) para armar su perfil después.
                  </p>

                  {recipients.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {recipients.map((r) => {
                        const open = openRecipientId === r.id;
                        return (
                          <div key={r.id} style={{ borderRadius: 12, background: "rgba(255,255,255,.04)", border: "1px solid rgba(var(--accentRgb,200,161,90),.2)", overflow: "hidden" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px" }}>
                              <button
                                type="button"
                                onClick={() => setOpenRecipientId(open ? null : r.id)}
                                style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
                              >
                                <span style={{ font: "700 13px var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--ink,#F5F2EB)" }}>{r.nombre}</span>
                                <span style={{ font: "400 10px var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--ink2,#8a8378)" }}>
                                  {r.sources.length} fuente{r.sources.length === 1 ? "" : "s"}
                                </span>
                              </button>
                              <a
                                href={`/c/${card.slug}?para=${r.slug}`}
                                style={{ flex: "none", padding: "7px 11px", borderRadius: 8, background: "var(--accentMid,#C8A15A)", color: "var(--deepBg,#0D0D0D)", font: "700 10px var(--brandFont,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".04em", textTransform: "uppercase", textDecoration: "none" }}
                              >
                                Abrir
                              </a>
                              <button
                                type="button"
                                onClick={() => removeRecipient(r.id)}
                                aria-label={`Borrar a ${r.nombre}`}
                                style={{ flex: "none", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", border: "none", borderRadius: 8, background: "none", color: "#e5928a", cursor: "pointer" }}
                              >
                                <Icon name="delete" size={15} />
                              </button>
                            </div>

                            {open && (
                              <div style={{ padding: "10px 12px 12px", display: "flex", flexDirection: "column", gap: 10, borderTop: "1px solid rgba(255,255,255,.06)" }}>
                                {/* PASO 4 (2026-10-02): palabra secreta del botón "Info
                                    [nombre]" + link de "Abrir mi cuaderno", editables por
                                    destinatario. Se guardan al salir del campo. */}
                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                  <span style={{ font: "500 9.5px var(--brandFont,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".14em", textTransform: "uppercase", color: "var(--ink2,#8a8378)" }}>
                                    Palabra secreta (Info {r.nombre})
                                  </span>
                                  <input
                                    value={r.palabraSecreta}
                                    onChange={(e) => updateRecipientLocal(r.id, { palabraSecreta: e.target.value })}
                                    onBlur={(e) => saveRecipientMeta(r.id, { palabraSecreta: e.target.value })}
                                    placeholder="Sin configurar -- se salta el gate"
                                    style={{ background: "var(--deepBg,#0D0D0D)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, padding: "9px 11px", color: "var(--ink,#F5F2EB)", font: "400 12px var(--brandFont,'Plus Jakarta Sans'),sans-serif", outline: "none" }}
                                  />
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                  <span style={{ font: "500 9.5px var(--brandFont,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".14em", textTransform: "uppercase", color: "var(--ink2,#8a8378)" }}>
                                    Link de su cuaderno
                                  </span>
                                  <input
                                    value={r.cuadernoUrl}
                                    onChange={(e) => updateRecipientLocal(r.id, { cuadernoUrl: e.target.value })}
                                    onBlur={(e) => saveRecipientMeta(r.id, { cuadernoUrl: e.target.value })}
                                    placeholder="https://... (vacío = botón oculto)"
                                    style={{ background: "var(--deepBg,#0D0D0D)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, padding: "9px 11px", color: "var(--ink,#F5F2EB)", font: "400 12px var(--brandFont,'Plus Jakarta Sans'),sans-serif", outline: "none" }}
                                  />
                                </div>

                                {r.sources.length > 0 && (
                                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                    {r.sources.map((s) => (
                                      <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8, background: "rgba(0,0,0,.25)" }}>
                                        <Icon name={s.type === "link" ? "link" : s.type === "archivo" ? "attach_file" : "notes"} size={14} style={{ color: "var(--accentMid,#C8A15A)", flexShrink: 0 }} />
                                        <span style={{ flex: 1, minWidth: 0, font: "400 11px var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--ink2,#C2BEB5)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                          {s.label || (s.type === "texto" ? s.value.slice(0, 40) : s.value)}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => removeSource(r.id, s.id)}
                                          aria-label="Borrar fuente"
                                          style={{ flex: "none", background: "none", border: "none", color: "#e5928a", cursor: "pointer", padding: 2, display: "flex" }}
                                        >
                                          <Icon name="close" size={13} />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                <div style={{ display: "flex", gap: 6 }}>
                                  {(["link", "archivo", "texto"] as const).map((ty) => (
                                    <button
                                      key={ty}
                                      type="button"
                                      onClick={() => setSourceType(ty)}
                                      style={{
                                        flex: 1,
                                        padding: "6px 0",
                                        borderRadius: 8,
                                        border: `1px solid ${sourceType === ty ? "var(--accentMid,#C8A15A)" : "rgba(255,255,255,.1)"}`,
                                        background: sourceType === ty ? "rgba(var(--accentRgb,200,161,90),.15)" : "none",
                                        color: sourceType === ty ? "var(--accentMid,#C8A15A)" : "var(--ink2,#8a8378)",
                                        font: "700 9.5px var(--brandFont,'Plus Jakarta Sans'),sans-serif",
                                        textTransform: "uppercase",
                                        letterSpacing: ".04em",
                                        cursor: "pointer",
                                      }}
                                    >
                                      {ty === "link" ? "Link" : ty === "archivo" ? "Archivo" : "Texto"}
                                    </button>
                                  ))}
                                </div>

                                <input
                                  value={sourceLabel}
                                  onChange={(e) => setSourceLabel(e.target.value)}
                                  placeholder="¿Qué es esto? (opcional)"
                                  style={{ background: "var(--deepBg,#0D0D0D)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, padding: "9px 11px", color: "var(--ink,#F5F2EB)", font: "400 12px var(--brandFont,'Plus Jakarta Sans'),sans-serif", outline: "none" }}
                                />

                                {sourceType === "link" && (
                                  <input
                                    value={sourceLinkValue}
                                    onChange={(e) => setSourceLinkValue(e.target.value)}
                                    placeholder="https://..."
                                    style={{ background: "var(--deepBg,#0D0D0D)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, padding: "9px 11px", color: "var(--ink,#F5F2EB)", font: "400 12px var(--brandFont,'Plus Jakarta Sans'),sans-serif", outline: "none" }}
                                  />
                                )}
                                {sourceType === "texto" && (
                                  <textarea
                                    value={sourceTextValue}
                                    onChange={(e) => setSourceTextValue(e.target.value)}
                                    placeholder="Escribí la nota acá..."
                                    rows={3}
                                    style={{ background: "var(--deepBg,#0D0D0D)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, padding: "9px 11px", color: "var(--ink,#F5F2EB)", font: "400 12px var(--brandFont,'Plus Jakarta Sans'),sans-serif", outline: "none", resize: "vertical" }}
                                  />
                                )}
                                {sourceType === "archivo" && (
                                  <input ref={sourceFileInputRef} type="file" style={{ font: "400 11px var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--ink2,#C2BEB5)" }} />
                                )}

                                <button
                                  type="button"
                                  onClick={() => submitAddSource(r.id)}
                                  disabled={addingSource}
                                  style={{
                                    padding: 10,
                                    border: "none",
                                    borderRadius: 8,
                                    background: "rgba(var(--accentRgb,200,161,90),.18)",
                                    color: "var(--accentMid,#C8A15A)",
                                    font: "700 10.5px var(--brandFont,'Plus Jakarta Sans'),sans-serif",
                                    letterSpacing: ".06em",
                                    textTransform: "uppercase",
                                    cursor: addingSource ? "default" : "pointer",
                                    opacity: addingSource ? 0.6 : 1,
                                  }}
                                >
                                  {addingSource ? "..." : "+ Agregar fuente"}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: recipients.length > 0 ? 6 : 0, borderTop: recipients.length > 0 ? "1px solid rgba(255,255,255,.08)" : "none" }}>
                    <span style={{ font: "500 10px var(--brandFont,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".16em", textTransform: "uppercase", color: "var(--ink2,#C2BEB5)" }}>
                      Nuevo destinatario
                    </span>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        value={newRecipientName}
                        onChange={(e) => setNewRecipientName(e.target.value)}
                        placeholder="Nombre (ej. Rogelio)"
                        style={{ flex: 1, minWidth: 0, background: "var(--deepBg,#0D0D0D)", border: "1px solid rgba(var(--accentRgb,200,161,90),.3)", borderRadius: 10, padding: "11px 14px", color: "var(--ink,#F5F2EB)", font: "400 14px var(--brandFont,'Plus Jakarta Sans'),sans-serif", outline: "none" }}
                      />
                      <button
                        type="button"
                        onClick={submitCreateRecipient}
                        disabled={creatingRecipient}
                        style={{
                          flex: "none",
                          padding: "0 16px",
                          border: "none",
                          borderRadius: 10,
                          background: "linear-gradient(90deg,var(--accentLight,#E5C378),var(--accentMid,#C8A15A) 50%,var(--accentDeep,#99732B))",
                          color: "var(--deepBg,#0D0D0D)",
                          font: "700 11px var(--brandFont,'Plus Jakarta Sans'),sans-serif",
                          letterSpacing: ".06em",
                          textTransform: "uppercase",
                          cursor: creatingRecipient ? "default" : "pointer",
                        }}
                      >
                        {creatingRecipient ? "..." : "Crear"}
                      </button>
                    </div>
                    {recipientError && <span style={{ font: "600 11px var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "#e5928a" }}>{recipientError}</span>}
                  </div>
                </div>
              ) : modal === "contactMessage" ? (
                <>
                  <p style={{ margin: 0, font: "400 12.5px/1.75 var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--ink2,#C2BEB5)" }}>
                    {t(lang, "contactSub", { name: card.name })}
                  </p>
                  {contactSent ? (
                    <div style={{ padding: 18, borderRadius: 12, background: "rgba(20,20,20,.8)", border: "1px solid rgba(var(--accentRgb,200,161,90),.3)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
                      <Icon name="mark_email_read" size={28} style={{ color: "var(--accentMid,#C8A15A)" }} />
                      <span style={{ font: "700 13px var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--ink,#F5F2EB)" }}>{t(lang, "contactSuccess")}</span>
                    </div>
                  ) : (
                    <>
                      <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        <span style={{ font: "500 10px var(--brandFont,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".16em", textTransform: "uppercase", color: "var(--ink2,#C2BEB5)" }}>
                          {t(lang, "fSenderName")}
                        </span>
                        <input
                          value={senderName}
                          onChange={(e) => setSenderName(e.target.value)}
                          style={{ background: "var(--deepBg,#0D0D0D)", border: "1px solid rgba(var(--accentRgb,200,161,90),.3)", borderRadius: 10, padding: "11px 14px", color: "var(--ink,#F5F2EB)", font: "400 14px var(--brandFont,'Plus Jakarta Sans'),sans-serif", outline: "none" }}
                        />
                      </label>
                      <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        <span style={{ font: "500 10px var(--brandFont,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".16em", textTransform: "uppercase", color: "var(--ink2,#C2BEB5)" }}>
                          {t(lang, "fSenderEmail")}
                        </span>
                        <input
                          type="email"
                          value={senderEmail}
                          onChange={(e) => setSenderEmail(e.target.value)}
                          placeholder="nombre@correo.com"
                          style={{ background: "var(--deepBg,#0D0D0D)", border: "1px solid rgba(var(--accentRgb,200,161,90),.3)", borderRadius: 10, padding: "11px 14px", color: "var(--ink,#F5F2EB)", font: "400 14px var(--brandFont,'Plus Jakarta Sans'),sans-serif", outline: "none" }}
                        />
                      </label>
                      <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        <span style={{ font: "500 10px var(--brandFont,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".16em", textTransform: "uppercase", color: "var(--ink2,#C2BEB5)" }}>
                          {t(lang, "fMessage")}
                        </span>
                        <textarea
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          rows={4}
                          style={{ background: "var(--deepBg,#0D0D0D)", border: "1px solid rgba(var(--accentRgb,200,161,90),.3)", borderRadius: 10, padding: "11px 14px", color: "var(--ink,#F5F2EB)", font: "400 14px var(--brandFont,'Plus Jakarta Sans'),sans-serif", outline: "none", resize: "vertical" }}
                        />
                      </label>
                      {contactError && (
                        <span style={{ font: "600 11px var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "#e5928a" }}>{contactError}</span>
                      )}
                      <button
                        type="button"
                        onClick={submitContact}
                        disabled={contacting}
                        style={{
                          width: "100%",
                          padding: 14,
                          border: "none",
                          borderRadius: 12,
                          background: "linear-gradient(90deg,var(--accentLight,#E5C378),var(--accentMid,#C8A15A) 50%,var(--accentDeep,#99732B))",
                          color: "var(--deepBg,#0D0D0D)",
                          font: "700 12.5px var(--brandFont,'Plus Jakarta Sans'),sans-serif",
                          letterSpacing: ".12em",
                          textTransform: "uppercase",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          cursor: contacting ? "default" : "pointer",
                          opacity: contacting ? 0.7 : 1,
                        }}
                      >
                        <Icon name="send" size={18} />
                        <span>{contacting ? "..." : t(lang, "contactSend")}</span>
                      </button>
                    </>
                  )}
                </>
              ) : modal === "versionInfo" ? (
                // Historial completo (2026-09-17, pedido de Gunnar) — antes
                // solo mostraba la nota de la última versión, con 2
                // versiones previas sueltas como breadcrumb sin explicar
                // nada. Ahora cada entrada trae su propia fecha + nota,
                // hasta 10 atrás, letra más chica. El modal ya scrollea
                // solo (maxHeight:88vh/overflowY:auto en el contenedor de
                // arriba), no hace falta un scroll anidado.
                <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, minHeight: 0 }}>
                  {/* Qué significa cada número de la versión (2026-09-18,
                      pedido de Gunnar) — antes de la bitácora, no dentro de
                      cada entrada, para no repetirlo 10 veces. Queda fija
                      arriba; de acá para abajo scrollea solo la lista. */}
                  <div
                    style={{
                      flex: "none",
                      display: "flex", flexDirection: "column", gap: 6,
                      padding: "10px 12px", borderRadius: 10,
                      background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)",
                    }}
                  >
                    {[
                      ["1er número", "cambios grandes — algo que ya usabas puede funcionar distinto."],
                      ["2do número", "funcionalidad nueva — se suma algo, sin romper lo que ya había."],
                      ["3er número", "arreglos y ajustes chicos."],
                    ].map(([label, desc]) => (
                      <div key={label} style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
                        <span style={{ flex: "none", font: "700 9.5px var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--accentLight,#E5C378)" }}>
                          {label}
                        </span>
                        <span style={{ font: "400 9.5px/1.4 var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--ink2,#8a8378)" }}>
                          {desc}
                        </span>
                      </div>
                    ))}
                  </div>
                  {/* La bitácora en sí — 2026-09-19: pasa a ser su propio
                      scroll interno (flex:1/minHeight:0/overflowY:auto) en
                      vez de arrastrar todo el modal para abajo. */}
                  <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
                    {CHANGELOG.slice(0, 10).map((entry, i) => (
                      <div
                        key={entry.version}
                        style={{
                          paddingTop: i === 0 ? 0 : 10,
                          borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,.08)",
                          display: "flex",
                          flexDirection: "column",
                          gap: 3,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                          <span style={{ font: "700 11.5px var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--accentLight,#E5C378)" }}>
                            v{entry.version}
                          </span>
                          <span style={{ font: "400 9.5px var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--ink2,#8a8378)" }}>{entry.date}</span>
                        </div>
                        <p style={{ margin: 0, font: "400 11px/1.6 var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "rgba(245,242,235,.85)" }}>
                          {entry.notes}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ padding: 14, borderRadius: 12, background: "rgba(20,20,20,.8)", border: "1px solid rgba(var(--accentRgb,200,161,90),.3)", textAlign: "center" }}>
                    <span style={{ font: "700 17px var(--brandFont,'Playfair Display'),serif", color: "var(--accentLight,#E5C378)" }}>{activeModal.head}</span>
                  </div>
                  <p style={{ margin: 0, font: "400 13px/1.8 var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "rgba(245,242,235,.92)" }}>{activeModal.body}</p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,.1)" }}>
                    <span style={{ font: "600 10px var(--brandFont,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".16em", textTransform: "uppercase", color: "var(--accentMid,#C8A15A)" }}>{activeModal.meta}</span>
                    <span style={{ font: "italic 400 14px var(--brandFont,'Playfair Display'),serif", color: "var(--ink,#F5F2EB)" }}>{card.name}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Schedule modal — slides down from the top, unlike the bottom sheets above */}
        {scheduleOpen && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 65,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              padding: "0 12px",
              background: "rgba(0,0,0,.8)",
              backdropFilter: "blur(2px)",
            }}
          >
            <div onClick={closeSchedule} style={{ position: "absolute", inset: 0 }} />
            <div
              style={{
                position: "relative",
                width: "100%",
                maxWidth: 406,
                maxHeight: "88vh",
                overflowY: "auto",
                background: "linear-gradient(180deg,var(--surfHi,#1C1C1C),var(--deepBg,#0D0D0D))",
                border: "1px solid rgba(var(--accentRgb,200,161,90),.4)",
                borderTop: "none",
                borderRadius: "0 0 24px 24px",
                padding: "22px 22px 28px",
                boxShadow: "0 10px 45px rgba(0,0,0,.95)",
                display: "flex",
                flexDirection: "column",
                gap: 14,
                animation: "modalInTop .25s ease-out",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon name="event" style={{ color: "var(--accentMid,#C8A15A)" }} />
                  <span style={{ font: "700 11px var(--brandFont,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".2em", textTransform: "uppercase", color: "var(--accentLight,#E5C378)" }}>
                    {L("scheduleKicker")}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={closeSchedule}
                  aria-label="Cerrar"
                  style={{ width: 32, height: 32, borderRadius: 999, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", color: "var(--ink2,#C2BEB5)", cursor: "pointer", flex: "none" }}
                >
                  ✕
                </button>
              </div>

              <h3 style={{ margin: 0, font: "600 17px var(--brandFont,'Playfair Display'),serif", color: "var(--accentLight,#E5C378)" }}>
                {recipient && isProject
                  ? legacyResult
                    ? "Tu tarjeta ya existe"
                    : legacyStep === 1
                    ? "Antes de agendar..."
                    : legacyStep === 2
                    ? "Tus datos"
                    : "Elegí tu sesión"
                  : L(isProject ? "scheduleTitle" : isCompany ? "meetingTitle" : "coffeeTitle")}
              </h3>

              {recipient && isProject && !legacyResult && (
                // Barra de progreso de 3 pasos, calcada del funnel real
                // de MayanCity (captura que mandó Gunnar) -- el 4to paso
                // es la pantalla de éxito de arriba, sin barra.
                <div style={{ display: "flex", gap: 6 }}>
                  {[1, 2, 3].map((n) => (
                    <span
                      key={n}
                      style={{
                        flex: 1,
                        height: 4,
                        borderRadius: 999,
                        background: n <= legacyStep ? "var(--accentMid,#C8A15A)" : "rgba(255,255,255,.1)",
                      }}
                    />
                  ))}
                </div>
              )}

              {recipient && isProject ? (
                // PASO 6 (2026-10-02) -- funnel propio para el
                // destinatario, calcado del funnel REAL de MayanCity:
                // video → tus datos → elegí tu sesión → confirmación. Los
                // datos quedan 100% en LyCard (reusa el alta Freemium
                // self-service y registerInterviewAction, ver
                // app/c/legacy-funnel-actions.ts) -- nunca se conecta con
                // MayanCity ni crea billeteras blockchain. Nunca toca el
                // slot-picker de abajo, que sigue intacto para cuando NO
                // hay destinatario.
                legacyResult ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ padding: 18, borderRadius: 12, background: "rgba(20,20,20,.8)", border: "1px solid rgba(var(--accentRgb,200,161,90),.3)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
                      <Icon name="event_available" size={28} style={{ color: "var(--accentMid,#C8A15A)" }} />
                      <span style={{ font: "700 13px var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--ink,#F5F2EB)" }}>Tu tarjeta ya existe</span>
                      <span style={{ font: "400 12px/1.6 var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--ink2,#C2BEB5)" }}>
                        Tu entrevista inicial de Legacy queda para el {legacyResult.interviewLabel}.
                      </span>
                    </div>
                    {legacyResult.cardSlug && (
                      <Link
                        href={`/c/${legacyResult.cardSlug}`}
                        style={{
                          width: "100%",
                          padding: 14,
                          borderRadius: 12,
                          background: "linear-gradient(90deg,var(--accentLight,#E5C378),var(--accentMid,#C8A15A) 50%,var(--accentDeep,#99732B))",
                          color: "var(--deepBg,#0D0D0D)",
                          font: "700 12.5px var(--brandFont,'Plus Jakarta Sans'),sans-serif",
                          letterSpacing: ".12em",
                          textTransform: "uppercase",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          textDecoration: "none",
                        }}
                      >
                        <Icon name="badge" size={18} />
                        Ver mi tarjeta
                      </Link>
                    )}
                    {legacyResult.cardSlug && (
                      <span style={{ font: "400 10.5px var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--ink2,#8a8378)", textAlign: "center", wordBreak: "break-all" }}>
                        {typeof window !== "undefined" ? window.location.origin : ""}/c/{legacyResult.cardSlug}
                      </span>
                    )}
                  </div>
                ) : legacyStep === 1 ? (
                  // Paso 1/3 -- video, calcado de "Antes de agendar..."
                  // de MayanCity. Sin un video real cargado todavía
                  // (Gunnar no pasó uno) -- placeholder honesto marcado,
                  // mismo criterio que el resto de la app.
                  <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center", textAlign: "center" }}>
                    <span style={{ width: 52, height: 52, borderRadius: 999, background: "rgba(var(--accentRgb,200,161,90),.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon name="videocam" size={24} style={{ color: "var(--accentMid,#C8A15A)" }} />
                    </span>
                    <p style={{ margin: 0, font: "400 12.5px/1.6 var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--ink2,#C2BEB5)" }}>
                      Mirá este breve video antes de tu entrevista con Legacy.
                    </p>
                    <div
                      style={{
                        width: "100%",
                        aspectRatio: "16/9",
                        borderRadius: 14,
                        border: "1px dashed rgba(255,255,255,.18)",
                        background: "rgba(0,0,0,.4)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      <Icon name="movie" size={24} style={{ color: "#5A5A5A" }} />
                      <span style={{ font: "700 10px var(--brandFont,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".12em", textTransform: "uppercase", color: "#5A5A5A" }}>
                        Video no configurado
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLegacyStep(2)}
                      style={{
                        width: "100%",
                        padding: 14,
                        border: "none",
                        borderRadius: 12,
                        background: "linear-gradient(90deg,var(--accentLight,#E5C378),var(--accentMid,#C8A15A) 50%,var(--accentDeep,#99732B))",
                        color: "var(--deepBg,#0D0D0D)",
                        font: "700 12.5px var(--brandFont,'Plus Jakarta Sans'),sans-serif",
                        letterSpacing: ".12em",
                        textTransform: "uppercase",
                        cursor: "pointer",
                      }}
                    >
                      Continuar a la agenda
                    </button>
                  </div>
                ) : legacyStep === 2 ? (
                  // Paso 2/3 -- tus datos + programa + privacidad.
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <p style={{ margin: 0, font: "400 12.5px/1.6 var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--ink2,#C2BEB5)" }}>
                      Confirmá dónde te contactamos. Tu link personalizado ya te identifica -- no hace falta ningún código.
                    </p>

                    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      <span style={{ font: "500 10px var(--brandFont,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".16em", textTransform: "uppercase", color: "var(--ink2,#C2BEB5)" }}>
                        Nombre completo
                      </span>
                      <input
                        value={legacyName}
                        onChange={(e) => setLegacyName(e.target.value)}
                        style={{ background: "var(--deepBg,#0D0D0D)", border: "1px solid rgba(var(--accentRgb,200,161,90),.3)", borderRadius: 10, padding: "11px 14px", color: "var(--ink,#F5F2EB)", font: "400 14px var(--brandFont,'Plus Jakarta Sans'),sans-serif", outline: "none" }}
                      />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      <span style={{ font: "500 10px var(--brandFont,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".16em", textTransform: "uppercase", color: "var(--ink2,#C2BEB5)" }}>
                        Email
                      </span>
                      <input
                        type="email"
                        value={legacyEmail}
                        onChange={(e) => setLegacyEmail(e.target.value)}
                        placeholder="nombre@correo.com"
                        style={{ background: "var(--deepBg,#0D0D0D)", border: "1px solid rgba(var(--accentRgb,200,161,90),.3)", borderRadius: 10, padding: "11px 14px", color: "var(--ink,#F5F2EB)", font: "400 14px var(--brandFont,'Plus Jakarta Sans'),sans-serif", outline: "none" }}
                      />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      <span style={{ font: "500 10px var(--brandFont,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".16em", textTransform: "uppercase", color: "var(--ink2,#C2BEB5)" }}>
                        WhatsApp
                      </span>
                      <input
                        value={legacyWa}
                        onChange={(e) => setLegacyWa(e.target.value)}
                        placeholder="+52 998 000 0000"
                        style={{ background: "var(--deepBg,#0D0D0D)", border: "1px solid rgba(var(--accentRgb,200,161,90),.3)", borderRadius: 10, padding: "11px 14px", color: "var(--ink,#F5F2EB)", font: "400 14px var(--brandFont,'Plus Jakarta Sans'),sans-serif", outline: "none" }}
                      />
                    </label>

                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <span style={{ font: "500 10px var(--brandFont,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".16em", textTransform: "uppercase", color: "var(--ink2,#C2BEB5)" }}>
                        Elegí tu programa
                      </span>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6 }}>
                        {PROGRAM_DURATIONS.map((d) => {
                          const on = legacyDuracion === d.id;
                          return (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => setLegacyDuracion(d.id)}
                              style={{
                                padding: "9px 4px",
                                borderRadius: 10,
                                border: `1px solid ${on ? "var(--accentMid,#C8A15A)" : "rgba(255,255,255,.1)"}`,
                                background: on ? "rgba(var(--accentRgb,200,161,90),.16)" : "var(--surf,#141414)",
                                color: on ? "var(--accentLight,#E5C378)" : "var(--ink2,#C2BEB5)",
                                font: "700 10.5px var(--brandFont,'Plus Jakarta Sans'),sans-serif",
                                cursor: "pointer",
                              }}
                            >
                              {d.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={legacyPrivacy}
                        onChange={(e) => setLegacyPrivacy(e.target.checked)}
                        style={{ marginTop: 2, flex: "none" }}
                      />
                      <span style={{ font: "400 10.5px/1.5 var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--ink2,#8a8378)" }}>
                        [PLACEHOLDER] Leí y acepto el aviso de privacidad de Legacy by EinarOS: cómo se usa mi información y mis derechos sobre ella.
                      </span>
                    </label>

                    {legacyError && (
                      <span style={{ font: "600 11px var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "#e5928a" }}>{legacyError}</span>
                    )}

                    <button
                      type="button"
                      onClick={submitLegacyDatos}
                      style={{
                        width: "100%",
                        padding: 14,
                        border: "none",
                        borderRadius: 12,
                        background: "linear-gradient(90deg,var(--accentLight,#E5C378),var(--accentMid,#C8A15A) 50%,var(--accentDeep,#99732B))",
                        color: "var(--deepBg,#0D0D0D)",
                        font: "700 12.5px var(--brandFont,'Plus Jakarta Sans'),sans-serif",
                        letterSpacing: ".12em",
                        textTransform: "uppercase",
                        cursor: "pointer",
                      }}
                    >
                      Siguiente paso
                    </button>
                  </div>
                ) : (
                  // Paso 3/3 -- elegí tu sesión, mismo horario real que
                  // usa el slot-picker de siempre (interviewSlots prop).
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <p style={{ margin: 0, font: "400 12.5px/1.6 var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--ink2,#C2BEB5)" }}>
                      Horarios disponibles para esta semana.
                    </p>

                    {interviewSlots.length === 0 ? (
                      <div style={{ padding: 18, borderRadius: 12, border: "1px dashed rgba(255,255,255,.18)", textAlign: "center" }}>
                        <span style={{ font: "700 11px var(--brandFont,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".06em", textTransform: "uppercase", color: "var(--ink2,#8a8378)" }}>
                          No hay sesiones disponibles
                        </span>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {interviewSlots.map((slot) => {
                          const on = slot.id === legacySlotId;
                          return (
                            <button
                              key={slot.id}
                              type="button"
                              onClick={() => setLegacySlotId(slot.id)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                padding: 12,
                                borderRadius: 12,
                                border: `1px solid ${on ? "rgba(var(--accentRgb,200,161,90),.6)" : "rgba(255,255,255,.1)"}`,
                                background: on ? "rgba(var(--accentRgb,200,161,90),.14)" : "var(--surf,#141414)",
                                cursor: "pointer",
                                textAlign: "left",
                              }}
                            >
                              <span style={{ width: 18, height: 18, borderRadius: 999, border: `2px solid ${on ? "var(--accentLight,#E5C378)" : "#5A5A5A"}`, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                                {on && <span style={{ width: 9, height: 9, borderRadius: 999, background: "var(--accentLight,#E5C378)" }} />}
                              </span>
                              <span style={{ display: "flex", flexDirection: "column" }}>
                                <span style={{ font: "600 12.5px var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: on ? "var(--accentLight,#E5C378)" : "var(--ink,#F5F2EB)" }}>
                                  {lang === "en" ? slot.labelEn : slot.label}
                                </span>
                                <span style={{ font: "400 10.5px var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "#9a8f80" }}>{slot.time}</span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {legacyError && (
                      <span style={{ font: "600 11px var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "#e5928a" }}>{legacyError}</span>
                    )}

                    <button
                      type="button"
                      onClick={submitLegacyFunnel}
                      disabled={legacySubmitting}
                      style={{
                        width: "100%",
                        padding: 14,
                        border: "none",
                        borderRadius: 12,
                        background: "linear-gradient(90deg,var(--accentLight,#E5C378),var(--accentMid,#C8A15A) 50%,var(--accentDeep,#99732B))",
                        color: "var(--deepBg,#0D0D0D)",
                        font: "700 12.5px var(--brandFont,'Plus Jakarta Sans'),sans-serif",
                        letterSpacing: ".12em",
                        textTransform: "uppercase",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        cursor: legacySubmitting ? "default" : "pointer",
                        opacity: legacySubmitting ? 0.7 : 1,
                      }}
                    >
                      <Icon name="check_circle" size={18} />
                      <span>{legacySubmitting ? "..." : "Confirmar asistencia"}</span>
                    </button>
                  </div>
                )
              ) : scheduleResult ? (
                <div style={{ padding: 18, borderRadius: 12, background: "rgba(20,20,20,.8)", border: "1px solid rgba(var(--accentRgb,200,161,90),.3)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
                  <Icon name="event_available" size={28} style={{ color: "var(--accentMid,#C8A15A)" }} />
                  <span style={{ font: "700 13px var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--ink,#F5F2EB)" }}>
                    {t(lang, "scheduleSuccess", { slot: scheduleResult.slotLabel })}
                  </span>
                </div>
              ) : (
                <>
                  <p style={{ margin: 0, font: "400 12.5px/1.6 var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--ink2,#C2BEB5)" }}>
                    {t(lang, isProject ? "scheduleSub" : isCompany ? "meetingSub" : "coffeeSub", { name: card.name })}
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {interviewSlots.map((slot) => {
                      const on = slot.id === selectedSlot;
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => setSelectedSlot(slot.id)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: 12,
                            borderRadius: 12,
                            border: `1px solid ${on ? "rgba(var(--accentRgb,200,161,90),.6)" : "rgba(255,255,255,.1)"}`,
                            background: on ? "rgba(var(--accentRgb,200,161,90),.14)" : "var(--surf,#141414)",
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          <span style={{ width: 18, height: 18, borderRadius: 999, border: `2px solid ${on ? "var(--accentLight,#E5C378)" : "#5A5A5A"}`, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                            {on && <span style={{ width: 9, height: 9, borderRadius: 999, background: "var(--accentLight,#E5C378)" }} />}
                          </span>
                          <span style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ font: "600 12.5px var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: on ? "var(--accentLight,#E5C378)" : "var(--ink,#F5F2EB)" }}>
                              {lang === "en" ? slot.labelEn : slot.label}
                            </span>
                            <span style={{ font: "400 10.5px var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "#9a8f80" }}>{slot.time}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <span style={{ font: "500 10px var(--brandFont,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".16em", textTransform: "uppercase", color: "var(--ink2,#C2BEB5)" }}>
                      {t(lang, "fFullName")}
                    </span>
                    <input
                      value={scheduleName}
                      onChange={(e) => setScheduleName(e.target.value)}
                      style={{ background: "var(--deepBg,#0D0D0D)", border: "1px solid rgba(var(--accentRgb,200,161,90),.3)", borderRadius: 10, padding: "11px 14px", color: "var(--ink,#F5F2EB)", font: "400 14px var(--brandFont,'Plus Jakarta Sans'),sans-serif", outline: "none" }}
                    />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <span style={{ font: "500 10px var(--brandFont,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".16em", textTransform: "uppercase", color: "var(--ink2,#C2BEB5)" }}>
                      {t(lang, "fWhatsapp")}
                    </span>
                    <input
                      value={scheduleWa}
                      onChange={(e) => setScheduleWa(e.target.value)}
                      placeholder="+52 998 000 0000"
                      style={{ background: "var(--deepBg,#0D0D0D)", border: "1px solid rgba(var(--accentRgb,200,161,90),.3)", borderRadius: 10, padding: "11px 14px", color: "var(--ink,#F5F2EB)", font: "400 14px var(--brandFont,'Plus Jakarta Sans'),sans-serif", outline: "none" }}
                    />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <span style={{ font: "500 10px var(--brandFont,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".16em", textTransform: "uppercase", color: "var(--ink2,#C2BEB5)" }}>
                      {t(lang, "fEmailOptional")}
                    </span>
                    <input
                      type="email"
                      value={scheduleEmail}
                      onChange={(e) => setScheduleEmail(e.target.value)}
                      style={{ background: "var(--deepBg,#0D0D0D)", border: "1px solid rgba(var(--accentRgb,200,161,90),.3)", borderRadius: 10, padding: "11px 14px", color: "var(--ink,#F5F2EB)", font: "400 14px var(--brandFont,'Plus Jakarta Sans'),sans-serif", outline: "none" }}
                    />
                  </label>

                  {scheduleError && (
                    <span style={{ font: "600 11px var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "#e5928a" }}>{scheduleError}</span>
                  )}

                  <button
                    type="button"
                    onClick={submitSchedule}
                    disabled={scheduling}
                    style={{
                      width: "100%",
                      padding: 14,
                      border: "none",
                      borderRadius: 12,
                      background: "linear-gradient(90deg,var(--accentLight,#E5C378),var(--accentMid,#C8A15A) 50%,var(--accentDeep,#99732B))",
                      color: "var(--deepBg,#0D0D0D)",
                      font: "700 12.5px var(--brandFont,'Plus Jakarta Sans'),sans-serif",
                      letterSpacing: ".12em",
                      textTransform: "uppercase",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      cursor: scheduling ? "default" : "pointer",
                      opacity: scheduling ? 0.7 : 1,
                    }}
                  >
                    <Icon name="check_circle" size={18} />
                    <span>{scheduling ? "..." : t(lang, "scheduleConfirm")}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Send QR by WhatsApp — host only, simulated */}
        {qrSendOpen && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 65,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              padding: "0 12px",
              background: "rgba(0,0,0,.8)",
              backdropFilter: "blur(2px)",
            }}
          >
            <div onClick={closeQrSend} style={{ position: "absolute", inset: 0 }} />
            <div
              style={{
                position: "relative",
                width: "100%",
                maxWidth: 406,
                maxHeight: "88vh",
                overflowY: "auto",
                background: "linear-gradient(180deg,var(--surfHi,#1C1C1C),var(--deepBg,#0D0D0D))",
                border: "1px solid rgba(var(--accentRgb,200,161,90),.4)",
                borderTop: "none",
                borderRadius: "0 0 24px 24px",
                padding: "22px 22px 28px",
                boxShadow: "0 10px 45px rgba(0,0,0,.95)",
                display: "flex",
                flexDirection: "column",
                gap: 14,
                animation: "modalInTop .25s ease-out",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon name="qr_code_2" style={{ color: "var(--accentMid,#C8A15A)" }} />
                  <span style={{ font: "700 11px var(--brandFont,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".2em", textTransform: "uppercase", color: "var(--accentLight,#E5C378)" }}>
                    {t(lang, "qrSendKicker")}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={closeQrSend}
                  aria-label="Cerrar"
                  style={{ width: 32, height: 32, borderRadius: 999, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", color: "var(--ink2,#C2BEB5)", cursor: "pointer", flex: "none" }}
                >
                  ✕
                </button>
              </div>

              <h3 style={{ margin: 0, font: "600 17px var(--brandFont,'Playfair Display'),serif", color: "var(--accentLight,#E5C378)" }}>{t(lang, "qrSendTitle")}</h3>

              {qrSent ? (
                <div style={{ padding: 18, borderRadius: 12, background: "rgba(20,20,20,.8)", border: "1px solid rgba(var(--accentRgb,200,161,90),.3)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
                  <Icon name="check_circle" size={28} style={{ color: "var(--accentMid,#C8A15A)" }} />
                  <span style={{ font: "700 13px var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--ink,#F5F2EB)" }}>{t(lang, "qrSendSuccess", { whatsapp: qrWa })}</span>
                </div>
              ) : (
                <>
                  <p style={{ margin: 0, font: "400 12.5px/1.6 var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--ink2,#C2BEB5)" }}>{t(lang, "qrSendSub")}</p>

                  <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <span style={{ font: "500 10px var(--brandFont,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".16em", textTransform: "uppercase", color: "var(--ink2,#C2BEB5)" }}>
                      {t(lang, "fWhatsapp")}
                    </span>
                    <input
                      value={qrWa}
                      onChange={(e) => setQrWa(e.target.value)}
                      placeholder="+52 998 000 0000"
                      style={{ background: "var(--deepBg,#0D0D0D)", border: "1px solid rgba(var(--accentRgb,200,161,90),.3)", borderRadius: 10, padding: "11px 14px", color: "var(--ink,#F5F2EB)", font: "400 14px var(--brandFont,'Plus Jakarta Sans'),sans-serif", outline: "none" }}
                    />
                  </label>

                  {qrError && <span style={{ font: "600 11px var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "#e5928a" }}>{qrError}</span>}

                  <button
                    type="button"
                    onClick={submitQrSend}
                    disabled={qrSending}
                    style={{
                      width: "100%",
                      padding: 14,
                      border: "none",
                      borderRadius: 12,
                      background: "linear-gradient(90deg,var(--accentLight,#E5C378),var(--accentMid,#C8A15A) 50%,var(--accentDeep,#99732B))",
                      color: "var(--deepBg,#0D0D0D)",
                      font: "700 12.5px var(--brandFont,'Plus Jakarta Sans'),sans-serif",
                      letterSpacing: ".12em",
                      textTransform: "uppercase",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      cursor: qrSending ? "default" : "pointer",
                      opacity: qrSending ? 0.7 : 1,
                    }}
                  >
                    <Icon name="send" size={18} />
                    <span>{qrSending ? "..." : t(lang, "qrSendBtn")}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* CV viewer (2026-09-17, rediseño) — pasa a usar el mismo modal
            bottom-sheet que el resto (nunca se sale de pantalla: mismo
            maxHeight:88vh/overflowY:auto que los demás), y en vez de
            embeber el PDF crudo en un <iframe> (que en mobile podía
            desbordar o quedar sin scroll propio), se muestra como imagen
            — una captura de la página, con mejor diseño alrededor
            (marco, sombra) y un link de descarga del PDF real debajo.
            Un shared demo PDF por ahora (PLAN.md Grupo C: subida real de
            CV por card, pendiente). */}
        {cvOpen && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 90,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              padding: "0 12px",
              background: "rgba(0,0,0,.8)",
              backdropFilter: "blur(2px)",
            }}
          >
            <div onClick={() => setCvOpen(false)} style={{ position: "absolute", inset: 0 }} />
            <div
              style={{
                position: "relative",
                width: "100%",
                maxWidth: 406,
                maxHeight: "88vh",
                overflowY: "auto",
                background: "linear-gradient(180deg,var(--surfHi,#1C1C1C),var(--deepBg,#0D0D0D))",
                border: "1px solid rgba(var(--accentRgb,200,161,90),.4)",
                borderBottom: "none",
                borderRadius: "24px 24px 0 0",
                padding: "22px 22px 28px",
                boxShadow: "0 -10px 45px rgba(0,0,0,.95)",
                display: "flex",
                flexDirection: "column",
                gap: 14,
                animation: "modalIn .25s ease-out",
              }}
            >
              <span style={{ width: 48, height: 5, borderRadius: 999, background: "rgba(var(--accentRgb,200,161,90),.4)", margin: "0 auto" }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon name="work" style={{ color: "var(--accentMid,#C8A15A)" }} />
                  <span style={{ font: "700 11px var(--brandFont,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".2em", textTransform: "uppercase", color: "var(--accentLight,#E5C378)" }}>
                    CV — {card.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setCvOpen(false)}
                  aria-label="Cerrar"
                  style={{ width: 32, height: 32, borderRadius: 999, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", color: "var(--ink2,#C2BEB5)", cursor: "pointer", flex: "none" }}
                >
                  ✕
                </button>
              </div>
              <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid rgba(var(--accentRgb,200,161,90),.3)", boxShadow: "0 8px 24px rgba(0,0,0,.5)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/demo-cv.png" alt={`CV de ${card.name}`} style={{ width: "100%", display: "block" }} />
              </div>
              <a
                href="/demo-cv.pdf"
                download
                target="_blank"
                rel="noopener"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid rgba(var(--accentRgb,200,161,90),.4)",
                  color: "var(--accentLight,#E5C378)",
                  font: "700 11px var(--brandFont,'Plus Jakarta Sans'),sans-serif",
                  letterSpacing: ".1em",
                  textTransform: "uppercase",
                }}
              >
                <Icon name="download" size={16} />
                Descargar PDF
              </a>
            </div>
          </div>
        )}

        {/* Portal ("Próximamente") */}
        {portal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 70,
              background: "rgba(0,0,0,.92)",
              backdropFilter: "blur(14px)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
              textAlign: "center",
              gap: 6,
            }}
          >
            <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 22 }}>
              <span style={{ position: "absolute", width: 96, height: 96, borderRadius: 999, background: "rgba(212,175,55,.2)", filter: "blur(16px)", animation: "softPulse 1.4s ease-in-out infinite" }} />
              <span style={{ width: 80, height: 80, borderRadius: 999, border: "2px solid rgba(229,195,120,.6)", borderTopColor: "var(--accentMid,#D4AF37)", animation: "spinSlow 1s linear infinite", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="key" size={30} style={{ color: "var(--accentLight,#E5C378)" }} />
              </span>
            </div>
            <span style={{ font: "700 10.5px var(--brandFont,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".28em", textTransform: "uppercase", color: "var(--accentMid,#C8A15A)" }}>
              {t(lang, "legacyPass")}
            </span>
            <h2 style={{ margin: 0, font: "600 21px var(--brandFont,'Playfair Display'),serif", color: "var(--ink,#F5F2EB)" }}>{t(lang, "portalTitle")}</h2>
            <p style={{ margin: "6px 0 0", maxWidth: 270, font: "400 12px/1.6 var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--ink2,#C2BEB5)" }}>
              {t(lang, "portalSub", { name: card.name })}
            </p>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div
            style={{
              position: "fixed",
              bottom: 28,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 80,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "11px 18px",
              borderRadius: 999,
              background: "rgba(28,28,28,.96)",
              border: "1px solid rgba(var(--accentRgb,200,161,90),.5)",
              boxShadow: "0 12px 32px rgba(0,0,0,.7)",
              maxWidth: "92%",
              animation: "toastIn .2s ease-out",
            }}
          >
            <Icon name="verified_user" size={17} style={{ color: "var(--accentMid,#C8A15A)", flex: "none" }} />
            <span style={{ font: "600 10.5px var(--brandFont,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink,#F5F2EB)" }}>
              {toast}
            </span>
          </div>
        )}
      </div>

      {sizePanelOpen && (
        <CardSizePanel
          cardId={card.id}
          liveConfig={liveSizeConfig}
          savedConfig={savedSizeConfig}
          onChange={setLiveSizeConfig}
          onClose={handleSizePanelClose}
        />
      )}
    </div>
  );
}
