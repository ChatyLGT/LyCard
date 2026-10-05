import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentAdminScope, isMasterN0Scope } from "@/lib/auth";
import { generateDemoDataAction, deleteAllDemoDataAction } from "./actions";
import { MAX_DEMO_COUNT } from "@/lib/demoData";

export const dynamic = "force-dynamic";

// MasterN0-only, mismo criterio de acceso que /admin/reset — el ambiente
// de datos mock (Fase E5) para poder probar la plataforma llena de
// Programas/Cards sin tener que crear todo a mano cada vez. Nunca tocado
// desde el flujo normal del roster real.
export default async function AdminDemoDataPage({
  searchParams,
}: {
  searchParams: Promise<{ generated?: string; deleted?: string; error?: string }>;
}) {
  const scope = await currentAdminScope();
  if (!scope) redirect("/admin/login");
  if (!isMasterN0Scope(scope)) redirect("/admin");

  const { generated, deleted, error } = await searchParams;

  const [demoProgramCount, demoCardCount] = await Promise.all([
    prisma.program.count({ where: { isDemo: true } }),
    prisma.card.count({ where: { isDemo: true } }),
  ]);

  return (
    <div style={{ minHeight: "100vh", background: "#131313", color: "#e5e2e1", fontFamily: "'Plus Jakarta Sans',sans-serif", padding: "0 0 60px" }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "rgba(20,20,20,.96)",
          borderBottom: "1px solid rgba(200,161,90,.22)",
          // Fix (2026-10-05, reportado por Gunnar): sticky top:0 sin
          // compensar notch/isla dinámica -- mismo patrón que
          // MemberCardEditor.tsx.
          padding: "calc(env(safe-area-inset-top,0px) + 16px) 20px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Link href="/admin/programs" style={{ color: "#C8A15A", font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".18em", textTransform: "uppercase" }}>
          ← Programas
        </Link>
        <h1 style={{ margin: 0, font: "500 18px 'Playfair Display',serif", color: "#F5F2EB" }}>Datos de Demo</h1>
        <span />
      </div>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
        <p style={{ margin: 0, font: "400 12.5px/1.7 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>
          Genera Programas y Cards de prueba (una de cada tipo: Legacy, Business, Personal) para probar la plataforma
          llena sin crear todo a mano. Todo queda marcado <strong>DEMO</strong> en el roster y en /admin/programs —
          nunca se mezcla con datos reales, y se puede borrar todo de un tirón cuando termines.
        </p>

        <section style={{ background: "#201f1f", borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <h2 style={{ margin: 0, font: "700 15px 'Plus Jakarta Sans',sans-serif", color: "#F5F2EB" }}>
            Generar Programas de prueba
          </h2>
          <p style={{ margin: 0, font: "400 12.5px/1.6 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>
            Actualmente hay <strong style={{ color: "#C8A15A" }}>{demoProgramCount}</strong> Programa
            {demoProgramCount === 1 ? "" : "s"} demo con <strong style={{ color: "#C8A15A" }}>{demoCardCount}</strong>{" "}
            Card{demoCardCount === 1 ? "" : "s"} en total.
          </p>
          {generated && (
            <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>
              ✓ {generated} Programa{generated === "1" ? "" : "s"} demo generado{generated === "1" ? "" : "s"} (con sus 3
              Cards cada uno).
            </p>
          )}
          <form action={generateDemoDataAction} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 5, flex: "1 1 160px" }}>
              <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".14em", textTransform: "uppercase", color: "#C2BEB5" }}>
                Cuántos Programas (máx. {MAX_DEMO_COUNT})
              </span>
              <input
                name="count"
                type="number"
                min={1}
                max={MAX_DEMO_COUNT}
                defaultValue={3}
                style={{ background: "#0D0D0D", border: "1px solid rgba(200,161,90,.3)", borderRadius: 10, padding: "10px 14px", color: "#F5F2EB", font: "400 14px 'Plus Jakarta Sans',sans-serif", outline: "none" }}
              />
            </label>
            <button
              type="submit"
              style={{ padding: "11px 20px", border: "none", borderRadius: 10, background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)", color: "#0D0D0D", font: "700 11px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", cursor: "pointer" }}
            >
              Generar
            </button>
          </form>
        </section>

        <section style={{ background: "#2a1a1a", border: "1px solid rgba(229,146,138,.4)", borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <h2 style={{ margin: 0, font: "700 15px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>
            Borrar todo lo demo
          </h2>
          <p style={{ margin: 0, font: "400 12.5px/1.7 'Plus Jakarta Sans',sans-serif", color: "#e0d6d3" }}>
            Borra, sin vuelta atrás, los {demoProgramCount} Programa{demoProgramCount === 1 ? "" : "s"} demo y sus{" "}
            {demoCardCount} Card{demoCardCount === 1 ? "" : "s"} — nada de tu roster real se toca.
          </p>
          {deleted && (
            <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>
              ✓ Datos demo borrados.
            </p>
          )}
          {error === "confirm" && (
            <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>
              Tenés que escribir exactamente BORRAR DEMO para confirmar.
            </p>
          )}
          <form action={deleteAllDemoDataAction} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".14em", textTransform: "uppercase", color: "#C2BEB5" }}>
                Escribí BORRAR DEMO para confirmar
              </span>
              <input
                name="confirm"
                autoComplete="off"
                style={{ background: "#0D0D0D", border: "1px solid rgba(229,146,138,.4)", borderRadius: 10, padding: "11px 14px", color: "#F5F2EB", font: "400 14px 'Plus Jakarta Sans',sans-serif", outline: "none" }}
              />
            </label>
            <button
              type="submit"
              disabled={demoProgramCount === 0 && demoCardCount === 0}
              style={{
                padding: 14, border: "none", borderRadius: 12,
                background: demoProgramCount === 0 && demoCardCount === 0 ? "#4a3a38" : "#b3413a",
                color: "#F5F2EB", font: "700 12px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".12em", textTransform: "uppercase",
                cursor: demoProgramCount === 0 && demoCardCount === 0 ? "default" : "pointer",
              }}
            >
              Borrar todo lo demo
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
