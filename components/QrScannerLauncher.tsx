"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

// Escáner real de cámara (2026-10-05, pedido de Gunnar: "el QR no es
// QR.. es un lenta.. que si lo picas abre la camara para que puedas
// escanear un QR"). jsQR en vez de la BarcodeDetector nativa del
// navegador a propósito -- BarcodeDetector no corre en Safari/iOS, y la
// audiencia documentada de LyCard es mayoría iPhone (ver PLAN.md, fixes
// "iPhone 11/13"). jsQR decodifica pixel a pixel desde un <canvas>, así
// que funciona igual en cualquier navegador con getUserMedia.
export default function QrScannerLauncher({ label }: { label: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;

    let stopped = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (stopped) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        tick();
      } catch {
        setError("Sin acceso a la cámara. Dale permiso o elegí tu Programa de la lista abajo.");
      }
    }

    function tick() {
      if (stopped) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const result = jsQR(frame.data, frame.width, frame.height);
          if (result && /^https?:\/\//i.test(result.data)) {
            stopped = true;
            window.location.href = result.data;
            return;
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    start();

    return () => {
      stopped = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "14px 20px",
          borderRadius: 999,
          border: "none",
          background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)",
          color: "#0D0D0D",
          font: "700 11px 'Plus Jakarta Sans',sans-serif",
          letterSpacing: ".1em",
          textTransform: "uppercase",
          cursor: "pointer",
          width: "100%",
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
          qr_code_scanner
        </span>
        {label}
      </button>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 1000, display: "flex", flexDirection: "column" }}>
      <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>
        <video ref={videoRef} muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <canvas ref={canvasRef} style={{ display: "none" }} />
        <div
          style={{
            position: "absolute",
            inset: "15% 18%",
            border: "2px solid rgba(200,161,90,.85)",
            borderRadius: 16,
            boxShadow: "0 0 0 2000px rgba(0,0,0,.35)",
          }}
        />
      </div>
      <div style={{ padding: "16px 20px calc(env(safe-area-inset-bottom,0px) + 16px)", background: "#0D0D0D", display: "flex", flexDirection: "column", gap: 10 }}>
        {error ? (
          <p style={{ margin: 0, font: "500 12.5px/1.5 'Plus Jakarta Sans',sans-serif", color: "#e5928a", textAlign: "center" }}>{error}</p>
        ) : (
          <p style={{ margin: 0, font: "500 12px 'Plus Jakarta Sans',sans-serif", color: "#8a8378", textAlign: "center" }}>Apuntá la cámara al QR</p>
        )}
        <button
          type="button"
          onClick={() => setOpen(false)}
          style={{ padding: "10px 18px", borderRadius: 999, border: "1px solid rgba(200,161,90,.4)", background: "none", color: "#C8A15A", font: "700 10.5px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", cursor: "pointer" }}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
