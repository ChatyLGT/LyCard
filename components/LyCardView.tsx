"use client";

import { useState, useRef, useEffect, useTransition, type CSSProperties, type ReactElement } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Card, OriginMemento, Program } from "@/generated/prisma/client";
import { t, type Lang } from "@/lib/i18n";
import { rankById } from "@/lib/data";
import { INTERVIEW_SLOTS } from "@/lib/interviewSlots";
import { registerInterviewAction, sendInvitationAction, sendContactMessageAction } from "@/app/c/actions";

type ModalKey = "od" | "ancient" | "story" | "info" | "invite" | "contactMessage" | "office" | null;

type OfficeItem = { id: string; title: string; subtitle?: string; description?: string; imageUrl?: string };

function parseOfficeItems(value: unknown): OfficeItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is Record<string, unknown> => typeof v === "object" && v !== null)
    .map((v) => ({
      id: typeof v.id === "string" ? v.id : "",
      title: typeof v.title === "string" ? v.title : "",
      subtitle: typeof v.subtitle === "string" ? v.subtitle : undefined,
      description: typeof v.description === "string" ? v.description : undefined,
      imageUrl: typeof v.imageUrl === "string" ? v.imageUrl : undefined,
    }))
    .filter((item) => item.title.trim().length > 0);
}

type OriginSnapshot = {
  recruitedAt?: string;
  programName?: string;
  referrerName?: string;
  referrerCardSlug?: string | null;
  referrerCardName?: string | null;
  referrerCardTitle?: string | null;
  referrerPortraitUrl?: string | null;
};

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
  border: "1px solid rgba(200,161,90,.5)",
  backdropFilter: "blur(8px)",
  color: "#E5C378",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
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
  border: "1px solid var(--line2,rgba(200,161,90,.5))",
  boxShadow: "0 0 14px rgba(200,161,90,.3)",
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
  background: "linear-gradient(160deg,#E5C378,#C8A15A 55%,#99732B)",
  boxShadow: "0 6px 18px rgba(200,161,90,.38)",
  color: "#141414",
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
  border: "1px solid var(--line2,rgba(200,161,90,.5))",
  boxShadow: "0 4px 14px rgba(0,0,0,.35)",
  color: "var(--goldtxt,#E5C378)",
};

const CUBE_LABEL: CSSProperties = {
  font: "700 8.5px 'Plus Jakarta Sans',sans-serif",
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

export default function LyCardView({
  card,
  qrSvg,
  isAdmin,
  isHost,
  originMemento,
  program,
}: {
  card: Card;
  qrSvg: string;
  isAdmin: boolean;
  isHost: boolean;
  originMemento: OriginMemento | null;
  program: Program | null;
}) {
  const router = useRouter();
  const isProject = card.kind === "project";
  const isCompany = card.kind === "company";
  const isPersonal = card.kind === "personal";
  // Project cards' official social channels live on the Program, not the
  // Card (each N0 defines their project's branding once, at Program level —
  // see PLAN.md Fase 7.1). card.wa stays personal/per-host regardless of kind.
  const socialCard: Card =
    isProject && program
      ? { ...card, ig: program.ig, li: program.li, x: program.x, fb: program.fb, tiktok: program.tiktok, yt: program.yt, web: program.web }
      : card;
  const [theme, setTheme] = useState<"dark" | "light">(
    (card.defaultTheme as "dark" | "light") || "dark"
  );
  const [lang, setLang] = useState<Lang>((card.defaultLang as Lang) || "es");
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
    setPortal(true);
    if (portalTimer.current) clearTimeout(portalTimer.current);
    portalTimer.current = setTimeout(() => {
      setPortal(false);
      setModal("office");
    }, 900);
  }

  const officeItems = parseOfficeItems(card.officeItems);
  const origin = originMemento?.snapshot as OriginSnapshot | undefined;

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

  function shareLink() {
    const url = `${window.location.origin}/c/${card.slug}`;
    navigator.clipboard.writeText(url).then(() => flash(t(lang, "linkCopied")));
  }

  const light = theme === "light";
  const rank = rankById(card.rank);
  const rankName = lang === "en" ? rank.en : rank.es;
  const rankLabel = rankName.toUpperCase();

  const modalMap: Record<
    Exclude<ModalKey, null>,
    { icon: string; kicker: string; head?: string; body?: string; meta?: string }
  > = {
    od: {
      icon: "military_tech",
      kicker: card.tooltip,
      head: card.siglas,
      body: t(lang, "odBody"),
      meta: t(lang, "odMeta"),
    },
    ancient: {
      icon: "auto_awesome",
      kicker: t(lang, "ancKicker"),
      head: t(lang, "ancHead"),
      body: t(lang, "ancBody"),
      meta: t(lang, "ancMeta"),
    },
    story: {
      icon: "auto_stories",
      kicker: t(lang, "storyKicker"),
      head: t(lang, "storyHead"),
      body: t(lang, "storyBody"),
      meta: t(lang, "storyMeta"),
    },
    info: isCompany
      ? { icon: "storefront", kicker: t(lang, "companyInfoKicker"), head: card.title || card.name, body: card.quote, meta: t(lang, "companyInfoMeta") }
      : { icon: "diamond", kicker: t(lang, "infoKicker") },
    invite: { icon: "mail", kicker: t(lang, "inviteKicker") },
    contactMessage: { icon: "chat", kicker: t(lang, "contactKicker") },
    office: {
      icon: isProject ? "auto_awesome" : isCompany ? "storefront" : "badge",
      kicker: t(lang, isProject ? "officeKickerProject" : isCompany ? "officeKickerCompany" : "officeKickerPersonal"),
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
        background: "#09090b",
        fontFamily: "'Plus Jakarta Sans',sans-serif",
        WebkitFontSmoothing: "antialiased",
        ...THEME_VARS[theme],
      }}
    >
      <div style={{ position: "relative", width: "100%", maxWidth: 430, height: "100%", overflow: "hidden" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            padding:
              "calc(env(safe-area-inset-top,0px) + 10px) 14px calc(env(safe-area-inset-bottom,0px) + 10px)",
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
                flex: "1 1 auto",
                minHeight: 130,
                maxHeight: 420,
                borderRadius: 24,
                overflow: "hidden",
                border: "1px solid var(--line,rgba(200,161,90,.22))",
                boxShadow: "0 16px 40px rgba(0,0,0,.85)",
                background: "#0D0D0D",
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
                    font: "500 11px 'Plus Jakarta Sans',sans-serif",
                    letterSpacing: ".08em",
                    textTransform: "uppercase",
                  }}
                >
                  Retrato oficial
                </div>
              )}

              <div style={{ position: "absolute", top: 14, left: 14, zIndex: 30, display: "flex", alignItems: "center", gap: 8 }}>
                <Link href={`/admin/${card.slug}`} aria-label={t(lang, "customize")} style={ICON_BTN}>
                  <Icon name="tune" size={17} />
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    aria-label="MasterN0"
                    style={{ ...ICON_BTN, font: "800 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".02em" }}
                  >
                    N0
                  </Link>
                )}
              </div>

              <div style={{ position: "absolute", top: 14, right: 14, zIndex: 30, display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  aria-label="Idioma"
                  onClick={() => setLang((l) => (l === "es" ? "en" : "es"))}
                  style={{ ...ICON_BTN, font: "700 11px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".06em" }}
                >
                  {lang === "es" ? "ES" : "EN"}
                </button>
                <button
                  type="button"
                  aria-label="Tema"
                  onClick={() => setTheme((th) => (th === "dark" ? "light" : "dark"))}
                  style={ICON_BTN}
                >
                  <Icon name={light ? "dark_mode" : "light_mode"} />
                </button>
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
                <h1
                  style={{
                    margin: 0,
                    font: "600 24px/1.2 'Playfair Display',serif",
                    letterSpacing: "-.01em",
                    color: "var(--ink,#F5F2EB)",
                    textShadow: "var(--nameshadow,0 1px 2px rgba(0,0,0,.35))",
                  }}
                >
                  {card.name}
                </h1>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, pointerEvents: "auto" }}>
                  <button type="button" onClick={() => setModal("od")} style={BADGE_BTN}>
                    <Sweep />
                    <Icon name="diamond" size={12} style={{ color: "var(--goldtxt,#E5C378)" }} />
                    <span style={{ font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".16em", textTransform: "uppercase", color: "var(--goldtxt,#E5C378)" }}>
                      {card.siglas}
                    </span>
                  </button>
                  <button type="button" onClick={() => setModal("ancient")} style={BADGE_BTN}>
                    <Sweep />
                    <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, flex: "none" }} fill="none" stroke="#E5C378">
                      <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" strokeLinecap="round" strokeWidth="1.8" />
                      <circle cx="12" cy="12" r="4.5" stroke="#E5C378" strokeWidth="1.6" />
                      <circle cx="12" cy="12" r="2" fill="#D4AF37" />
                    </svg>
                    <span style={{ font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".16em", textTransform: "uppercase", color: "var(--goldtxt,#E5C378)" }}>
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
                  background: "linear-gradient(180deg,rgba(229,195,120,.7),rgba(200,161,90,.5),#141414)",
                  border: "1px solid rgba(200,161,90,.4)",
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
                    background: "linear-gradient(180deg,#1C1C1C,#141414 55%,#0D0D0D)",
                    border: "1px solid rgba(255,255,255,.1)",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <Sweep />
                  <svg
                    viewBox="0 0 100 100"
                    style={{ width: 56, height: 56, animation: "emblemFloat 3s ease-in-out infinite", filter: "drop-shadow(0 2px 8px rgba(200,161,90,.5))" }}
                    fill="none"
                  >
                    <defs>
                      <linearGradient id="jgg" gradientUnits="userSpaceOnUse" x1="10" x2="90" y1="10" y2="90">
                        <stop offset="0%" stopColor="#FFFFFF" />
                        <stop offset="25%" stopColor="#FFF0CA" />
                        <stop offset="55%" stopColor="#D4AF37" />
                        <stop offset="85%" stopColor="#99732B" />
                        <stop offset="100%" stopColor="#E5C378" />
                      </linearGradient>
                      <radialGradient id="orbg" cx="50%" cy="40%" r="60%">
                        <stop offset="0%" stopColor="#FFFFFF" />
                        <stop offset="50%" stopColor="#FFE6A3" />
                        <stop offset="100%" stopColor="#C8A15A" />
                      </radialGradient>
                    </defs>
                    <path d="M14 74 C 32 47, 68 47, 86 74" stroke="url(#jgg)" strokeLinecap="round" strokeWidth="6.2" />
                    <path d="M23 74 V 64 M34 74 V 58 M46 74 V 53 M58 74 V 53 M70 74 V 58 M81 74 V 64" stroke="#F0D38D" strokeLinecap="round" strokeWidth="3.2" />
                    <path d="M48 20 C 43 36, 27 52, 18 70 C 28 70, 56 63, 82 72" stroke="url(#jgg)" strokeLinecap="round" strokeWidth="6" />
                    <circle cx="50" cy="49" r="4.8" fill="url(#orbg)" stroke="#FFFFFF" strokeWidth="1.4" />
                  </svg>
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
                font: "italic 400 clamp(12px,2.6dvh,15px)/1.4 'Playfair Display',serif",
                letterSpacing: ".01em",
                color: "var(--ink2,#C2BEB5)",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {card.quote}
            </p>
            {isProject && (
              <button
                type="button"
                onClick={() => setModal("story")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "clamp(6px,1dvh,9px) 16px",
                  borderRadius: 999,
                  background: "var(--surf,#141414)",
                  border: "1px solid var(--line2,rgba(200,161,90,.4))",
                  color: "var(--goldtxt,#E5C378)",
                  font: "600 11px 'Plus Jakarta Sans',sans-serif",
                  letterSpacing: ".14em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  boxShadow: "0 2px 10px rgba(0,0,0,.25)",
                }}
              >
                <span style={{ color: "#C8A15A" }}>✦</span>
                <span>{t(lang, "storyBtn")}</span>
                <Icon name="north_east" size={15} style={{ opacity: 0.8 }} />
              </button>
            )}
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
                aria-label={t(lang, isCompany ? "companyInfoBtn" : "infoBtn")}
              >
                <Icon name={isCompany ? "storefront" : "diamond"} size={22} />
                <span style={CUBE_LABEL}>{t(lang, isCompany ? "companyInfoBtn" : "infoBtn")}</span>
              </button>
            )}

            {isProject && isHost ? (
              <button
                type="button"
                onClick={() => router.push(`/m/onboarding?ref=${card.slug}`)}
                aria-label="Simular escaneo del QR"
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
                <span style={{ position: "absolute", top: 7, left: 7, width: 16, height: 16, borderTop: "2px solid #D4AF37", borderLeft: "2px solid #D4AF37", borderRadius: "6px 0 0 0" }} />
                <span style={{ position: "absolute", top: 7, right: 7, width: 16, height: 16, borderTop: "2px solid #D4AF37", borderRight: "2px solid #D4AF37", borderRadius: "0 6px 0 0" }} />
                <span style={{ position: "absolute", bottom: 7, left: 7, width: 16, height: 16, borderBottom: "2px solid #D4AF37", borderLeft: "2px solid #D4AF37", borderRadius: "0 0 0 6px" }} />
                <span style={{ position: "absolute", bottom: 7, right: 7, width: 16, height: 16, borderBottom: "2px solid #D4AF37", borderRight: "2px solid #D4AF37", borderRadius: "0 0 6px 0" }} />
                <div
                  style={{ width: "clamp(84px,15dvh,140px)", height: "clamp(84px,15dvh,140px)", background: "#fff", borderRadius: 8, padding: 6 }}
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
              </button>
            ) : isProject ? (
              <Link
                href="/m/login"
                aria-label={t(lang, "createCardBtn")}
                style={{
                  position: "relative",
                  flex: "none",
                  width: "clamp(84px,15dvh,140px)",
                  height: "clamp(84px,15dvh,140px)",
                  borderRadius: 20,
                  background: "linear-gradient(160deg,#E5C378,#C8A15A 55%,#99732B)",
                  border: "1px solid rgba(255,230,163,.5)",
                  boxShadow: "0 12px 36px rgba(200,161,90,.45)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: 10,
                  color: "#141414",
                  textDecoration: "none",
                }}
              >
                <Icon name="add_card" size={32} />
                <span
                  style={{
                    font: "800 10.5px 'Plus Jakarta Sans',sans-serif",
                    letterSpacing: ".07em",
                    textTransform: "uppercase",
                    textAlign: "center",
                    lineHeight: 1.25,
                  }}
                >
                  {t(lang, "createCardBtn")}
                </span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={shareLink}
                aria-label="Compartir link"
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
                <div
                  style={{ width: "clamp(84px,15dvh,140px)", height: "clamp(84px,15dvh,140px)", background: "#fff", borderRadius: 8, padding: 6 }}
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
              </button>
            )}

            {isPersonal ? (
              <button type="button" onClick={() => setModal("contactMessage")} style={CUBE_MEDIUM_ALT} aria-label={t(lang, "sendMessageBtn")}>
                <Icon name="chat" size={22} />
                <span style={CUBE_LABEL}>{t(lang, "sendMessageBtn")}</span>
              </button>
            ) : (
              <button type="button" onClick={() => setModal("invite")} style={CUBE_MEDIUM_ALT} aria-label={t(lang, "inviteBtn")}>
                <Icon name="mail" size={22} />
                <span style={CUBE_LABEL}>{t(lang, "inviteBtn")}</span>
              </button>
            )}
          </div>

          {/* Schedule / meeting CTA — project cards book an interview, company cards book a meeting; personal cards skip this row entirely */}
          {!isPersonal && (
            <div style={{ flex: "0 0 auto", width: "100%" }}>
              <button
                type="button"
                onClick={() => setScheduleOpen(true)}
                style={{
                  width: "100%",
                  padding: "clamp(9px,1.6dvh,15px) 20px",
                  border: "1px solid rgba(255,230,163,.45)",
                  borderRadius: 16,
                  background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)",
                  color: "#141414",
                  font: "800 13px 'Plus Jakarta Sans',sans-serif",
                  letterSpacing: ".16em",
                  textTransform: "uppercase",
                  boxShadow: "0 6px 22px rgba(200,161,90,.42)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  cursor: "pointer",
                }}
              >
                <Icon name="event" />
                <span>{t(lang, isCompany ? (isHost ? "meetingBtnHost" : "meetingBtn") : isHost ? "scheduleBtnHost" : "scheduleBtn")}</span>
              </button>
            </div>
          )}
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
                maxHeight: "88vh",
                overflowY: "auto",
                background: "linear-gradient(180deg,#1C1C1C,#0D0D0D)",
                border: "1px solid rgba(200,161,90,.4)",
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
              <span style={{ width: 48, height: 5, borderRadius: 999, background: "rgba(200,161,90,.4)", margin: "0 auto" }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon name={activeModal.icon} style={{ color: "#C8A15A" }} />
                  <span style={{ font: "700 11px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".2em", textTransform: "uppercase", color: "#E5C378" }}>
                    {activeModal.kicker}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  aria-label="Close"
                  style={{ width: 32, height: 32, borderRadius: 999, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", color: "#C2BEB5", cursor: "pointer", flex: "none" }}
                >
                  ✕
                </button>
              </div>

              {modal === "info" && isProject ? (
                <>
                  <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", borderRadius: 16, overflow: "hidden", border: "1px solid rgba(200,161,90,.4)", background: "#000" }}>
                    {card.videoThumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={card.videoThumbnailUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : null}
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                      <span style={{ width: 56, height: 56, borderRadius: 999, padding: 2, background: "linear-gradient(45deg,#99732B,#C8A15A,#E5C378)", boxShadow: "0 0 25px rgba(200,161,90,.8)", display: "flex" }}>
                        <span style={{ width: "100%", height: "100%", borderRadius: 999, background: "rgba(0,0,0,.8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Icon name="play_arrow" size={26} style={{ color: "#E5C378", marginLeft: 3 }} />
                        </span>
                      </span>
                    </div>
                    <div style={{ position: "absolute", bottom: 10, left: 12, right: 12, display: "flex", alignItems: "center", justifyContent: "space-between", pointerEvents: "none" }}>
                      <span style={{ padding: "2px 8px", borderRadius: 5, background: "rgba(0,0,0,.7)", border: "1px solid rgba(255,255,255,.2)", font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "#F5F2EB" }}>
                        {t(lang, "infoTag")}
                      </span>
                      <span style={{ font: "600 10px 'Plus Jakarta Sans',sans-serif", color: "#E5C378" }}>4K ULTRA HD</span>
                    </div>
                  </div>
                  <h3 style={{ margin: 0, font: "600 17px 'Playfair Display',serif", color: "#E5C378" }}>{t(lang, "infoTitle")}</h3>
                  <p style={{ margin: 0, font: "400 12.5px/1.75 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>{t(lang, "infoP1")}</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
                    {[
                      ["token", t(lang, "pil1"), t(lang, "pil1s")],
                      ["groups", t(lang, "pil2"), t(lang, "pil2s")],
                      ["shield_with_heart", t(lang, "pil3"), t(lang, "pil3s")],
                    ].map(([icon, label, sub]) => (
                      <div key={icon} style={{ padding: "11px 8px", borderRadius: 12, background: "#141414", border: "1px solid rgba(200,161,90,.25)", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, textAlign: "center" }}>
                        <Icon name={icon} style={{ color: "#C8A15A" }} />
                        <span style={{ font: "700 10px 'Plus Jakarta Sans',sans-serif", color: "#F5F2EB" }}>{label}</span>
                        <span style={{ font: "400 9px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>{sub}</span>
                      </div>
                    ))}
                  </div>
                  <p style={{ margin: 0, font: "400 12.5px/1.75 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>
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
                      background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)",
                      color: "#0D0D0D",
                      font: "700 12.5px 'Plus Jakarta Sans',sans-serif",
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
                  <p style={{ margin: 0, font: "400 12.5px/1.75 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>
                    {t(lang, isCompany ? "inviteSubCompany" : "inviteSub")}
                  </p>
                  {inviteSent ? (
                    <div style={{ padding: 18, borderRadius: 12, background: "rgba(20,20,20,.8)", border: "1px solid rgba(200,161,90,.3)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
                      <Icon name="mark_email_read" size={28} style={{ color: "#C8A15A" }} />
                      <span style={{ font: "700 13px 'Plus Jakarta Sans',sans-serif", color: "#F5F2EB" }}>{t(lang, "inviteSuccess")}</span>
                    </div>
                  ) : (
                    <>
                      <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".16em", textTransform: "uppercase", color: "#C2BEB5" }}>
                          {t(lang, "fInviteeEmail")}
                        </span>
                        <input
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="nombre@correo.com"
                          style={{ background: "#0D0D0D", border: "1px solid rgba(200,161,90,.3)", borderRadius: 10, padding: "11px 14px", color: "#F5F2EB", font: "400 14px 'Plus Jakarta Sans',sans-serif", outline: "none" }}
                        />
                      </label>
                      {inviteError && (
                        <span style={{ font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>{inviteError}</span>
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
                          background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)",
                          color: "#0D0D0D",
                          font: "700 12.5px 'Plus Jakarta Sans',sans-serif",
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
                  <p style={{ margin: 0, font: "400 12.5px/1.75 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>
                    {t(lang, "contactSub", { name: card.name })}
                  </p>
                  {contactSent ? (
                    <div style={{ padding: 18, borderRadius: 12, background: "rgba(20,20,20,.8)", border: "1px solid rgba(200,161,90,.3)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
                      <Icon name="mark_email_read" size={28} style={{ color: "#C8A15A" }} />
                      <span style={{ font: "700 13px 'Plus Jakarta Sans',sans-serif", color: "#F5F2EB" }}>{t(lang, "contactSuccess")}</span>
                    </div>
                  ) : (
                    <>
                      <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".16em", textTransform: "uppercase", color: "#C2BEB5" }}>
                          {t(lang, "fSenderName")}
                        </span>
                        <input
                          value={senderName}
                          onChange={(e) => setSenderName(e.target.value)}
                          style={{ background: "#0D0D0D", border: "1px solid rgba(200,161,90,.3)", borderRadius: 10, padding: "11px 14px", color: "#F5F2EB", font: "400 14px 'Plus Jakarta Sans',sans-serif", outline: "none" }}
                        />
                      </label>
                      <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".16em", textTransform: "uppercase", color: "#C2BEB5" }}>
                          {t(lang, "fSenderEmail")}
                        </span>
                        <input
                          type="email"
                          value={senderEmail}
                          onChange={(e) => setSenderEmail(e.target.value)}
                          placeholder="nombre@correo.com"
                          style={{ background: "#0D0D0D", border: "1px solid rgba(200,161,90,.3)", borderRadius: 10, padding: "11px 14px", color: "#F5F2EB", font: "400 14px 'Plus Jakarta Sans',sans-serif", outline: "none" }}
                        />
                      </label>
                      <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".16em", textTransform: "uppercase", color: "#C2BEB5" }}>
                          {t(lang, "fMessage")}
                        </span>
                        <textarea
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          rows={4}
                          style={{ background: "#0D0D0D", border: "1px solid rgba(200,161,90,.3)", borderRadius: 10, padding: "11px 14px", color: "#F5F2EB", font: "400 14px 'Plus Jakarta Sans',sans-serif", outline: "none", resize: "vertical" }}
                        />
                      </label>
                      {contactError && (
                        <span style={{ font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>{contactError}</span>
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
                          background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)",
                          color: "#0D0D0D",
                          font: "700 12.5px 'Plus Jakarta Sans',sans-serif",
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
              ) : modal === "office" ? (
                <>
                  {isProject ? (
                    origin ? (
                      <>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, background: "rgba(20,20,20,.8)", border: "1px solid rgba(200,161,90,.3)" }}>
                          <div style={{ width: 52, height: 52, flex: "none", borderRadius: 999, overflow: "hidden", background: "#0D0D0D" }}>
                            {origin.referrerPortraitUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={origin.referrerPortraitUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : null}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <span style={{ display: "block", font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".14em", textTransform: "uppercase", color: "#C8A15A" }}>
                              {t(lang, "officeReferredBy")}
                            </span>
                            <span style={{ display: "block", font: "700 15px 'Playfair Display',serif", color: "#F5F2EB" }}>{origin.referrerName}</span>
                            {origin.referrerCardTitle && (
                              <span style={{ display: "block", font: "400 11.5px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>{origin.referrerCardTitle}</span>
                            )}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,.1)" }}>
                          <span style={{ font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".16em", textTransform: "uppercase", color: "#C8A15A" }}>
                            {t(lang, "officeProgramLabel")}: {origin.programName}
                          </span>
                          {origin.recruitedAt && (
                            <span style={{ font: "italic 400 12.5px 'Playfair Display',serif", color: "#F5F2EB" }}>
                              {t(lang, "officeJoinedOn", { date: new Date(origin.recruitedAt).toLocaleDateString(lang === "en" ? "en-US" : "es-MX") })}
                            </span>
                          )}
                        </div>
                      </>
                    ) : (
                      <div style={{ padding: 14, borderRadius: 12, background: "rgba(20,20,20,.8)", border: "1px solid rgba(200,161,90,.3)", textAlign: "center", display: "flex", flexDirection: "column", gap: 8 }}>
                        <span style={{ font: "700 17px 'Playfair Display',serif", color: "#E5C378" }}>{t(lang, "officeFounderHead")}</span>
                        <p style={{ margin: 0, font: "400 13px/1.6 'Plus Jakarta Sans',sans-serif", color: "rgba(245,242,235,.92)" }}>
                          {t(lang, "officeFounderBody", { name: card.name })}
                        </p>
                      </div>
                    )
                  ) : officeItems.length === 0 ? (
                    <p style={{ margin: 0, font: "400 13px/1.7 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5", textAlign: "center", padding: "18px 4px" }}>
                      {t(lang, isCompany ? "officeEmptyCompany" : "officeEmptyPersonal", { name: card.name })}
                    </p>
                  ) : (
                    officeItems.map((item) => (
                      <div key={item.id || item.title} style={{ display: "flex", gap: 12, padding: 14, borderRadius: 12, background: "rgba(20,20,20,.8)", border: "1px solid rgba(200,161,90,.3)" }}>
                        {item.imageUrl && (
                          <div style={{ width: 56, height: 56, flex: "none", borderRadius: 10, overflow: "hidden", background: "#0D0D0D" }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={item.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          </div>
                        )}
                        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                          <span style={{ font: "700 13.5px 'Plus Jakarta Sans',sans-serif", color: "#F5F2EB" }}>{item.title}</span>
                          {item.subtitle && (
                            <span style={{ font: "600 10.5px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".06em", textTransform: "uppercase", color: "#C8A15A" }}>{item.subtitle}</span>
                          )}
                          {item.description && (
                            <span style={{ font: "400 12px/1.5 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>{item.description}</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </>
              ) : (
                <>
                  <div style={{ padding: 14, borderRadius: 12, background: "rgba(20,20,20,.8)", border: "1px solid rgba(200,161,90,.3)", textAlign: "center" }}>
                    <span style={{ font: "700 17px 'Playfair Display',serif", color: "#E5C378" }}>{activeModal.head}</span>
                  </div>
                  <p style={{ margin: 0, font: "400 13px/1.8 'Plus Jakarta Sans',sans-serif", color: "rgba(245,242,235,.92)" }}>{activeModal.body}</p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,.1)" }}>
                    <span style={{ font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".16em", textTransform: "uppercase", color: "#C8A15A" }}>{activeModal.meta}</span>
                    <span style={{ font: "italic 400 14px 'Playfair Display',serif", color: "#F5F2EB" }}>{card.name}</span>
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
                background: "linear-gradient(180deg,#1C1C1C,#0D0D0D)",
                border: "1px solid rgba(200,161,90,.4)",
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
                  <Icon name="event" style={{ color: "#C8A15A" }} />
                  <span style={{ font: "700 11px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".2em", textTransform: "uppercase", color: "#E5C378" }}>
                    {t(lang, "scheduleKicker")}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={closeSchedule}
                  aria-label="Close"
                  style={{ width: 32, height: 32, borderRadius: 999, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", color: "#C2BEB5", cursor: "pointer", flex: "none" }}
                >
                  ✕
                </button>
              </div>

              <h3 style={{ margin: 0, font: "600 17px 'Playfair Display',serif", color: "#E5C378" }}>{t(lang, isCompany ? "meetingTitle" : "scheduleTitle")}</h3>

              {scheduleResult ? (
                <div style={{ padding: 18, borderRadius: 12, background: "rgba(20,20,20,.8)", border: "1px solid rgba(200,161,90,.3)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
                  <Icon name="event_available" size={28} style={{ color: "#C8A15A" }} />
                  <span style={{ font: "700 13px 'Plus Jakarta Sans',sans-serif", color: "#F5F2EB" }}>
                    {t(lang, "scheduleSuccess", { slot: scheduleResult.slotLabel })}
                  </span>
                </div>
              ) : (
                <>
                  <p style={{ margin: 0, font: "400 12.5px/1.6 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>
                    {t(lang, isCompany ? "meetingSub" : "scheduleSub", { name: card.name })}
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
                            border: `1px solid ${on ? "rgba(200,161,90,.6)" : "rgba(255,255,255,.1)"}`,
                            background: on ? "rgba(200,161,90,.14)" : "#141414",
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          <span style={{ width: 18, height: 18, borderRadius: 999, border: `2px solid ${on ? "#E5C378" : "#5A5A5A"}`, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                            {on && <span style={{ width: 9, height: 9, borderRadius: 999, background: "#E5C378" }} />}
                          </span>
                          <span style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ font: "600 12.5px 'Plus Jakarta Sans',sans-serif", color: on ? "#E5C378" : "#F5F2EB" }}>
                              {lang === "en" ? slot.labelEn : slot.label}
                            </span>
                            <span style={{ font: "400 10.5px 'Plus Jakarta Sans',sans-serif", color: "#9a8f80" }}>{slot.time}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".16em", textTransform: "uppercase", color: "#C2BEB5" }}>
                      {t(lang, "fFullName")}
                    </span>
                    <input
                      value={scheduleName}
                      onChange={(e) => setScheduleName(e.target.value)}
                      style={{ background: "#0D0D0D", border: "1px solid rgba(200,161,90,.3)", borderRadius: 10, padding: "11px 14px", color: "#F5F2EB", font: "400 14px 'Plus Jakarta Sans',sans-serif", outline: "none" }}
                    />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".16em", textTransform: "uppercase", color: "#C2BEB5" }}>
                      {t(lang, "fWhatsapp")}
                    </span>
                    <input
                      value={scheduleWa}
                      onChange={(e) => setScheduleWa(e.target.value)}
                      placeholder="+52 998 000 0000"
                      style={{ background: "#0D0D0D", border: "1px solid rgba(200,161,90,.3)", borderRadius: 10, padding: "11px 14px", color: "#F5F2EB", font: "400 14px 'Plus Jakarta Sans',sans-serif", outline: "none" }}
                    />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".16em", textTransform: "uppercase", color: "#C2BEB5" }}>
                      {t(lang, "fEmailOptional")}
                    </span>
                    <input
                      type="email"
                      value={scheduleEmail}
                      onChange={(e) => setScheduleEmail(e.target.value)}
                      style={{ background: "#0D0D0D", border: "1px solid rgba(200,161,90,.3)", borderRadius: 10, padding: "11px 14px", color: "#F5F2EB", font: "400 14px 'Plus Jakarta Sans',sans-serif", outline: "none" }}
                    />
                  </label>

                  {scheduleError && (
                    <span style={{ font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>{scheduleError}</span>
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
                      background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)",
                      color: "#0D0D0D",
                      font: "700 12.5px 'Plus Jakarta Sans',sans-serif",
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
              <span style={{ width: 80, height: 80, borderRadius: 999, border: "2px solid rgba(229,195,120,.6)", borderTopColor: "#D4AF37", animation: "spinSlow 1s linear infinite", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="key" size={30} style={{ color: "#E5C378" }} />
              </span>
            </div>
            <span style={{ font: "700 10.5px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".28em", textTransform: "uppercase", color: "#C8A15A" }}>
              {t(lang, "legacyPass")}
            </span>
            <h2 style={{ margin: 0, font: "600 21px 'Playfair Display',serif", color: "#F5F2EB" }}>{t(lang, "portalTitle")}</h2>
            <p style={{ margin: "6px 0 0", maxWidth: 270, font: "400 12px/1.6 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>
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
              border: "1px solid rgba(200,161,90,.5)",
              boxShadow: "0 12px 32px rgba(0,0,0,.7)",
              maxWidth: "92%",
              animation: "toastIn .2s ease-out",
            }}
          >
            <Icon name="verified_user" size={17} style={{ color: "#C8A15A", flex: "none" }} />
            <span style={{ font: "600 10.5px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "#F5F2EB" }}>
              {toast}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
