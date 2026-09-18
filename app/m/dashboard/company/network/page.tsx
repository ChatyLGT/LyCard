import Link from "next/link";
import { redirect } from "next/navigation";
import { currentMemberId } from "@/lib/memberAuth";
import { prisma } from "@/lib/prisma";
import CardNotUnlocked from "@/components/CardNotUnlocked";
import MallaGraph from "@/components/MallaGraph";
import { TEAM_MALLA_NODES, TEAM_MALLA_EDGES, TEAM_MALLA_GHOSTS } from "@/lib/mallaData";
import { activateNetworkMembershipAction } from "./actions";

export const dynamic = "force-dynamic";

// The Company owner's own view of their client network (PLAN.md,
// "independencia por tarjeta", 2026-09-16) — Member-scoped twin of
// /admin/interviews, but only ever shows this one Card's own
// CardNetworkMembership rows, never another Company's.
export default async function CompanyNetworkPage({ searchParams }: { searchParams: Promise<{ activated?: string }> }) {
  const memberId = await currentMemberId();
  if (!memberId) redirect("/m/login");

  const { activated } = await searchParams;
  const card = await prisma.card.findFirst({ where: { memberId, kind: "company" } });
  if (!card) return <CardNotUnlocked label="de Empresa" />;

  const memberships = await prisma.cardNetworkMembership.findMany({
    where: { cardId: card.id },
    orderBy: { createdAt: "desc" },
    include: {
      member: true,
      registrations: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return (
    <div style={{ minHeight: "100vh", background: "#131313", color: "#e5e2e1", fontFamily: "'Plus Jakarta Sans',sans-serif", padding: "0 0 60px" }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "rgba(20,20,20,.96)",
          borderBottom: "1px solid rgba(200,161,90,.22)",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Link href="/m/dashboard/company" style={{ color: "#C8A15A", font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".18em", textTransform: "uppercase" }}>
          ← Mi Empresa
        </Link>
        <h1 style={{ margin: 0, font: "500 18px 'Playfair Display',serif", color: "#F5F2EB" }}>Mi Red de Clientes</h1>
        <span />
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
        <p style={{ margin: 0, font: "400 12px/1.6 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>
          Cada persona que agenda una reunión desde tu tarjeta queda acá. Marcala como hecha cuando la reunión
          real ocurra — eso activa su lugar en tu red y su nivel (N1) empieza a mostrarse en tu tarjeta.
        </p>
        {activated === "1" && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Activado.</p>}

        {/* Malla viva, modo operativo (PLAN.md Fase 12-B/I) — vista general en
            3D del equipo + agentes. Todavía con datos de demo (lib/mallaData.ts);
            la lista de abajo, con los clientes reales de esta Card, sigue siendo
            la fuente de verdad hasta que esto se conecte a datos reales. */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <span style={{ font: "600 8.5px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".16em", textTransform: "uppercase", color: "#756c5e" }}>
              Malla viva · tu equipo + tus agentes
            </span>
            <span style={{ font: "600 9px 'Plus Jakarta Sans',sans-serif", color: "#6FCF7A" }}>4 de 6 activos</span>
          </div>
          <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid rgba(200,161,90,.18)", background: "#0B0B0A" }}>
            <MallaGraph nodes={TEAM_MALLA_NODES} edges={TEAM_MALLA_EDGES} ghosts={TEAM_MALLA_GHOSTS} height={230} camRadius={130} maxRadius={320} repel={140} linkRest={40} fog={0.012} />
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5, font: "400 8.5px 'Plus Jakarta Sans',sans-serif", color: "#A79E8E" }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: "#F3F0E9" }} /> Humano
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 5, font: "400 8.5px 'Plus Jakarta Sans',sans-serif", color: "#A79E8E" }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: "#C8A15A" }} /> Agente IA
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 5, font: "400 8.5px 'Plus Jakarta Sans',sans-serif", color: "#A79E8E" }}>
              <span style={{ width: 7, height: 7, borderRadius: 999, background: "#6FCF7A", boxShadow: "0 0 6px #6FCF7A" }} /> Activo
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 5, font: "400 8.5px 'Plus Jakarta Sans',sans-serif", color: "#A79E8E" }}>
              <span style={{ width: 7, height: 7, borderRadius: 999, background: "#E0954B", boxShadow: "0 0 6px #E0954B" }} /> Necesita revisión
            </span>
          </div>
          <p style={{ margin: 0, font: "400 10px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A", textAlign: "center" }}>
            Vista general de demo — la lista de abajo es tu red real.
          </p>
        </div>

        {memberships.length === 0 && (
          <p style={{ color: "#C2BEB5", font: "400 13px 'Plus Jakarta Sans',sans-serif" }}>Todavía no agendó nadie.</p>
        )}
        {memberships.map((m) => {
          const isActive = m.status === "active";
          const lastRegistration = m.registrations[0];
          return (
            <div key={m.id} style={{ background: "#201f1f", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <span style={{ font: "700 13px 'Plus Jakarta Sans',sans-serif", color: "#F5F2EB" }}>
                  {m.member.name || m.member.whatsapp || "Sin nombre"}
                </span>
                <span
                  style={{
                    font: "700 10px 'Plus Jakarta Sans',sans-serif",
                    letterSpacing: ".08em",
                    textTransform: "uppercase",
                    color: isActive ? "#7BC98E" : "#C8A15A",
                  }}
                >
                  {isActive ? "✓ N1 activo" : "Invitado"}
                </span>
              </div>
              {lastRegistration && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, font: "400 11.5px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>
                  <span>{lastRegistration.slotLabel}</span>
                  <span>WhatsApp: {lastRegistration.whatsapp}</span>
                </div>
              )}
              <span style={{ font: "400 10px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
                Se sumó el {m.createdAt.toLocaleString("es-MX")}
              </span>

              {!isActive && (
                <form action={activateNetworkMembershipAction.bind(null, card.slug, m.id)}>
                  <button
                    type="submit"
                    style={{
                      background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)",
                      border: "none",
                      borderRadius: 999,
                      padding: "7px 14px",
                      color: "#0D0D0D",
                      font: "700 10px 'Plus Jakarta Sans',sans-serif",
                      letterSpacing: ".06em",
                      textTransform: "uppercase",
                      cursor: "pointer",
                    }}
                  >
                    Marcar reunión hecha
                  </button>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
