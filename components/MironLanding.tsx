import Link from "next/link";
import QrScannerLauncher from "@/components/QrScannerLauncher";

export type MironProgramOption = { id: string; name: string; cardSlug: string };

// Pantalla para "Tarjeta visitantes NA" (2026-10-05, pedido de Gunnar):
// alguien llegó a la raíz del sitio sin ningún host/referido -- caso
// distinto de Visitante (escaneó el QR de un host real, ver
// app/c/[slug]/page.tsx). Genérica y NO EDITABLE a propósito ("no puedes
// hacer nada aqui"): explica qué es Legacy en general, sin personalizar
// nada de ningún Programa puntual. En vez del QR de siempre (que no
// tiene sentido sin un host del que venir), dos caminos reales: escanear
// un QR físico con la cámara, o elegir un Programa activo de la lista.
export default function MironLanding({ programs }: { programs: MironProgramOption[] }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0D0D0D",
        color: "#F5F2EB",
        fontFamily: "'Plus Jakarta Sans',sans-serif",
        display: "flex",
        flexDirection: "column",
        padding: "calc(env(safe-area-inset-top,0px) + 32px) 24px calc(env(safe-area-inset-bottom,0px) + 32px)",
      }}
    >
      <div style={{ maxWidth: 420, width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: 22, flex: 1 }}>
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".3em", textTransform: "uppercase", color: "#C8A15A" }}>
            Legacy
          </span>
          <h1 style={{ margin: 0, font: "500 26px 'Playfair Display',serif", color: "#F5F2EB" }}>
            Tu tarjeta, tu legado
          </h1>
          <p style={{ margin: 0, font: "400 13.5px/1.7 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>
            LyCard es la tarjeta digital de Legacy: una Oficina Virtual, tu red,
            tu historia -- todo en un link. Cada persona o empresa tiene la
            suya, personalizada por quien la invita.
          </p>
        </div>

        <div style={{ background: "#201f1f", borderRadius: 16, padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          <span style={{ font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".12em", textTransform: "uppercase", color: "#9a8f80", textAlign: "center" }}>
            ¿Te compartieron un QR?
          </span>
          <QrScannerLauncher label="Escanear QR" />

          {programs.length > 0 && (
            <>
              <span style={{ font: "500 10.5px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A", textAlign: "center" }}>— o elegí tu Programa —</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {programs.map((p) => (
                  <Link
                    key={p.id}
                    href={`/c/${p.cardSlug}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: "1px solid rgba(200,161,90,.25)",
                      color: "#F5F2EB",
                      textDecoration: "none",
                      font: "600 13px 'Plus Jakarta Sans',sans-serif",
                    }}
                  >
                    {p.name}
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#C8A15A" }}>
                      chevron_right
                    </span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>

        <p style={{ margin: 0, font: "400 11px/1.6 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A", textAlign: "center" }}>
          Esta pantalla es genérica -- no es una tarjeta editable.
        </p>
      </div>
    </div>
  );
}
