import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentAdminScope } from "@/lib/auth";
import { logoutAction } from "@/app/admin/actions";
import { completeInterviewAction } from "@/app/admin/interviews/actions";
import { updateProgramAction, createProgramAdminAction } from "../actions";

export const dynamic = "force-dynamic";

const CHANNEL_FIELDS = ["wa", "ig", "li", "x", "fb", "tiktok", "yt", "web"] as const;

// A Program's own scoped dashboard (PLAN.md Fase 6): branding, its Members,
// and its interview queue. MasterN0 can open any Program's; a scoped
// Program N0 only their own — everything here is filtered to this one
// Program, which is the whole point of the permissions layer.
export default async function AdminProgramDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; adminCreated?: string; activated?: string }>;
}) {
  const { id } = await params;
  const { saved, adminCreated, activated } = await searchParams;

  const scope = await currentAdminScope();
  if (!scope) redirect("/admin/login");
  const isMasterN0 = scope.programId === null;
  if (!isMasterN0 && scope.programId !== id) redirect(`/admin/programs/${scope.programId}`);

  const program = await prisma.program.findUnique({
    where: { id },
    include: {
      admins: { orderBy: { createdAt: "asc" } },
      memberships: {
        orderBy: { createdAt: "desc" },
        include: { member: { include: { cards: true } }, referredBy: { include: { member: true } } },
      },
    },
  });
  if (!program) notFound();

  const registrations = await prisma.registration.findMany({
    where: { card: { programId: id } },
    orderBy: { createdAt: "desc" },
    include: { card: { select: { name: true, slug: true } }, membership: true },
  });
  const returnTo = `/admin/programs/${id}`;

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
        {isMasterN0 ? (
          <Link href="/admin/programs" style={{ color: "#C8A15A", font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".18em", textTransform: "uppercase" }}>
            ← Programas
          </Link>
        ) : (
          <span style={{ color: "#C8A15A", font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".18em", textTransform: "uppercase" }}>
            N0 · {program.name}
          </span>
        )}
        <h1 style={{ margin: 0, font: "500 18px 'Playfair Display',serif", color: "#F5F2EB" }}>{program.name}</h1>
        <form action={logoutAction}>
          <button
            type="submit"
            style={{ background: "none", border: "1px solid rgba(200,161,90,.3)", borderRadius: 999, padding: "8px 14px", color: "#C2BEB5", font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", cursor: "pointer" }}
          >
            Cerrar sesión
          </button>
        </form>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Branding */}
        <section style={{ background: "#201f1f", borderRadius: 14, padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 style={{ margin: 0, font: "600 14px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", color: "#F5F2EB" }}>
            Marca del Programa
          </h2>
          {saved && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Guardado.</p>}
          <form action={updateProgramAction.bind(null, program.id)} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".16em", textTransform: "uppercase", color: "#C2BEB5" }}>Nombre</span>
              <input name="name" defaultValue={program.name} style={{ background: "#0D0D0D", border: "1px solid rgba(200,161,90,.3)", borderRadius: 10, padding: "10px 14px", color: "#F5F2EB", font: "400 13px 'Plus Jakarta Sans',sans-serif", outline: "none" }} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".16em", textTransform: "uppercase", color: "#C2BEB5" }}>Color primario</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="color" name="primaryColor" defaultValue={program.primaryColor} style={{ width: 40, height: 34, border: "none", borderRadius: 8, background: "none", padding: 0 }} />
                <span style={{ font: "400 12px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>{program.primaryColor}</span>
              </div>
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
              {CHANNEL_FIELDS.map((ch) => (
                <label key={ch} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".16em", textTransform: "uppercase", color: "#C2BEB5" }}>{ch}</span>
                  <input name={ch} defaultValue={program[ch]} style={{ background: "#0D0D0D", border: "1px solid rgba(200,161,90,.3)", borderRadius: 10, padding: "9px 12px", color: "#F5F2EB", font: "400 12.5px 'Plus Jakarta Sans',sans-serif", outline: "none" }} />
                </label>
              ))}
            </div>
            <button
              type="submit"
              style={{ marginTop: 4, padding: 13, border: "none", borderRadius: 10, background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)", color: "#0D0D0D", font: "700 11px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", cursor: "pointer" }}
            >
              Guardar
            </button>
          </form>
        </section>

        {/* N0 admins — MasterN0 only, per PLAN.md Fase 6 */}
        {isMasterN0 && (
          <section style={{ background: "#201f1f", borderRadius: 14, padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
            <h2 style={{ margin: 0, font: "600 14px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", color: "#F5F2EB" }}>
              N0 de este Programa
            </h2>
            {adminCreated && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ N0 creado.</p>}
            {program.admins.length === 0 && (
              <p style={{ margin: 0, font: "400 12px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>Todavía no tiene N0 asignado — sos vos (MasterN0) quien lo administra.</p>
            )}
            {program.admins.map((a) => (
              <div key={a.id} style={{ font: "400 12.5px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>
                {a.email}
              </div>
            ))}
            <form action={createProgramAdminAction} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
              <input type="hidden" name="programId" value={program.id} />
              <input name="email" type="email" placeholder="Email del N0" required style={{ flex: "1 1 160px", background: "#0D0D0D", border: "1px solid rgba(200,161,90,.3)", borderRadius: 10, padding: "9px 12px", color: "#F5F2EB", font: "400 12.5px 'Plus Jakarta Sans',sans-serif", outline: "none" }} />
              <input name="password" type="password" placeholder="Contraseña (8+ caracteres)" required style={{ flex: "1 1 160px", background: "#0D0D0D", border: "1px solid rgba(200,161,90,.3)", borderRadius: 10, padding: "9px 12px", color: "#F5F2EB", font: "400 12.5px 'Plus Jakarta Sans',sans-serif", outline: "none" }} />
              <button type="submit" style={{ padding: "9px 16px", border: "none", borderRadius: 10, background: "#353534", color: "#F5F2EB", font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", cursor: "pointer" }}>
                Agregar N0
              </button>
            </form>
          </section>
        )}

        {/* Members */}
        <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 style={{ margin: 0, font: "600 14px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", color: "#F5F2EB" }}>
            Miembros ({program.memberships.length})
          </h2>
          {program.memberships.length === 0 && <p style={{ color: "#5A5A5A", font: "400 12.5px 'Plus Jakarta Sans',sans-serif" }}>Todavía no hay miembros.</p>}
          {program.memberships.map((m) => {
            const projectCard = m.member.cards.find((c) => c.kind === "project");
            return (
              <div key={m.id} style={{ background: "#201f1f", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ font: "700 13px 'Plus Jakarta Sans',sans-serif", color: "#F5F2EB" }}>{m.member.name || "(sin nombre)"}</span>
                  <span style={{ font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", color: m.status === "active" ? "#7BC98E" : "#C8A15A" }}>
                    {m.status === "active" ? "Activo" : "Invitado"}
                  </span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, font: "400 11.5px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>
                  {m.member.whatsapp && <span>WhatsApp: {m.member.whatsapp}</span>}
                  {m.member.email && <span>Email: {m.member.email}</span>}
                  {m.referredBy && <span>Referido por: {m.referredBy.member.name}</span>}
                  {projectCard && (
                    <Link href={`/c/${projectCard.slug}`} style={{ color: "#C8A15A" }}>
                      /c/{projectCard.slug}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        {/* Interviews */}
        <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 style={{ margin: 0, font: "600 14px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", color: "#F5F2EB" }}>
            Inscriptos a Entrevistas ({registrations.length})
          </h2>
          {activated && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Membership activada.</p>}
          {registrations.length === 0 && <p style={{ color: "#5A5A5A", font: "400 12.5px 'Plus Jakarta Sans',sans-serif" }}>Todavía no hay inscripciones.</p>}
          {registrations.map((r) => {
            const isActive = r.membership?.status === "active";
            return (
              <div key={r.id} style={{ background: "#201f1f", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ font: "700 13px 'Plus Jakarta Sans',sans-serif", color: "#F5F2EB" }}>{r.name}</span>
                  <span style={{ font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", color: "#C8A15A" }}>{r.slotLabel}</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, font: "400 11.5px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>
                  <span>WhatsApp: {r.whatsapp}</span>
                  {r.email && <span>Email: {r.email}</span>}
                </div>
                {r.membership && (
                  <div style={{ marginTop: 8, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,.06)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", color: isActive ? "#7BC98E" : "#C8A15A" }}>
                      {isActive ? "✓ Membership activa" : "Membership: invitado"}
                    </span>
                    {!isActive && (
                      <form action={completeInterviewAction.bind(null, r.id, returnTo)}>
                        <button type="submit" style={{ background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)", border: "none", borderRadius: 999, padding: "7px 14px", color: "#0D0D0D", font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".06em", textTransform: "uppercase", cursor: "pointer" }}>
                          Marcar entrevista hecha
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}
