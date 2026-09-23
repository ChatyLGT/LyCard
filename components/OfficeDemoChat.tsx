"use client";

import { useState, useRef, useEffect, useCallback, useMemo, type CSSProperties } from "react";
import Link from "next/link";
import { buildGemeloScript, type GemeloContext, type GemeloNodeId } from "@/lib/gemeloDigitalScript";

type Msg = { id: string; from: "bot" | "user"; text: string; time: string };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const nowStr = () => new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

// Mismo lenguaje visual de WhatsApp que components/OnboardingChat.tsx
// (burbujas, "escribiendo...", timestamps), pero NO es ese componente:
// OnboardingChat está enganchado a OTP real y a joinLegacyProgramAction.
// Este sigue sin inputs libres ni llamadas a servidor — Bot Warren (pedido
// de Gunnar, 2026-09-23): la puerta al Gemelo Digital, el "CEO de tu
// Oficina", que arma respuestas simuladas usando datos reales de tu Card/
// Programa a partir de un menú de pedidos con respuesta sugerida (nunca
// texto libre) — ver lib/gemeloDigitalScript.ts para el guión real.
export default function OfficeDemoChat({ backHref, context }: { backHref: string; context: GemeloContext }) {
  const script = useMemo(() => buildGemeloScript(context), [context]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [typing, setTyping] = useState(false);
  const [nodeId, setNodeId] = useState<GemeloNodeId>("start");
  const [done, setDone] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  const botSay = useCallback(async (text: string, delay = 700) => {
    setTyping(true);
    await sleep(delay);
    setTyping(false);
    setMessages((m) => [...m, { id: crypto.randomUUID(), from: "bot", text, time: nowStr() }]);
  }, []);

  const enterNode = useCallback(
    async (id: GemeloNodeId) => {
      const node = script[id];
      for (const line of node.botLines) {
        await botSay(line);
      }
      setNodeId(id);
      if (node.options.length === 0) setDone(true);
    },
    [botSay, script]
  );

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    enterNode("start");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  function tapOption(label: string, next: GemeloNodeId) {
    setMessages((m) => [...m, { id: crypto.randomUUID(), from: "user", text: label, time: nowStr() }]);
    enterNode(next);
  }

  const currentOptions = script[nodeId]?.options ?? [];

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
          <span style={{ color: "#8696A0", font: "400 11px 'Plus Jakarta Sans',sans-serif" }}>{typing ? "escribiendo..." : "CEO de tu Oficina · simulación"}</span>
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

      <div style={{ flex: "none", padding: "10px 12px calc(env(safe-area-inset-bottom,0px) + 10px)", background: HEADER, display: "flex", flexDirection: "column", gap: 8 }}>
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
        ) : (
          currentOptions.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => tapOption(opt.label, opt.next)}
              disabled={typing}
              style={{
                width: "100%", padding: 13, borderRadius: 999, border: "1px solid rgba(0,168,132,.5)",
                background: "rgba(0,168,132,.12)", color: "#00A884", font: "600 13px 'Plus Jakarta Sans',sans-serif",
                cursor: typing ? "default" : "pointer", opacity: typing ? 0.5 : 1,
              }}
            >
              {opt.label}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

const BG = "#0B141A";
const HEADER = "#202C33";
const BOT_BUBBLE = "#202C33";
const USER_BUBBLE = "#005C4B";

function Bubble({ msg }: { msg: Msg }) {
  const isUser = msg.from === "user";
  // Las líneas de cierre "Simulación — ..." aclaran qué falta para que la
  // respuesta sea real (mismo criterio honesto que el resto de la
  // Oficina) — se muestran más chicas/atenuadas para distinguirlas del
  // contenido simulado en sí, sin agregar un tipo de mensaje nuevo.
  const isDisclaimer = !isUser && msg.text.startsWith("Simulación —");
  const bubbleStyle: CSSProperties = {
    alignSelf: isUser ? "flex-end" : "flex-start",
    maxWidth: "78%",
    background: isUser ? USER_BUBBLE : BOT_BUBBLE,
    borderRadius: isUser ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
    padding: "9px 12px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
    opacity: isDisclaimer ? 0.7 : 1,
  };
  return (
    <div style={bubbleStyle}>
      <span style={{ color: "#E9EDEF", font: `${isDisclaimer ? "400 11.5px/1.4" : "400 14px/1.4"} 'Plus Jakarta Sans',sans-serif`, whiteSpace: "pre-wrap" }}>{msg.text}</span>
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
