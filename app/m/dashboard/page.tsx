import Link from "next/link";
import { redirect } from "next/navigation";
import { currentMember } from "@/lib/memberAuth";
import { prisma } from "@/lib/prisma";
import { memberLogoutAction } from "@/app/m/actions";
import MemberEmailCapture from "@/components/MemberEmailCapture";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = {
  project: "Proyecto",
  company: "Empresa",
  personal: "Personal",
};
const KIND_ORDER = ["project", "company", "personal"];

export default async function MemberDashboardPage() {
  const member = await currentMember();
  if (!member) redirect("/m/login");

  const cards = await prisma.card.findMany({ where: { memberId: member.id } });
  const byKind = new Map(cards.map((c) => [c.kind, c]));

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

        <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "#9a8f80" }}>
            Mis Tarjetas
          </span>
          {cards.length === 0 && (
            <p style={{ margin: 0, font: "400 12px/1.6 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
              Se crean automáticamente cuando tu entrevista queda marcada como hecha.
            </p>
          )}
          {KIND_ORDER.map((kind) => {
            const card = byKind.get(kind);
            if (!card) return null;
            return (
              <div
                key={kind}
                style={{
                  background: "#201f1f",
                  borderRadius: 14,
                  padding: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                  <span style={{ font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "#C8A15A" }}>
                    {KIND_LABEL[kind]}
                  </span>
                  <span style={{ font: "400 12.5px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {card.name || card.slug}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "none" }}>
                  {kind !== "project" && (
                    <Link
                      href={`/m/dashboard/${kind}`}
                      style={{
                        padding: "7px 13px",
                        borderRadius: 999,
                        background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)",
                        color: "#0D0D0D",
                        font: "700 10px 'Plus Jakarta Sans',sans-serif",
                        letterSpacing: ".1em",
                        textTransform: "uppercase",
                      }}
                    >
                      Editar
                    </Link>
                  )}
                  <Link
                    href={`/c/${card.slug}`}
                    target="_blank"
                    style={{
                      padding: "7px 13px",
                      borderRadius: 999,
                      border: "1px solid rgba(200,161,90,.4)",
                      color: "#C8A15A",
                      font: "700 10px 'Plus Jakarta Sans',sans-serif",
                      letterSpacing: ".1em",
                      textTransform: "uppercase",
                    }}
                  >
                    Ver
                  </Link>
                </div>
              </div>
            );
          })}
        </section>

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
