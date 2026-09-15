import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentAdminScope } from "@/lib/auth";
import { completeInterviewAction } from "./actions";

export const dynamic = "force-dynamic";

// MasterN0 sees every registration across every Program here. A scoped
// Program N0 manages interviews from their own /admin/programs/[id]
// instead (PLAN.md Fase 6) — this global view would otherwise leak other
// Programs' data to them.
export default async function AdminInterviewsPage() {
  const scope = await currentAdminScope();
  if (!scope) redirect("/admin/login");
  if (scope.programId) redirect(`/admin/programs/${scope.programId}`);

  const registrations = await prisma.registration.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      card: { select: { name: true, slug: true } },
      membership: { include: { member: true } },
    },
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#131313",
        color: "#e5e2e1",
        fontFamily: "'Plus Jakarta Sans',sans-serif",
        padding: "0 0 60px",
      }}
    >
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
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link
            href="/admin"
            style={{ color: "#C8A15A", font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".18em", textTransform: "uppercase" }}
          >
            ← Roster
          </Link>
        </div>
        <h1 style={{ margin: 0, font: "500 18px 'Playfair Display',serif", color: "#F5F2EB" }}>
          Inscriptos a Entrevistas
        </h1>
        <span />
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
        {registrations.length === 0 && (
          <p style={{ color: "#C2BEB5", font: "400 13px 'Plus Jakarta Sans',sans-serif" }}>
            Todavía no hay inscripciones.
          </p>
        )}
        {registrations.map((r) => {
          const membership = r.membership;
          const isActive = membership?.status === "active";
          return (
            <div key={r.id} style={{ background: "#201f1f", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <span style={{ font: "700 13px 'Plus Jakarta Sans',sans-serif", color: "#F5F2EB" }}>{r.name}</span>
                <span style={{ font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", color: "#C8A15A" }}>
                  {r.slotLabel}
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, font: "400 11.5px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>
                <span>WhatsApp: {r.whatsapp}</span>
                {r.email && <span>Email: {r.email}</span>}
                <span>
                  Vía:{" "}
                  <Link href={`/c/${r.card.slug}`} style={{ color: "#C8A15A" }}>
                    {r.card.name || r.card.slug}
                  </Link>
                </span>
              </div>
              <span style={{ font: "400 10px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
                {r.createdAt.toLocaleString("es-MX")}
              </span>

              {membership && (
                <div
                  style={{
                    marginTop: 8,
                    paddingTop: 10,
                    borderTop: "1px solid rgba(255,255,255,.06)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      font: "700 10px 'Plus Jakarta Sans',sans-serif",
                      letterSpacing: ".08em",
                      textTransform: "uppercase",
                      color: isActive ? "#7BC98E" : "#C8A15A",
                    }}
                  >
                    {isActive ? "✓ Membership activa" : "Membership: invitado"}
                  </span>
                  {!isActive && (
                    <form action={completeInterviewAction.bind(null, r.id, "/admin/interviews")}>
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
                        Marcar entrevista hecha
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
