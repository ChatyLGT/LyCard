import Link from "next/link";

// Fusión de identidad, etapa 3 (2026-10-13, decisión de Gunnar: "todos
// deberían registrarse con Google solamente"). Una sola entrada para
// MasterN0, N0 de Programa y Orejas: el login de Member con Google. El
// destino (Panel, Admin o Dashboard) lo decide el rol que tenga la cuenta.
export default function GoogleOnlyLogin({ eyebrow, title, error, backHref }: { eyebrow: string; title: string; error?: string; backHref?: string }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#09090b", padding: 24, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 16, background: "#141414", border: "1px solid rgba(200,161,90,.3)", borderRadius: 20, padding: 28, boxShadow: "0 16px 40px rgba(0,0,0,.6)" }}>
        {backHref && (
          <Link href={backHref} style={{ alignSelf: "flex-start", font: "600 11px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".04em", color: "#8a8378", textDecoration: "none" }}>
            ← Volver
          </Link>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".24em", textTransform: "uppercase", color: "#C8A15A" }}>{eyebrow}</span>
          <h1 style={{ margin: 0, font: "500 22px 'Playfair Display',serif", color: "#F5F2EB" }}>{title}</h1>
        </div>
        {error && (
          <p style={{ margin: 0, color: "#e5928a", font: "500 12px 'Plus Jakarta Sans',sans-serif" }}>
            {error === "google_not_configured" ? "El login con Google no está configurado todavía." : "No se pudo completar el login con Google — probá de nuevo."}
          </p>
        )}
        <p style={{ margin: 0, font: "400 12.5px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>
          Se entra solo con Google. Tu rol en el Programa decide a qué pantalla llegás.
        </p>
        <a
          href="/m/auth/google/start"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 14, borderRadius: 12, background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)", color: "#0D0D0D", font: "700 12px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".14em", textTransform: "uppercase", textDecoration: "none" }}
        >
          Continuar con Google
        </a>
      </div>
    </div>
  );
}
