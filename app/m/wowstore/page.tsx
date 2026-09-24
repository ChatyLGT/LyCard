import Link from "next/link";
import { redirect } from "next/navigation";
import { currentMember } from "@/lib/memberAuth";
import { prisma } from "@/lib/prisma";
import { RUBROS, PAIN_POINTS, matchWowApps, toCatalogEntry } from "@/lib/wowApps";

export const dynamic = "force-dynamic";

const SELECT_STYLE = {
  background: "#0D0D0D",
  border: "1px solid rgba(200,161,90,.3)",
  borderRadius: 10,
  padding: "11px 14px",
  color: "#F5F2EB",
  font: "400 14px 'Plus Jakarta Sans',sans-serif",
  outline: "none",
  width: "100%",
} as const;

// WowStore (2026-09-24) — vidriera pública de WowApps para cualquier
// MiPyME, navegada por rubro+dolor en vez de categoría técnica. Pantalla
// 1 (selector) y 2 (match curado) viven en la misma page, coordinadas
// por query string (?rubro=&dolor=) -- sin JS de cliente, un <form
// method="get"> alcanza y es más barato de construir/testear.
export default async function WowStorePage({
  searchParams,
}: {
  searchParams: Promise<{ cardId?: string; rubro?: string; dolor?: string }>;
}) {
  const member = await currentMember();
  if (!member) redirect("/m/login");

  const { cardId, rubro, dolor } = await searchParams;
  if (!cardId) redirect("/m/dashboard");

  const card = await prisma.card.findUnique({ where: { id: cardId } });
  if (!card || card.memberId !== member.id) redirect("/m/dashboard");

  const showResults = Boolean(rubro || dolor);
  const catalogRows = showResults ? await prisma.wowApp.findMany() : [];
  const results = showResults ? matchWowApps(catalogRows.map(toCatalogEntry), rubro || null, dolor || null) : [];

  return (
    <div style={{ minHeight: "100vh", background: "#131313", color: "#e5e2e1", fontFamily: "'Plus Jakarta Sans',sans-serif", padding: "40px 20px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <span style={{ font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".24em", textTransform: "uppercase", color: "#C8A15A" }}>
            WowStore
          </span>
          <h1 style={{ margin: 0, font: "500 24px 'Playfair Display',serif", color: "#F5F2EB" }}>
            WowApps para {card.name || "tu negocio"}
          </h1>
        </div>

        <form method="get" style={{ background: "#201f1f", borderRadius: 14, padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          <input type="hidden" name="cardId" value={cardId} />
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "#9a8f80" }}>
              Soy un
            </span>
            <select name="rubro" defaultValue={rubro || ""} style={SELECT_STYLE}>
              <option value="">Elegí tu rubro</option>
              {RUBROS.map((r) => (
                <option key={r.key} value={r.key}>{r.label}</option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "#9a8f80" }}>
              Y mi mayor dolor de cabeza hoy es
            </span>
            <select name="dolor" defaultValue={dolor || ""} style={SELECT_STYLE}>
              <option value="">Elegí tu dolor</option>
              {PAIN_POINTS.map((p) => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            style={{ padding: 13, border: "none", borderRadius: 10, background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)", color: "#0D0D0D", font: "700 11px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", cursor: "pointer" }}
          >
            Buscar mi WowApp
          </button>
        </form>

        {showResults && (
          <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "#9a8f80" }}>
              Lo que encontramos para vos
            </span>
            {results.length === 0 && (
              <p style={{ margin: 0, font: "400 12.5px/1.6 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
                Todavía no tenemos una WowApp para esa combinación — probá con otro rubro o dolor.
              </p>
            )}
            {results.map((app) => (
              <Link
                key={app.key}
                href={`/m/wowstore/${app.key}?cardId=${cardId}`}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: 14, borderRadius: 14,
                  background: "#201f1f", textDecoration: "none", color: "#F5F2EB",
                }}
              >
                <span style={{ flex: "none", width: 34, height: 34, borderRadius: 10, background: `${app.color}1F`, border: `1px solid ${app.color}55`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 17, color: app.color }}>bolt</span>
                </span>
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ font: "700 13px 'Plus Jakarta Sans',sans-serif" }}>{app.nombre}</span>
                  <span style={{ font: "400 11px 'Plus Jakarta Sans',sans-serif", color: "#8a8378", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{app.descripcion}</span>
                </span>
                <span style={{ font: "700 16px sans-serif", color: "#C8A15A" }}>→</span>
              </Link>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
