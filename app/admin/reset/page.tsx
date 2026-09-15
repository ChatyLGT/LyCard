import { redirect } from "next/navigation";
import Link from "next/link";
import { currentAdminScope } from "@/lib/auth";
import { resetPlatformAction } from "../reset-actions";

export const dynamic = "force-dynamic";

// MasterN0-only. Not linked from anywhere but a small "Zona de Riesgo"
// link on /admin/programs — reachable on purpose, not accidentally
// clickable.
export default async function AdminResetPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const scope = await currentAdminScope();
  if (!scope) redirect("/admin/login");
  if (scope.programId) redirect("/admin");

  const { error } = await searchParams;

  return (
    <div style={{ minHeight: "100vh", background: "#131313", color: "#e5e2e1", fontFamily: "'Plus Jakarta Sans',sans-serif", padding: "0 0 60px" }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "rgba(20,20,20,.96)",
          borderBottom: "1px solid rgba(229,146,138,.3)",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Link href="/admin/programs" style={{ color: "#e5928a", font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".18em", textTransform: "uppercase" }}>
          ← Programas
        </Link>
        <h1 style={{ margin: 0, font: "500 18px 'Playfair Display',serif", color: "#F5F2EB" }}>Zona de Riesgo</h1>
        <span />
      </div>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
        <section style={{ background: "#2a1a1a", border: "1px solid rgba(229,146,138,.4)", borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <h2 style={{ margin: 0, font: "700 15px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>
            Reiniciar la plataforma entera
          </h2>
          <p style={{ margin: 0, font: "400 13px/1.7 'Plus Jakarta Sans',sans-serif", color: "#e0d6d3" }}>
            Esto borra, sin vuelta atrás, TODO lo que hay en producción:
          </p>
          <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4, font: "400 12.5px/1.6 'Plus Jakarta Sans',sans-serif", color: "#e0d6d3" }}>
            <li>Todas las Cards (project, company, personal)</li>
            <li>Todos los Programas, su escalera de Puestos y sus escalas de Medallón/Sabiduría</li>
            <li>Todos los Members, sus Memberships y sus OriginMemento</li>
            <li>Todas las inscripciones a entrevistas (Registration)</li>
            <li>Todos los N0 acotados (Admin de Programa) — tu login MasterN0 no se toca</li>
          </ul>
          <p style={{ margin: 0, font: "600 12.5px/1.6 'Plus Jakarta Sans',sans-serif", color: "#F5F2EB" }}>
            Lo único que queda es una Card nueva, "MasterN0" — desde ahí arrancás de nuevo creando Programas en /admin/programs.
          </p>
          {error === "confirm" && (
            <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>
              Tenés que escribir exactamente BORRAR TODO para confirmar.
            </p>
          )}
          <form action={resetPlatformAction} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".14em", textTransform: "uppercase", color: "#C2BEB5" }}>
                Escribí BORRAR TODO para confirmar
              </span>
              <input
                name="confirm"
                autoComplete="off"
                style={{ background: "#0D0D0D", border: "1px solid rgba(229,146,138,.4)", borderRadius: 10, padding: "11px 14px", color: "#F5F2EB", font: "400 14px 'Plus Jakarta Sans',sans-serif", outline: "none" }}
              />
            </label>
            <button
              type="submit"
              style={{ padding: 14, border: "none", borderRadius: 12, background: "#b3413a", color: "#F5F2EB", font: "700 12px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".12em", textTransform: "uppercase", cursor: "pointer" }}
            >
              Borrar todo y crear MasterN0
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
