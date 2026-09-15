"use client";

import { useState, useRef, useEffect, useCallback, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { requestOtpAction, verifyOtpAction, updateMemberEmailAction } from "@/app/m/actions";
import { joinLegacyProgramAction } from "@/app/m/onboarding/actions";

type Msg = {
  id: string;
  from: "bot" | "user";
  kind: "text" | "audio";
  text?: string;
  audioUrl?: string;
  time: string;
};

type Step = "name" | "whatsapp" | "otp" | "email" | "done";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const nowStr = () => new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

// WhatsApp's own dark-theme palette — chosen deliberately over the app's
// gold/black so this genuinely reads as "a WhatsApp chat", per the ask.
const BG = "#0B141A";
const HEADER = "#202C33";
const BOT_BUBBLE = "#202C33";
const USER_BUBBLE = "#005C4B";

export default function OnboardingChat({ referredByCardSlug }: { referredByCardSlug: string | null }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [typing, setTyping] = useState(false);
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [inputText, setInputText] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const botSay = useCallback(async (text: string, delay = 700) => {
    setTyping(true);
    await sleep(delay);
    setTyping(false);
    setMessages((m) => [...m, { id: crypto.randomUUID(), from: "bot", kind: "text", text, time: nowStr() }]);
  }, []);

  const userSay = useCallback((text: string) => {
    setMessages((m) => [...m, { id: crypto.randomUUID(), from: "user", kind: "text", text, time: nowStr() }]);
  }, []);

  const userAudio = useCallback((audioUrl: string) => {
    setMessages((m) => [...m, { id: crypto.randomUUID(), from: "user", kind: "audio", audioUrl, time: nowStr() }]);
  }, []);

  const greeted = useRef(false);
  useEffect(() => {
    if (greeted.current) return; // guards against React Strict Mode's double effect in dev
    greeted.current = true;
    (async () => {
      await botSay("¡Hola! 👋 Soy el asistente de invitación de Legacy.");
      await botSay("Para armar tu LyCard necesito algunos datos rápidos — menos de un minuto.");
      await botSay("Para arrancar: ¿cómo te llamás? Podés mandarme un audio o escribirlo abajo.");
    })();
  }, [botSay]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  const handleAudioSent = useCallback(
    async (blob: Blob) => {
      const url = URL.createObjectURL(blob);
      userAudio(url);
      setBusy(true);
      await botSay("Transcribiendo tu audio...", 1300);
      await botSay(
        "Todavía no puedo escuchar audios de verdad — eso se conecta con WhatsApp real más adelante. Mientras tanto, escribime tu nombre abajo para seguir 👇"
      );
      setBusy(false);
    },
    [botSay, userAudio]
  );

  async function toggleRecording() {
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        handleAudioSent(blob);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch {
      await botSay("No pude acceder al micrófono — sin drama, escribime tu nombre abajo.");
    }
  }

  async function handleSend() {
    const value = inputText.trim();
    if (!value || busy || step === "done") return;
    setInputText("");
    userSay(value);
    setBusy(true);
    try {
      if (step === "name") {
        setName(value);
        await botSay(`Un gusto, ${value}. 🙌`);
        await botSay("Ahora pasame tu WhatsApp (con código de país) para verificar tu cuenta.");
        setStep("whatsapp");
      } else if (step === "whatsapp") {
        setWhatsapp(value);
        const res = await requestOtpAction({ whatsapp: value });
        if (res.ok) {
          await botSay(`Te mandaría un código por WhatsApp — como esto es una demo, acá lo tenés: ${res.simulatedCode}`);
          await botSay("Escribilo para confirmar.");
          setStep("otp");
        } else {
          await botSay("No pude generar el código, probá de nuevo.");
        }
      } else if (step === "otp") {
        const res = await verifyOtpAction({ whatsapp, code: value, name });
        if (res.ok) {
          await botSay("¡Verificado! ✅");
          await botSay("Último dato: tu email, para que te lleguen novedades del programa.");
          setStep("email");
        } else {
          await botSay("Ese código no es válido o venció. ¿Lo escribiste bien?");
        }
      } else if (step === "email") {
        const res = await updateMemberEmailAction({ email: value });
        if (res.ok) {
          await joinLegacyProgramAction({ referredByCardSlug });
          await botSay(`¡Listo, ${name}! Ya sos parte del círculo Legacy. 🎉`);
          await botSay("Ahora seguimos con tu entrevista para activar tu LyCard personal.");
          setStep("done");
        } else {
          await botSay("Ese email no parece válido — probá de nuevo.");
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: BG, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
      {/* Header */}
      <div
        style={{
          background: HEADER,
          padding: "calc(env(safe-area-inset-top,0px) + 12px) 16px 12px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flex: "none",
        }}
      >
        <span
          style={{
            width: 38,
            height: 38,
            borderRadius: 999,
            background: "linear-gradient(160deg,#E5C378,#C8A15A 55%,#99732B)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            flex: "none",
          }}
        >
          🤖
        </span>
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <span style={{ color: "#E9EDEF", font: "600 14px 'Plus Jakarta Sans',sans-serif" }}>Asistente Legacy</span>
          <span style={{ color: "#8696A0", font: "400 11px 'Plus Jakarta Sans',sans-serif" }}>
            {typing ? "escribiendo..." : "en línea"}
          </span>
        </div>
      </div>

      {/* Messages */}
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

      {/* Input */}
      <div style={{ flex: "none", padding: "10px 12px calc(env(safe-area-inset-bottom,0px) + 10px)", background: HEADER, display: "flex", alignItems: "center", gap: 8 }}>
        {step === "done" ? (
          <button
            type="button"
            onClick={() => router.push("/m/dashboard")}
            style={{
              width: "100%",
              padding: 14,
              border: "none",
              borderRadius: 999,
              background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)",
              color: "#0D0D0D",
              font: "700 12.5px 'Plus Jakarta Sans',sans-serif",
              letterSpacing: ".1em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Ir a mi cuenta
          </button>
        ) : (
          <>
            {step === "name" && (
              <button
                type="button"
                onClick={toggleRecording}
                aria-label={recording ? "Detener grabación" : "Grabar audio"}
                style={{
                  flex: "none",
                  width: 42,
                  height: 42,
                  borderRadius: 999,
                  border: "none",
                  background: recording ? "#e5928a" : "#2A3942",
                  color: "#E9EDEF",
                  fontSize: 18,
                  cursor: "pointer",
                  animation: recording ? "softPulse 1s ease-in-out infinite" : undefined,
                }}
              >
                {recording ? "⏹" : "🎤"}
              </button>
            )}
            <input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend();
              }}
              placeholder={step === "otp" ? "Código de 6 dígitos" : step === "whatsapp" ? "+52 998 000 0000" : step === "email" ? "nombre@correo.com" : "Escribí acá..."}
              disabled={busy}
              style={{
                flex: 1,
                minWidth: 0,
                background: "#2A3942",
                border: "none",
                borderRadius: 999,
                padding: "11px 16px",
                color: "#E9EDEF",
                font: "400 14px 'Plus Jakarta Sans',sans-serif",
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={busy || !inputText.trim()}
              aria-label="Enviar"
              style={{
                flex: "none",
                width: 42,
                height: 42,
                borderRadius: 999,
                border: "none",
                background: "#00A884",
                color: "#0B141A",
                fontSize: 17,
                cursor: busy || !inputText.trim() ? "default" : "pointer",
                opacity: busy || !inputText.trim() ? 0.5 : 1,
              }}
            >
              ➤
            </button>
          </>
        )}
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
      {msg.kind === "audio" ? (
        <audio controls src={msg.audioUrl} style={{ width: 220, height: 32 }} />
      ) : (
        <span style={{ color: "#E9EDEF", font: "400 14px/1.4 'Plus Jakarta Sans',sans-serif", whiteSpace: "pre-wrap" }}>{msg.text}</span>
      )}
      <span style={{ alignSelf: "flex-end", color: "#8696A0", font: "400 10px 'Plus Jakarta Sans',sans-serif" }}>{msg.time}</span>
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      style={{
        width: 6,
        height: 6,
        borderRadius: 999,
        background: "#8696A0",
        display: "inline-block",
        animation: `softPulse 1s ease-in-out ${delay}s infinite`,
      }}
    />
  );
}
