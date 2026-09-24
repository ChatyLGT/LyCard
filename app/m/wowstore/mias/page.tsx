import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCardHost } from "@/lib/cardHost";
import WowStoreTabs from "@/components/WowStoreTabs";

export const dynamic = "force-dynamic";

// Fase W2 (2026-09-24) -- "Mis WowApps": hasta ahora lo instalado en
// una Card solo se veía de vuelta en su Oficina Virtual (WowAppsBlock),
// WowStore en sí era una vidriera de una sola vía. Esta pantalla reusa
// el mismo dato (Card.wowAppInstalls), no lo duplica -- ver PLAN.md
// "WowStore -- Fase W2".
export default async function MisWowAppsPage({
  searchParams,
}: {
  searchParams: Promise<{ cardId?: string }>;
}) {
  const { cardId } = await searchParams;
  if (!cardId) redirect("/m/dashboard");

  const card = await requireCardHost(cardId);
  const installs = await prisma.wowAppInstall.findMany({
    where: { cardId },
    include: { wowApp: true },
    orderBy: { installedAt: "asc" },
  });

  return (
    <div style={{ minHeight: "100vh", background: "#131313", color: "#e5e2e1", fontFamily: "'Plus Jakarta Sans',sans-serif", padding: "40px 20px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <span style={{ font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".24em", textTransform: "uppercase", color: "#C8A15A" }}>
            WowStore
          </span>
          <h1 style={{ margin: 0, font: "500 24px 'Playfair Display',serif", color: "#F5F2EB" }}>
            Mis WowApps
          </h1>
        </div>

        <WowStoreTabs cardId={cardId} active="mias" />

        {installs.length === 0 && (
          <p style={{ margin: 0, font: "400 12.5px/1.6 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
            Todavía no instalaste ninguna WowApp en {card.name || "esta tarjeta"} — probá la pestaña Explorar.
          </p>
        )}

        {installs.length > 0 && (
          <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {installs.map((install) => (
              <div
                key={install.id}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, background: "#201f1f" }}
              >
                <span style={{ flex: "none", width: 34, height: 34, borderRadius: 10, background: `${install.wowApp.color}1F`, border: `1px solid ${install.wowApp.color}55`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 17, color: install.wowApp.color }}>bolt</span>
                </span>
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ font: "700 13px 'Plus Jakarta Sans',sans-serif" }}>{install.wowApp.nombre}</span>
                  <span style={{ font: "400 10.5px 'Plus Jakarta Sans',sans-serif", color: "#8a8378" }}>
                    Instalada el {new Date(install.installedAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                </span>
                <Link
                  href={`/m/wowstore/${install.wowApp.key}?cardId=${cardId}`}
                  style={{ font: "700 9px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".06em", textTransform: "uppercase", color: "#C8A15A", textDecoration: "none" }}
                >
                  Ver
                </Link>
              </div>
            ))}
            <Link
              href={`/c/${card.slug}/oficina`}
              style={{ font: "700 9px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", color: "#C8A15A", textDecoration: "none", alignSelf: "flex-start" }}
            >
              Ver funcionando en tu Oficina Virtual →
            </Link>
          </section>
        )}
      </div>
    </div>
  );
}
