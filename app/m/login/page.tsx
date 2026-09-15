"use client";

import { useState, useTransition, Suspense, type CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { requestOtpAction, verifyOtpAction } from "@/app/m/actions";

const INPUT: CSSProperties = {
  background: "#0D0D0D",
  border: "1px solid rgba(200,161,90,.3)",
  borderRadius: 10,
  padding: "11px 14px",
  color: "#F5F2EB",
  font: "400 14px 'Plus Jakarta Sans',sans-serif",
  outline: "none",
};

const LABEL: CSSProperties = {
  font: "500 10px 'Plus Jakarta Sans',sans-serif",
  letterSpacing: ".16em",
  textTransform: "uppercase",
  color: "#C2BEB5",
};

const GOOGLE_ERROR_COPY: Record<string, string> = {
  google_not_configured: "El login con Google todavía no está activado.",
  google_state_mismatch: "Se venció el intento de login con Google — probá de nuevo.",
  google_failed: "No se pudo completar el login con Google.",
  google_no_email: "Tu cuenta de Google no devolvió un email.",
};

export default function MemberLoginPage() {
  return (
    <Suspense fallback={null}>
      <MemberLoginForm />
    </Suspense>
  );
}

function MemberLoginForm() {
  const router = useRouter();
  const [stage, setStage] = useState<"phone" | "verify">("phone");
  const [whatsapp, setWhatsapp] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [simulatedCode, setSimulatedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const searchParams = useSearchParams();
  const googleError = GOOGLE_ERROR_COPY[searchParams.get("error") || ""] ?? null;

  function submitPhone() {
    setError(null);
    if (!whatsapp.trim()) return setError("Ingresá tu WhatsApp.");
    startTransition(async () => {
      const res = await requestOtpAction({ whatsapp });
      if (res.ok) {
        setSimulatedCode(res.simulatedCode);
        setStage("verify");
      } else {
        setError("No se pudo generar el código, probá de nuevo.");
      }
    });
  }

  function submitCode() {
    setError(null);
    if (!code.trim()) return setError("Ingresá el código.");
    startTransition(async () => {
      const res = await verifyOtpAction({ whatsapp, code, name });
      if (res.ok) {
        router.push("/m/dashboard");
      } else {
        setError("Código inválido o vencido.");
      }
    });
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#09090b",
        padding: 24,
        fontFamily: "'Plus Jakarta Sans',sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          background: "#141414",
          border: "1px solid rgba(200,161,90,.3)",
          borderRadius: 20,
          padding: 28,
          boxShadow: "0 16px 40px rgba(0,0,0,.6)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 4 }}>
          <span style={{ font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".24em", textTransform: "uppercase", color: "#C8A15A" }}>
            Legacy
          </span>
          <h1 style={{ margin: 0, font: "500 22px 'Playfair Display',serif", color: "#F5F2EB" }}>
            Tu cuenta
          </h1>
        </div>

        {googleError && (
          <p style={{ margin: 0, color: "#e5928a", font: "500 12px 'Plus Jakarta Sans',sans-serif" }}>{googleError}</p>
        )}

        {stage === "phone" ? (
          <>
            <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={LABEL}>WhatsApp</span>
              <input
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+52 998 000 0000"
                autoFocus
                style={INPUT}
              />
            </label>
            {error && <span style={{ font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>{error}</span>}
            <button
              type="button"
              onClick={submitPhone}
              disabled={pending}
              style={{
                padding: 14,
                border: "none",
                borderRadius: 12,
                background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)",
                color: "#0D0D0D",
                font: "700 12px 'Plus Jakarta Sans',sans-serif",
                letterSpacing: ".14em",
                textTransform: "uppercase",
                cursor: pending ? "default" : "pointer",
                opacity: pending ? 0.7 : 1,
              }}
            >
              {pending ? "..." : "Enviar código"}
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0" }}>
              <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,.1)" }} />
              <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>o</span>
              <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,.1)" }} />
            </div>

            <a
              href="/m/auth/google/start"
              style={{
                padding: 13,
                borderRadius: 12,
                background: "#1c1b1b",
                border: "1px solid rgba(255,255,255,.12)",
                color: "#F5F2EB",
                font: "600 12px 'Plus Jakarta Sans',sans-serif",
                letterSpacing: ".08em",
                textAlign: "center",
                textDecoration: "none",
              }}
            >
              Continuar con Google
            </a>
          </>
        ) : (
          <>
            <div
              style={{
                padding: 12,
                borderRadius: 12,
                background: "#0D0D0D",
                border: "1px solid rgba(200,161,90,.25)",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "#9a8f80" }}>
                Simulado — en producción te llegaría por WhatsApp
              </span>
              <span style={{ font: "700 22px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".2em", color: "#E5C378" }}>
                {simulatedCode}
              </span>
            </div>

            <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={LABEL}>Código</span>
              <input value={code} onChange={(e) => setCode(e.target.value)} autoFocus style={INPUT} />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={LABEL}>Tu nombre (si es la primera vez)</span>
              <input value={name} onChange={(e) => setName(e.target.value)} style={INPUT} />
            </label>

            {error && <span style={{ font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>{error}</span>}

            <button
              type="button"
              onClick={submitCode}
              disabled={pending}
              style={{
                padding: 14,
                border: "none",
                borderRadius: 12,
                background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)",
                color: "#0D0D0D",
                font: "700 12px 'Plus Jakarta Sans',sans-serif",
                letterSpacing: ".14em",
                textTransform: "uppercase",
                cursor: pending ? "default" : "pointer",
                opacity: pending ? 0.7 : 1,
              }}
            >
              {pending ? "..." : "Confirmar"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStage("phone");
                setError(null);
              }}
              style={{ background: "none", border: "none", color: "#9a8f80", font: "600 11px 'Plus Jakarta Sans',sans-serif", cursor: "pointer" }}
            >
              ← Cambiar número
            </button>
          </>
        )}
      </div>
    </div>
  );
}
