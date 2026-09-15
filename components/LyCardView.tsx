"use client";

import { useState, useRef, useEffect, type CSSProperties, type ReactElement } from "react";
import Link from "next/link";
import type { Card } from "@/generated/prisma/client";
import { t, type Lang } from "@/lib/i18n";
import { rankById } from "@/lib/data";

type ModalKey = "od" | "ancient" | "story" | "info" | null;

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

const SOCIAL_ICON: CSSProperties = {
  flex: "1 1 0",
  minWidth: 0,
  maxWidth: 34,
  aspectRatio: "1",
  color: "var(--goldtxt,#E5C378)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  opacity: 0.9,
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

const SOCIAL_SVG: Record<string, ReactElement> = {
  wa: (
    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.52 11.64c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.03-1.25-.75-.67-1.26-1.5-1.41-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.37-.44.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43l-.48-.01c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.77 2.71 4.3 3.79.6.26 1.07.41 1.44.53.61.19 1.16.17 1.6.1.49-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.07-.1-.23-.17-.48-.29z" />
  ),
  ig: (
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  ),
  li: (
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.69 1.69 0 0 0 1.69-1.69 1.69 1.69 0 0 0-1.69-1.69 1.69 1.69 0 0 0-1.69 1.69 1.69 1.69 0 0 0 1.69 1.69m1.4 9.74v-8.37H5.06v8.37h2.8z" />
  ),
  x: (
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  ),
};

function socialHref(channel: string, value: string) {
  const v = value.trim();
  if (!v) return null;
  if (channel === "wa") return `https://wa.me/${v.replace(/[^\d]/g, "")}`;
  if (channel === "ig") return `https://instagram.com/${v.replace(/^@/, "")}`;
  if (channel === "li")
    return v.startsWith("http") ? v : `https://linkedin.com/${v.replace(/^\//, "")}`;
  if (channel === "x") return `https://x.com/${v.replace(/^@/, "")}`;
  return null;
}

export default function LyCardView({
  card,
  cardUrl,
  qrSvg,
  isAdmin,
}: {
  card: Card;
  cardUrl: string;
  qrSvg: string;
  isAdmin: boolean;
}) {
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
      flash(t(lang, "tOffice"));
    }, 1400);
  }

  async function shareCard() {
    try {
      await navigator.clipboard.writeText(cardUrl);
    } catch {
      // clipboard unavailable — still show confirmation copy below
    }
    flash(t(lang, "tShare"));
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
    info: { icon: "diamond", kicker: t(lang, "infoKicker") },
  };
  const activeModal = modal ? modalMap[modal] : null;

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
                  height: 176,
                  background:
                    "linear-gradient(to top,var(--photofade,#0D0D0D) 0%,var(--photofade2,rgba(13,13,13,.52)) 45%,var(--photofade3,rgba(13,13,13,.25)) 72%,transparent 100%)",
                  opacity: 0.92,
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

            <div style={{ position: "relative", marginTop: -28, zIndex: 20 }}>
              <button
                type="button"
                onClick={enterOffice}
                aria-label="Virtual Office"
                style={{
                  position: "relative",
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

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexWrap: "nowrap",
                gap: "clamp(8px,3%,16px)",
                width: "100%",
                maxWidth: 358,
                margin: "2px auto 0",
                padding: "8px 0 0",
                borderTop: "1px solid var(--line,rgba(200,161,90,.22))",
              }}
            >
              {(["wa", "ig", "li", "x"] as const).map((ch) => {
                const href = socialHref(ch, card[ch]);
                const label = { wa: "WhatsApp", ig: "Instagram", li: "LinkedIn", x: "X" }[ch];
                if (!href) return null;
                return (
                  <a key={ch} aria-label={label} href={href} target="_blank" rel="noopener" style={SOCIAL_ICON}>
                    <svg viewBox="0 0 24 24" style={{ width: "100%", height: "100%", fill: "currentColor" }}>
                      {SOCIAL_SVG[ch]}
                    </svg>
                  </a>
                );
              })}
            </div>
          </div>

          {/* QR */}
          <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div
              style={{
                position: "relative",
                padding: 10,
                borderRadius: 20,
                background: "var(--qrbg,rgba(20,20,20,.95))",
                border: "1px solid var(--line2,rgba(212,175,55,.55))",
                boxShadow: "0 12px 36px rgba(0,0,0,.85)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
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
            </div>
          </div>

          {/* CTAs */}
          <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", gap: "clamp(6px,1dvh,12px)", width: "100%" }}>
            <button
              type="button"
              onClick={() => setModal("info")}
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
              <Icon name="diamond" />
              <span>{t(lang, "infoBtn")}</span>
            </button>
            <button
              type="button"
              onClick={shareCard}
              style={{
                width: "100%",
                padding: "clamp(8px,1.4dvh,13px) 20px",
                borderRadius: 16,
                background: "var(--surf,#141414)",
                border: "1px solid var(--line2,rgba(200,161,90,.5))",
                color: "var(--ink,#F5F2EB)",
                font: "700 13px 'Plus Jakarta Sans',sans-serif",
                letterSpacing: ".16em",
                textTransform: "uppercase",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                cursor: "pointer",
              }}
            >
              <Icon name="ios_share" style={{ color: "#C8A15A" }} />
              <span>{t(lang, "shareBtn")}</span>
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
            <div onClick={() => setModal(null)} style={{ position: "absolute", inset: 0 }} />
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
                  onClick={() => setModal(null)}
                  aria-label="Close"
                  style={{ width: 32, height: 32, borderRadius: 999, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", color: "#C2BEB5", cursor: "pointer", flex: "none" }}
                >
                  ✕
                </button>
              </div>

              {modal === "info" ? (
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
