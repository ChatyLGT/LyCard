import Link from "next/link";
import { redirect } from "next/navigation";
import { currentMember } from "@/lib/memberAuth";
import { prisma } from "@/lib/prisma";
import { memberLogoutAction } from "@/app/m/actions";
import MemberEmailCapture from "@/components/MemberEmailCapture";
import { findPromotedProgram } from "@/lib/programPromotion";

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

  const [cards, promotedProgram] = await Promise.all([
    prisma.card.findMany({ where: { memberId: member.id } }),
    findPromotedProgram(member.id),
  ]);
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
          <Link
            href="/m/dashboard/messages"
            style={{ alignSelf: "flex-start", marginTop: 6, font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", color: "#C8A15A" }}
          >
            Mensajes →
          </Link>
        </section>

        {promotedProgram && (
          <section
            style={{
              background: "linear-gradient(135deg,rgba(200,161,90,.18),rgba(200,161,90,.05))",
              border: "1px solid rgba(200,161,90,.4)",
              borderRadius: 14,
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <span style={{ font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".14em", textTransform: "uppercase", color: "#E5C378" }}>
              ✦ Ya tenés tu propio Programa
            </span>
            <p style={{ margin: 0, font: "400 12.5px/1.5 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>
              {promotedProgram.name} arrancó solo — administralo con la misma cuenta que ya usás acá, sin ningún login aparte.
            </p>
            <Link
              href={`/admin/programs/${promotedProgram.id}`}
              style={{
                alignSelf: "flex-start",
                padding: "8px 16px",
                borderRadius: 999,
                background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)",
                color: "#0D0D0D",
                font: "700 10.5px 'Plus Jakarta Sans',sans-serif",
                letterSpacing: ".08em",
                textTransform: "uppercase",
              }}
            >
              Administrar mi Programa
            </Link>
          </section>
        )}

        <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "#9a8f80" }}>
            Mis Tarjetas
          </span>
          {cards.length === 0 && (
            <p style={{ margin: 0, font: "400 12px/1.6 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
              Volvé a entrar con tu WhatsApp para que se terminen de crear.
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
                    {/* Card de proyecto (relación con Legacy) una vez que
                        el dueño ya tiene su propio Programa (arriba) --
                        no se borra ni se oculta, queda etiquetada como
                        origen (2026-09-24, "Programa Legado"). */}
                    {kind === "project" && promotedProgram && (
                      <span style={{ marginLeft: 6, color: "#8a8378", letterSpacing: "normal", textTransform: "none" }}>
                        · Programa Legado
                      </span>
                    )}
                  </span>
                  <span style={{ font: "400 12.5px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {card.name || card.slug}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "none" }}>
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
