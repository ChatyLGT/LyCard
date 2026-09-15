import { redirect } from "next/navigation";
import { currentMember } from "@/lib/memberAuth";
import { memberLogoutAction } from "@/app/m/actions";
import MemberEmailCapture from "@/components/MemberEmailCapture";

export const dynamic = "force-dynamic";

// Placeholder — the real dashboard (own project/company/personal cards,
// referral tree, etc.) is PLAN.md Fase 5/6. This just proves the Fase 1
// auth loop works end to end: login → session → protected page → logout.
export default async function MemberDashboardPage() {
  const member = await currentMember();
  if (!member) redirect("/m/login");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#131313",
        color: "#e5e2e1",
        fontFamily: "'Plus Jakarta Sans',sans-serif",
        padding: "40px 20px",
      }}
    >
      <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <span style={{ font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".24em", textTransform: "uppercase", color: "#C8A15A" }}>
            Legacy
          </span>
          <h1 style={{ margin: 0, font: "500 24px 'Playfair Display',serif", color: "#F5F2EB" }}>
            {member.name ? `Hola, ${member.name}` : "Bienvenido"}
          </h1>
        </div>

        {!member.email && (
          <section style={{ background: "#201f1f", borderRadius: 14, padding: 16 }}>
            <MemberEmailCapture />
          </section>
        )}

        <section style={{ background: "#201f1f", borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "#9a8f80" }}>
            Tu cuenta
          </span>
          <span style={{ font: "400 13px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>
            WhatsApp: {member.whatsapp || "— sin verificar —"}
          </span>
          <span style={{ font: "400 13px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>
            Email: {member.email || "— sin cargar —"}
          </span>
        </section>

        <p style={{ margin: 0, font: "400 12px/1.6 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
          Tus tarjetas de Proyecto / Empresa / Personal van a vivir acá — todavía no están construidas (PLAN.md Fase 5/6).
        </p>

        <form action={memberLogoutAction}>
          <button
            type="submit"
            style={{
              background: "none",
              border: "1px solid rgba(200,161,90,.3)",
              borderRadius: 999,
              padding: "8px 14px",
              color: "#C2BEB5",
              font: "600 10px 'Plus Jakarta Sans',sans-serif",
              letterSpacing: ".1em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  );
}
