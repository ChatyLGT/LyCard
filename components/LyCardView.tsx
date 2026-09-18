"use client";

import { useState, useRef, useEffect, useTransition, type CSSProperties, type ReactElement } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Card, OriginMemento, Program, ProgramSkin, Puesto } from "@/generated/prisma/client";
import { t, type Lang } from "@/lib/i18n";
import { rankById, medalById } from "@/lib/data";
import { parseEscala } from "@/lib/escalas";
import { INTERVIEW_SLOTS } from "@/lib/interviewSlots";
import { registerInterviewAction, sendInvitationAction, sendContactMessageAction, sendQrByWhatsappAction } from "@/app/c/actions";
import { APP_VERSION, CHANGELOG } from "@/lib/version";
import { isSkinColors, KNOWN_FONTS } from "@/lib/designMd";
import { googleFontHref } from "@/lib/googleFont";
import { hexToRgbString, lightness, shade } from "@/lib/color";

type ModalKey =
  | "od"
  | "ancient"
  | "medal"
  | "story"
  | "info"
  | "invite"
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
const CUBE_MEDIUM: CSSProperties = {
  flex: "none",
  width: "clamp(62px,15dvh,82px)",
  height: "clamp(62px,15dvh,82px)",
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
  width: "clamp(24px,6.6dvh,27px)",
  height: "clamp(24px,6.6dvh,27px)",
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
// couple of channels filled in. Tinted like a cut gemstone: jade on the
// left, ruby on the right.
const SOCIAL_DOCK: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "clamp(6px,1.8dvh,10px)",
  padding: "clamp(5px,1.4dvh,7px)",
  borderRadius: 999,
  backdropFilter: "blur(6px)",
};

const GEM_TONE: Record<"jade" | "ruby", CSSProperties> = {
  jade: {
    background: "linear-gradient(165deg,rgba(84,214,158,.42) 0%,rgba(10,64,46,.7) 100%)",
    border: "1px solid rgba(120,232,178,.55)",
    boxShadow: "0 0 16px rgba(72,206,148,.35), inset 0 1px 1px rgba(255,255,255,.15)",
  },
  ruby: {
    background: "linear-gradient(165deg,rgba(236,96,116,.42) 0%,rgba(94,14,30,.7) 100%)",
    border: "1px solid rgba(244,130,146,.55)",
    boxShadow: "0 0 16px rgba(224,80,100,.35), inset 0 1px 1px rgba(255,255,255,.15)",
  },
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
  badge,
  originMemento,
  program,
  puesto,
}: {
  card: Card;
  qrSvg: string;
  // Only still needed to decide whether the N0 badge links into /admin —
  // a Company owner can also read "N0" (they're their own network's root)
  // but isn't an Admin and /admin would just bounce them to a login screen.
  isAdmin: boolean;
  isHost: boolean;
  // Viewer-relative N0/N1/.../NA (2026-09-16) — replaces the old
  // isAdmin-only "N0" badge; see lib/badge.ts for how it's computed.
  badge: string;
  originMemento: OriginMemento | null;
  // `skins` carries only the active one (query already filters it, see
  // app/c/[slug]/page.tsx) — 0 or 1 entries, never more.
  program: (Program & { skins: ProgramSkin[] }) | null;
  puesto: Puesto | null;
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
  // label from the Card editor, defaulting to "My Business/Personal Card".
  const cardIslandLabel = isProject
    ? `${program?.name || "Legacy"} Card`
    : card.islandLabel || (isCompany ? "My Business Card" : "My Personal Card");
  const [theme, setTheme] = useState<"dark" | "light">(
    (card.defaultTheme as "dark" | "light") || "dark"
  );
  const [lang, setLang] = useState<Lang>((card.defaultLang as Lang) || "es");
  const L = (key: string) => cardLabel(program, lang, key);
  const [modal, setModal] = useState<ModalKey>(null);
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

  function closeSchedule() {
    setScheduleOpen(false);
    setSelectedSlot(null);
    setScheduleName("");
    setScheduleWa("");
    setScheduleEmail("");
    setScheduleError(null);
    setScheduleResult(null);
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
      } else {
        setScheduleError(t(lang, "scheduleErrSlot"));
      }
    });
  }

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSent, setInviteSent] = useState(false);
  const [inviting, startInviting] = useTransition();

  function submitInvite() {
    setInviteError(null);
    startInviting(async () => {
      const res = await sendInvitationAction({ cardSlug: card.slug, inviteeEmail: inviteEmail });
      if (res.ok) {
        setInviteSent(true);
      } else if (res.error === "not_configured") {
        setInviteError(t(lang, "inviteErrNotConfigured"));
      } else {
        setInviteError(t(lang, "inviteErrEmail"));
      }
    });
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
      meta: t(lang, "odMeta"),
    },
    ancient: {
      icon: rankTier.icono || "auto_awesome",
      kicker: L("ancKicker"),
      // Dynamic per the card's actual rank tier (PLAN.md Fase 9.5) — used
      // to always say "Ancient Pioneer" regardless of the real rank.
      head: `✦ ${rankTier.nombre} ✦`,
      body: rankTier.descripcion || t(lang, "ancBody"),
      meta: t(lang, "ancMeta"),
    },
    medal: {
      icon: medalTier.icono || "workspace_premium",
      kicker: medalTier.subtitulo || t(lang, "medalKicker"),
      head: medalTier.nombre,
      body: medalTier.descripcion || t(lang, "medalBody"),
      meta: t(lang, "medalMeta"),
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
    info: isCompany
      ? { icon: "storefront", kicker: t(lang, "companyInfoKicker"), head: card.title || card.name, body: card.quote, meta: t(lang, "companyInfoMeta") }
      : { icon: "diamond", kicker: L("infoKicker") },
    invite: { icon: "mail", kicker: L("inviteKicker") },
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
    setInviteEmail("");
    setInviteError(null);
    setInviteSent(false);
    setSenderName("");
    setSenderEmail("");
    setMessageText("");
    setContactError(null);
    setContactSent(false);
  }

  return (
    <div
      style={{
        height: "100dvh",
        width: "100%",
        display: "flex",
        justifyContent: "center",
        overflow: "hidden",
        background: "var(--deepBg,#09090b)",
        fontFamily: "var(--brandFont,'Plus Jakarta Sans'),sans-serif",
        WebkitFontSmoothing: "antialiased",
        ...THEME_VARS[theme],
        ...brandVars,
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
          <div style={{ position: "relative", flex: "1 1 auto", minHeight: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div
              style={{
                position: "relative",
                width: "100%",
                // -15% (2026-09-17, pedido de Gunnar): 130/420 → 110/357,
                // para que el panel de botones/social de abajo respire más.
                flex: "1 1 auto",
                minHeight: 110,
                maxHeight: 357,
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
                  <button
                    type="button"
                    aria-label="Versión de la app"
                    onClick={() => setModal("versionInfo")}
                    style={ISLAND_BADGE}
                  >
                    V. {APP_VERSION}
                  </button>
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
                      font: "600 24px/1.2 var(--brandFont,'Playfair Display'),serif",
                      letterSpacing: "-.01em",
                      color: "var(--ink,#F5F2EB)",
                      textShadow: "var(--nameshadow,0 1px 2px rgba(0,0,0,.35))",
                    }}
                  >
                    {card.name}
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

                {card.title && (
                  // +15% (2026-09-17, pedido de Gunnar) sobre el tamaño que
                  // ya había bajado un 30% en v1.11.1 — no es una vuelta al
                  // tamaño original, es un ajuste sobre ese achique.
                  <button
                    type="button"
                    onClick={() => setCvOpen(true)}
                    aria-label="Ver CV"
                    style={{
                      ...BADGE_BTN,
                      pointerEvents: "auto",
                      padding: "4px 11.5px",
                      gap: 5,
                      width: 172,
                      maxWidth: "70%",
                      justifyContent: "center",
                    }}
                  >
                    <Sweep />
                    <Icon name="work" size={9} style={{ flex: "none", color: "var(--goldtxt,#E5C378)" }} />
                    <span
                      style={{
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        font: "700 8px var(--brandFont,'Plus Jakarta Sans'),sans-serif",
                        letterSpacing: ".14em",
                        textTransform: "uppercase",
                        color: "var(--goldtxt,#E5C378)",
                      }}
                    >
                      {card.title}
                    </span>
                  </button>
                )}

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
                aria-label="Virtual Office"
                style={{
                  position: "relative",
                  flex: "none",
                  width: 80,
                  height: 80,
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
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={officeLogoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <>
                      <Sweep />
                      <svg
                        viewBox="0 0 100 100"
                        style={{ width: 56, height: 56, animation: "emblemFloat 3s ease-in-out infinite", filter: "drop-shadow(0 2px 8px rgba(var(--accentRgb,200,161,90),.5))" }}
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
            {/* -20% (2026-09-17, pedido de Gunnar) */}
            <button
              type="button"
              onClick={() => setModal("story")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "clamp(5px,0.8dvh,7px) 13px",
                borderRadius: 999,
                background: "var(--surf,#141414)",
                border: "1px solid var(--line2,rgba(var(--accentRgb,200,161,90),.4))",
                color: "var(--goldtxt,#E5C378)",
                font: "600 9px var(--brandFont,'Plus Jakarta Sans'),sans-serif",
                letterSpacing: ".14em",
                textTransform: "uppercase",
                cursor: "pointer",
                boxShadow: "0 2px 10px rgba(0,0,0,.25)",
              }}
            >
              <span style={{ color: "var(--accentMid,#C8A15A)" }}>✦</span>
              <span>{L(isProject ? "storyBtn" : isCompany ? "storyBtnCompany" : "storyBtnPersonal")}</span>
              <Icon name="north_east" size={12} style={{ opacity: 0.8 }} />
            </button>
          </div>

          {/* Cubes: left (info/save-contact) / QR (large) / right (invite/message) */}
          <div style={{ flex: "0 0 auto", display: "flex", alignItems: "flex-end", justifyContent: "center", gap: "clamp(10px,3dvw,18px)" }}>
            {isPersonal ? (
              <a href={`/c/${card.slug}/vcard`} download style={CUBE_MEDIUM} aria-label={t(lang, "vcardBtn")}>
                <Icon name="contact_page" size={22} />
                <span style={CUBE_LABEL}>{t(lang, "vcardBtn")}</span>
              </a>
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
                  style={{ width: "clamp(84px,15dvh,140px)", height: "clamp(84px,15dvh,140px)", background: "#fff", borderRadius: 8, padding: 6 }}
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
              </button>
            ) : (
              <Link
                href="/m/login"
                aria-label={L("createCardBtn")}
                style={{
                  position: "relative",
                  flex: "none",
                  width: "clamp(84px,15dvh,140px)",
                  height: "clamp(84px,15dvh,140px)",
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
            ) : (
              <button type="button" onClick={() => setModal("invite")} style={CUBE_MEDIUM_ALT} aria-label={L("inviteBtn")}>
                <Icon name="mail" size={22} />
                <span style={CUBE_LABEL}>{L("inviteBtn")}</span>
              </button>
            )}
          </div>

          {/* Schedule CTA — project books an interview, company books a meeting,
              personal books a coffee. Used to skip personal entirely; now on
              all 3 kinds (2026-09-16), each with its own copy. */}
          {/* -30% (2026-09-17, pedido de Gunnar) */}
          <div style={{ flex: "0 0 auto", width: "100%" }}>
            <button
              type="button"
              onClick={() => setScheduleOpen(true)}
              style={{
                width: "100%",
                padding: "clamp(6px,1.1dvh,10px) 14px",
                border: "1px solid rgba(255,230,163,.45)",
                borderRadius: 16,
                background: "linear-gradient(90deg,var(--accentLight,#E5C378),var(--accentMid,#C8A15A) 50%,var(--accentDeep,#99732B))",
                color: "var(--onAccent,#141414)",
                font: "800 9px var(--brandFont,'Plus Jakarta Sans'),sans-serif",
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
              <Icon name="event" size={13} />
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
                  aria-label="Close"
                  style={{ width: 32, height: 32, borderRadius: 999, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", color: "var(--ink2,#C2BEB5)", cursor: "pointer", flex: "none" }}
                >
                  ✕
                </button>
              </div>

              {modal === "info" && isProject ? (
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
              ) : modal === "invite" ? (
                <>
                  <p style={{ margin: 0, font: "400 12.5px/1.75 var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--ink2,#C2BEB5)" }}>
                    {t(lang, isCompany ? "inviteSubCompany" : "inviteSub")}
                  </p>
                  {inviteSent ? (
                    <div style={{ padding: 18, borderRadius: 12, background: "rgba(20,20,20,.8)", border: "1px solid rgba(var(--accentRgb,200,161,90),.3)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
                      <Icon name="mark_email_read" size={28} style={{ color: "var(--accentMid,#C8A15A)" }} />
                      <span style={{ font: "700 13px var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "var(--ink,#F5F2EB)" }}>{t(lang, "inviteSuccess")}</span>
                    </div>
                  ) : (
                    <>
                      <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        <span style={{ font: "500 10px var(--brandFont,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".16em", textTransform: "uppercase", color: "var(--ink2,#C2BEB5)" }}>
                          {t(lang, "fInviteeEmail")}
                        </span>
                        <input
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="nombre@correo.com"
                          style={{ background: "var(--deepBg,#0D0D0D)", border: "1px solid rgba(var(--accentRgb,200,161,90),.3)", borderRadius: 10, padding: "11px 14px", color: "var(--ink,#F5F2EB)", font: "400 14px var(--brandFont,'Plus Jakarta Sans'),sans-serif", outline: "none" }}
                        />
                      </label>
                      {inviteError && (
                        <span style={{ font: "600 11px var(--brandFont,'Plus Jakarta Sans'),sans-serif", color: "#e5928a" }}>{inviteError}</span>
                      )}
                      <button
                        type="button"
                        onClick={submitInvite}
                        disabled={inviting}
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
                          cursor: inviting ? "default" : "pointer",
                          opacity: inviting ? 0.7 : 1,
                        }}
                      >
                        <Icon name="send" size={18} />
                        <span>{inviting ? "..." : t(lang, "inviteSend")}</span>
                      </button>
                    </>
                  )}
                </>
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
                  aria-label="Close"
                  style={{ width: 32, height: 32, borderRadius: 999, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", color: "var(--ink2,#C2BEB5)", cursor: "pointer", flex: "none" }}
                >
                  ✕
                </button>
              </div>

              <h3 style={{ margin: 0, font: "600 17px var(--brandFont,'Playfair Display'),serif", color: "var(--accentLight,#E5C378)" }}>
                {L(isProject ? "scheduleTitle" : isCompany ? "meetingTitle" : "coffeeTitle")}
              </h3>

              {scheduleResult ? (
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
                    {INTERVIEW_SLOTS.map((slot) => {
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
                  aria-label="Close"
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
    </div>
  );
}
