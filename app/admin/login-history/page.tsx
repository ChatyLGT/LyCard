import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentAdminScope } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Bitácora de logins de Admin (2026-09-19, pedido de Gunnar) — solo
// MasterN0, mismo criterio que /admin/programs: es visibilidad sobre
// TODA la plataforma, no algo que un N0 de Programa deba ver de otros.
export default async function LoginHistoryPage() {
  const scope = await currentAdminScope();
  if (!scope) redirect("/admin/login");
  if (scope.programId) redirect("/admin");

  const events = await prisma.adminLoginEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div style={{ minHeight: "100vh", background: "#131313", color: "#e5e2e1", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          background: "rgba(20,20,20,.96)",
          borderBottom: "1px solid rgba(200,161,90,.22)",
          padding: "0 16px",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link
          href="/admin"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#eac076", font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".18em", textTransform: "uppercase" }}
        >
          ← Roster
        </Link>
        <h2 style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".24em", textTransform: "uppercase", color: "#C8A15A" }}>
          Bitácora de Login
        </h2>
        <span style={{ width: 60 }} />
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px 60px", display: "flex", flexDirection: "column", gap: 10 }}>
        <p style={{ margin: 0, font: "400 12px/1.6 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>
          Últimos {events.length} intentos de entrar al panel de Admin, con o sin éxito — password y Google, los dos métodos.
        </p>

        {events.length === 0 ? (
          <p style={{ margin: 0, font: "400 12px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>Todavía no hay registros.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {events.map((e) => (
              <div
                key={e.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "rgba(255,255,255,.03)",
                  border: `1px solid ${e.success ? "rgba(200,161,90,.2)" : "rgba(229,146,138,.3)"}`,
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                  <span style={{ font: "600 12px 'Plus Jakarta Sans',sans-serif", color: "#F5F2EB", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {e.email}
                  </span>
                  <span style={{ font: "400 10px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
                    {e.method === "google" ? "Google" : "Password"}
                    {e.reason ? ` · ${e.reason}` : ""}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0 }}>
                  <span style={{ font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".06em", textTransform: "uppercase", color: e.success ? "#8fd19e" : "#e5928a" }}>
                    {e.success ? "OK" : "Falló"}
                  </span>
                  <span style={{ font: "400 9.5px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
                    {e.createdAt.toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
