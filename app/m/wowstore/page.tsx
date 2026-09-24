import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCardHost } from "@/lib/cardHost";
import { RUBROS, PAIN_POINTS, matchWowApps, countByRubro, simulatedRating, simulatedReviewCount, toCatalogEntry } from "@/lib/wowApps";
import WowStoreTabs from "@/components/WowStoreTabs";

export const dynamic = "force-dynamic";

function chipHref(cardId: string, currentRubro: string, currentDolor: string, kind: "rubro" | "dolor", key: string) {
  const nextRubro = kind === "rubro" ? (currentRubro === key ? "" : key) : currentRubro;
  const nextDolor = kind === "dolor" ? (currentDolor === key ? "" : key) : currentDolor;
  const params = new URLSearchParams({ cardId });
  if (nextRubro) params.set("rubro", nextRubro);
  if (nextDolor) params.set("dolor", nextDolor);
  return `/m/wowstore?${params.toString()}`;
}

function chipStyle(active: boolean) {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    flex: "none",
    padding: "8px 12px",
    borderRadius: 999,
    textDecoration: "none",
    whiteSpace: "nowrap" as const,
    background: active ? "#C8A15A" : "#201f1f",
    color: active ? "#0D0D0D" : "#C2BEB5",
    border: `1px solid ${active ? "#C8A15A" : "rgba(200,161,90,.25)"}`,
    font: "600 11.5px 'Plus Jakarta Sans',sans-serif",
  };
}

// WowStore (2026-09-24, Fase W1/W2) — vidriera de WowApps para cualquier
// MiPyME, navegada por rubro+dolor en vez de categoría técnica. Fase W2
// (2026-09-24, pedido de Gunnar a partir de un mockup de referencia)
// reemplaza los 2 <select> por chips -- cada click en un chip navega a
// un nuevo estado de ?rubro=&dolor=, sin necesitar JS de cliente ni un
// botón "Buscar" aparte. El chip de rubro muestra un contador real
// (countByRubro, cuenta solo status:"activo") -- nunca un número
// inventado como el "12 apps activas" del mockup original.
export default async function WowStorePage({
  searchParams,
}: {
  searchParams: Promise<{ cardId?: string; rubro?: string; dolor?: string }>;
}) {
  const { cardId, rubro, dolor } = await searchParams;
  if (!cardId) redirect("/m/dashboard");

  const card = await requireCardHost(cardId);

  const catalogRows = await prisma.wowApp.findMany();
  const catalog = catalogRows.map(toCatalogEntry);
  const rubroCounts = countByRubro(catalog);
  const currentRubro = rubro || "";
  const currentDolor = dolor || "";
  const showResults = Boolean(rubro || dolor);
  const results = showResults ? matchWowApps(catalog, rubro || null, dolor || null) : [];

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

        <WowStoreTabs cardId={cardId} cardSlug={card.slug} active="explorar" />

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "#9a8f80" }}>
              Soy un
            </span>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
              {RUBROS.map((r) => (
                <Link key={r.key} href={chipHref(cardId, currentRubro, currentDolor, "rubro", r.key)} style={chipStyle(currentRubro === r.key)}>
                  {r.label}
                  <span style={{ opacity: 0.75 }}>· {rubroCounts[r.key] ?? 0}</span>
                </Link>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "#9a8f80" }}>
              Y mi mayor dolor de cabeza hoy es
            </span>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
              {PAIN_POINTS.map((p) => (
                <Link key={p.key} href={chipHref(cardId, currentRubro, currentDolor, "dolor", p.key)} style={chipStyle(currentDolor === p.key)}>
                  {p.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {showResults && (
          <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
                  display: "flex", flexDirection: "column", gap: 10, padding: 16, borderRadius: 16,
                  background: "linear-gradient(155deg,#201f1f,#181818)", border: `1px solid ${app.color}30`,
                  textDecoration: "none", color: "#F5F2EB", boxShadow: "0 6px 18px rgba(0,0,0,.25)",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <span style={{ flex: "none", width: 42, height: 42, borderRadius: 12, background: `${app.color}22`, border: `1px solid ${app.color}55`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 21, color: app.color }}>bolt</span>
                  </span>
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                    <span style={{ font: "700 14.5px 'Plus Jakarta Sans',sans-serif" }}>{app.nombre}</span>
                    <span style={{ font: "400 11.5px/1.4 'Plus Jakarta Sans',sans-serif", color: "#8a8378" }}>{app.descripcion}</span>
                    {/* Rating simulado (2026-09-24, pedido de Gunnar): NO es
                        deshonesto si se etiqueta -- sin esto el catálogo no
                        tenía ninguna prueba social. Determinístico por key,
                        nunca real, siempre marcado "(simulado)". */}
                    <span style={{ display: "flex", alignItems: "center", gap: 3, font: "600 10.5px 'Plus Jakarta Sans',sans-serif", color: "#E5C378" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 13 }}>star</span>
                      {simulatedRating(app.key).toFixed(1)} ({simulatedReviewCount(app.key)}, simulado)
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 4, borderTop: "1px solid rgba(255,255,255,.06)" }}>
                  <span
                    style={{
                      font: "700 9px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".06em", textTransform: "uppercase",
                      color: app.status === "activo" ? "#7BC98E" : "#C8A15A",
                      background: app.status === "activo" ? "rgba(123,201,142,.12)" : "rgba(200,161,90,.12)",
                      borderRadius: 999, padding: "4px 9px",
                    }}
                  >
                    {app.status === "activo" ? "Instalación inmediata" : "Próximamente"}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ font: "700 13px 'Plus Jakarta Sans',sans-serif", color: "#E5C378" }}>
                      {app.basePriceUsd > 0 ? `$${app.basePriceUsd.toFixed(0)} USD` : "Gratis"}
                    </span>
                    <span style={{ font: "700 15px sans-serif", color: app.color }}>→</span>
                  </span>
                </div>
              </Link>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
