import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentAdminScope } from "@/lib/auth";
import { createProgramAction } from "./actions";

export const dynamic = "force-dynamic";

// MasterN0-only: creating a Program (and, from each Program's own scoped
// dashboard, its N0 admins) is the one thing PLAN.md Fase 6 reserves
// exclusively for MasterN0 — a scoped admin gets bounced to their own
// Program's dashboard instead of seeing this at all.
export default async function AdminProgramsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const scope = await currentAdminScope();
  if (!scope) redirect("/admin/login");
  if (scope.programId) redirect(`/admin/programs/${scope.programId}`);

  const { error } = await searchParams;

  const programs = await prisma.program.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { memberships: true, cards: true, admins: true } },
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
        <Link href="/admin" style={{ color: "#C8A15A", font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".18em", textTransform: "uppercase" }}>
          ← Roster
        </Link>
        <h1 style={{ margin: 0, font: "500 18px 'Playfair Display',serif", color: "#F5F2EB" }}>Programas</h1>
        <span />
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 24 }}>
        <section style={{ background: "#201f1f", borderRadius: 14, padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 style={{ margin: 0, font: "600 14px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", color: "#F5F2EB" }}>
            Nuevo Programa
          </h2>
          {error === "name" && (
            <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>El nombre del Programa es obligatorio.</p>
          )}
          <form action={createProgramAction} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              name="name"
              placeholder="Nombre (ej. Mlqr)"
              required
              style={{ flex: "1 1 200px", background: "#0D0D0D", border: "1px solid rgba(200,161,90,.3)", borderRadius: 10, padding: "10px 14px", color: "#F5F2EB", font: "400 13px 'Plus Jakarta Sans',sans-serif", outline: "none" }}
            />
            <input
              name="slug"
              placeholder="slug (opcional)"
              style={{ flex: "1 1 140px", background: "#0D0D0D", border: "1px solid rgba(200,161,90,.3)", borderRadius: 10, padding: "10px 14px", color: "#F5F2EB", font: "400 13px 'Plus Jakarta Sans',sans-serif", outline: "none" }}
            />
            <button
              type="submit"
              style={{ padding: "10px 18px", border: "none", borderRadius: 10, background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)", color: "#0D0D0D", font: "700 11px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", cursor: "pointer" }}
            >
              Crear
            </button>
          </form>
        </section>

        <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {programs.length === 0 && (
            <p style={{ color: "#C2BEB5", font: "400 13px 'Plus Jakarta Sans',sans-serif" }}>Todavía no hay Programas.</p>
          )}
          {programs.map((p) => (
            <Link
              key={p.id}
              href={`/admin/programs/${p.id}`}
              style={{
                background: "#201f1f",
                borderRadius: 12,
                padding: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, font: "600 14px 'Plus Jakarta Sans',sans-serif", color: "#F5F2EB" }}>{p.name}</p>
                <p style={{ margin: 0, font: "400 11px 'Plus Jakarta Sans',sans-serif", color: "#C8A15A" }}>
                  {p.slug} · {p._count.memberships} miembros · {p._count.admins} N0
                </p>
              </div>
              <span className="material-symbols-outlined" style={{ color: "#C8A15A" }}>
                chevron_right
              </span>
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
}
