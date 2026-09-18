"use client";

import { useState, useRef, useEffect, useCallback, type CSSProperties } from "react";
import Link from "next/link";

type Msg = { id: string; from: "bot" | "user"; text: string; time: string };
type Step = { bot: string[]; userReply?: string };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const nowStr = () => new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

// Mismo lenguaje visual de WhatsApp que components/OnboardingChat.tsx
// (burbujas, "escribiendo...", timestamps), pero NO es ese componente:
// OnboardingChat está enganchado a OTP real y a joinLegacyProgramAction —
// reusarlo acá arriesgaba disparar lógica de alta real o confundir con
// su copy. Este es un componente nuevo, sin inputs libres, sin llamadas
// a servidor: el "usuario" avanza tocando una única respuesta sugerida
// por paso, guión 100% fijo sobre cómo se arma una Oficina Virtual —
// una demo del flujo, no el Gemelo Digital operativo (que no existe
// todavía, ver PLAN.md).
const SCRIPT: Step[] = [
  {
    bot: ["¡Hola! 👋 Soy tu Gemelo Digital — aunque, ojo, esto todavía es una demo.", "Te muestro rápido cómo se arma tu Oficina Virtual. ¿Arrancamos?"],
    userReply: "Dale, arrancamos",
  },
  {
    bot: ["Primero está tu Letrero: el video, la causa y los KPIs que ve cualquiera que te visite en /c/tu-slug."],
    userReply: "¿Y después?",
  },
  {
    bot: ["Después conectamos tus Superpoderes — cada herramienta real que uses (como tu Brief de reuniones de Fathom) aparece ahí, con su propio ícono."],
    userReply: "¿Y la Malla?",
  },
  {
    bot: ["La Malla es el mapa vivo de tu equipo y tus agentes IA: quién está activo, quién necesita revisión."],
    userReply: "Buenísimo",
  },
  {
    bot: [
      "Eso es todo por ahora. El Gemelo Digital operativo de verdad (con IA entrenada con tu propio Códice) todavía no existe — esto fue solo una demo del flujo.",
      "¡Gracias por probarlo!",
    ],
  },
];

const BG = "#0B141A";
const HEADER = "#202C33";
const BOT_BUBBLE = "#202C33";
const USER_BUBBLE = "#005C4B";

export default function OfficeDemoChat({ backHref }: { backHref: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [typing, setTyping] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [done, setDone] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  const botSay = useCallback(async (text: string, delay = 700) => {
    setTyping(true);
    await sleep(delay);
    setTyping(false);
    setMessages((m) => [...m, { id: crypto.randomUUID(), from: "bot", text, time: nowStr() }]);
  }, []);

  const runStep = useCallback(
    async (index: number) => {
      const step = SCRIPT[index];
      if (!step) return;
      for (const line of step.bot) {
        await botSay(line);
      }
      if (!step.userReply) setDone(true);
    },
    [botSay]
  );

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    runStep(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  function tapReply() {
    const step = SCRIPT[stepIndex];
    if (!step?.userReply) return;
    setMessages((m) => [...m, { id: crypto.randomUUID(), from: "user", text: step.userReply!, time: nowStr() }]);
    const next = stepIndex + 1;
    setStepIndex(next);
    runStep(next);
  }

  const currentReply = SCRIPT[stepIndex]?.userReply;

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: BG, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
      <div style={{ background: HEADER, padding: "calc(env(safe-area-inset-top,0px) + 12px) 16px 12px", display: "flex", alignItems: "center", gap: 12, flex: "none" }}>
        <Link href={backHref} aria-label="Volver a la Oficina" style={{ color: "#8696A0", fontSize: 20, textDecoration: "none" }}>
          ←
        </Link>
        <span style={{ width: 38, height: 38, borderRadius: 999, background: "linear-gradient(160deg,#E5C378,#C8A15A 55%,#99732B)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flex: "none" }}>
          🤖
        </span>
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <span style={{ color: "#E9EDEF", font: "600 14px 'Plus Jakarta Sans',sans-serif" }}>Tu Gemelo Digital</span>
          <span style={{ color: "#8696A0", font: "400 11px 'Plus Jakarta Sans',sans-serif" }}>{typing ? "escribiendo..." : "demo · simulación"}</span>
        </div>
      </div>

      <div ref={scrollRef} style={{ flex: "1 1 auto", overflowY: "auto", padding: "14px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
        {messages.map((m) => (
          <Bubble key={m.id} msg={m} />
        ))}
        {typing && (
          <div style={{ alignSelf: "flex-start", background: BOT_BUBBLE, borderRadius: "4px 14px 14px 14px", padding: "10px 14px", display: "flex", gap: 4 }}>
            <Dot delay={0} />
            <Dot delay={0.15} />
            <Dot delay={0.3} />
          </div>
        )}
      </div>

      <div style={{ flex: "none", padding: "10px 12px calc(env(safe-area-inset-bottom,0px) + 10px)", background: HEADER, display: "flex", alignItems: "center", gap: 8 }}>
        {done ? (
          <Link
            href={backHref}
            style={{
              width: "100%", padding: 14, border: "none", borderRadius: 999,
              background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)", color: "#0D0D0D",
              font: "700 12.5px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase",
              textAlign: "center", textDecoration: "none", display: "block",
            }}
          >
            Volver a tu Oficina
          </Link>
        ) : currentReply ? (
          <button
            type="button"
            onClick={tapReply}
            disabled={typing}
            style={{
              width: "100%", padding: 13, borderRadius: 999, border: "1px solid rgba(0,168,132,.5)",
              background: "rgba(0,168,132,.12)", color: "#00A884", font: "600 13px 'Plus Jakarta Sans',sans-serif",
              cursor: typing ? "default" : "pointer", opacity: typing ? 0.5 : 1,
            }}
          >
            {currentReply}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Bubble({ msg }: { msg: Msg }) {
  const isUser = msg.from === "user";
  const bubbleStyle: CSSProperties = {
    alignSelf: isUser ? "flex-end" : "flex-start",
    maxWidth: "78%",
    background: isUser ? USER_BUBBLE : BOT_BUBBLE,
    borderRadius: isUser ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
    padding: "9px 12px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  };
  return (
    <div style={bubbleStyle}>
      <span style={{ color: "#E9EDEF", font: "400 14px/1.4 'Plus Jakarta Sans',sans-serif", whiteSpace: "pre-wrap" }}>{msg.text}</span>
      <span style={{ alignSelf: "flex-end", color: "#8696A0", font: "400 10px 'Plus Jakarta Sans',sans-serif" }}>{msg.time}</span>
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      style={{
        width: 6, height: 6, borderRadius: 999, background: "#8696A0", display: "inline-block",
        animation: `softPulse 1s ease-in-out ${delay}s infinite`,
      }}
    />
  );
}
