import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { GOOGLE_PERMISSIONS } from "@/lib/googlePermissions";
import { isGoogleAuthConfigured } from "@/lib/googleOAuth";
import { canManageCardGoogle } from "@/lib/googleCardAccess";
import { disconnectGoogleAction } from "@/app/m/google/conectar/actions";

export const dynamic = "force-dynamic";

// Pantalla previa a Google (2026-10-13): lista cada permiso con para qué sirve
// y cuándo se usa, ANTES de mandar a la persona a la pantalla de Google. La
// autorización se hace con la cuenta de quien está conectando, nunca con la
// de otro.
export default async function ConectarGooglePage({
  searchParams,
}: {
  searchParams: Promise<{ cardId?: string; connected?: string; disconnected?: string; error?: string }>;
}) {
  const { cardId, connected, disconnected, error } = await searchParams;

  const shell = (children: React.ReactNode) => (
    <div
      style={{
        minHeight: "100vh",
        background: "#131313",
        color: "#e5e2e1",
        fontFamily: "'Plus Jakarta Sans',sans-serif",
        padding: "calc(env(safe-area-inset-top,0px) + 40px) 20px 40px",
      }}
    >
      <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>{children}</div>
    </div>
  );

  if (!cardId) {
    return shell(<p style={{ color: "#C2BEB5" }}>Falta indicar la tarjeta. Volvé a tu Oficina e intentalo de nuevo.</p>);
  }

  const access = await canManageCardGoogle(cardId);
  if (!access) {
    return shell(<p style={{ color: "#C2BEB5" }}>No tenés permiso para conectar la cuenta de Google de esta tarjeta.</p>);
  }

  const member = await prisma.member.findUnique({ where: { id: access.memberId } });
  const isConnected = Boolean(member?.googleRefreshToken);
  const configured = isGoogleAuthConfigured();
  const returnTo = `/m/google/conectar?cardId=${cardId}&connected=1`;
  const connectHref = `/m/auth/google/connect-start?cardId=${cardId}&returnTo=${encodeURIComponent(returnTo)}`;

  return shell(
    <>
      <div>
        <span style={{ font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".24em", textTransform: "uppercase", color: "#C8A15A" }}>
          Google
        </span>
        <h1 style={{ margin: 0, font: "500 22px 'Playfair Display',serif", color: "#F5F2EB" }}>Permisos de tu cuenta</h1>
        <p style={{ margin: "6px 0 0", font: "400 13px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>
          LyCard solo usa tu cuenta para lo que vos activás. Podés desconectarla cuando quieras.
        </p>
      </div>

      {connected === "1" && isConnected && (
        <p style={{ margin: 0, color: "#8fd19e", font: "600 12px 'Plus Jakarta Sans',sans-serif" }}>✓ Cuenta conectada.</p>
      )}
      {disconnected === "1" && (
        <p style={{ margin: 0, color: "#8fd19e", font: "600 12px 'Plus Jakarta Sans',sans-serif" }}>✓ Cuenta desconectada.</p>
      )}
      {error && (
        <p style={{ margin: 0, color: "#e5928a", font: "600 12px 'Plus Jakarta Sans',sans-serif" }}>
          No se pudo completar la acción ({error}). Probá de nuevo.
        </p>
      )}

      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {GOOGLE_PERMISSIONS.map((p) => (
          <li key={p.key} style={{ background: "#201f1f", borderRadius: 14, padding: 14, display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ font: "700 13px 'Plus Jakarta Sans',sans-serif", color: "#F5F2EB" }}>{p.label}</span>
            <span style={{ font: "400 12.5px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>Para qué: {p.para}</span>
            <span style={{ font: "400 12px 'Plus Jakarta Sans',sans-serif", color: "#9a8f80" }}>Cuándo se usa: {p.cuando}</span>
          </li>
        ))}
      </ul>

      {!configured && (
        <p style={{ margin: 0, color: "#e5928a", font: "400 12px 'Plus Jakarta Sans',sans-serif" }}>
          La conexión con Google todavía no está configurada en este entorno.
        </p>
      )}

      {configured && !isConnected && (
        <Link
          href={connectHref}
          style={{
            display: "block",
            textAlign: "center",
            padding: 12,
            borderRadius: 10,
            background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)",
            color: "#131313",
            font: "700 11px 'Plus Jakarta Sans',sans-serif",
            letterSpacing: ".08em",
            textTransform: "uppercase",
            textDecoration: "none",
          }}
        >
          Autorizar con Google
        </Link>
      )}

      {isConnected && (
        <form action={disconnectGoogleAction.bind(null, cardId)}>
          <button
            type="submit"
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 10,
              border: "1px solid rgba(229,146,138,.4)",
              background: "rgba(229,146,138,.12)",
              color: "#e5928a",
              font: "700 11px 'Plus Jakarta Sans',sans-serif",
              letterSpacing: ".08em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Desconectar mi cuenta de Google
          </button>
        </form>
      )}
    </>
  );
}
