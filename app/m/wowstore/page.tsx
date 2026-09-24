import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCardHost } from "@/lib/cardHost";
import {
  RUBROS,
  PAIN_POINTS,
  matchWowApps,
  countByRubro,
  featuredWowApps,
  simulatedRating,
  simulatedReviewCount,
  rubroLabel,
  painPointLabel,
  toCatalogEntry,
  type WowAppCatalogEntry,
} from "@/lib/wowApps";
import { resolveWowStoreSkin, wowStoreSkinVars } from "@/lib/wowStoreSkin";
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
    background: active ? "var(--ws-accent,#C8A15A)" : "var(--ws-surf,#201f1f)",
    color: active ? "var(--ws-bg,#0D0D0D)" : "var(--ws-ink2,#C2BEB5)",
    border: `1px solid ${active ? "var(--ws-accent,#C8A15A)" : "rgba(200,161,90,.25)"}`,
    font: "600 11.5px var(--ws-font,'Plus Jakarta Sans'),sans-serif",
  };
}

// Fase W3.1 (2026-09-24) -- una sola card reusada por Destacadas y por
// Resultados. Rediseño real (no solo color) pedido 4 veces por Gunnar a
// partir de su mockup de Sketch: más peso visual (badges, precio grande,
// botón real en vez de solo una flecha), y tags de rubro/dolor PINTADOS
// como pills -- pero sacados de industryTags/painPointTags reales de la
// WowApp, nunca un feature inventado como "Impresora Térmica 80mm" del
// mockup (eso sí sería fabricar specs que no existen).
function WowAppCard({ app, cardId, featured }: { app: WowAppCatalogEntry; cardId: string; featured?: boolean }) {
  const tags = [...app.industryTags.map(rubroLabel), ...app.painPointTags.map(painPointLabel)];
  return (
    <Link
      href={`/m/wowstore/${app.key}?cardId=${cardId}`}
      style={{
        display: "flex", flexDirection: "column", gap: 12, padding: 16, borderRadius: 18,
        background: "linear-gradient(155deg,var(--ws-surf,#201f1f),var(--ws-surf2,#181818))",
        border: `1px solid ${app.color}35`, textDecoration: "none", color: "var(--ws-ink,#F5F2EB)",
        boxShadow: "0 8px 22px rgba(0,0,0,.3)", position: "relative",
      }}
    >
      {featured && (
        <span
          style={{
            position: "absolute", top: -9, left: 14, font: "700 9px var(--ws-font,'Plus Jakarta Sans'),sans-serif",
            letterSpacing: ".06em", textTransform: "uppercase", color: "var(--ws-bg,#0D0D0D)",
            background: "var(--ws-accent-light,#E5C378)", borderRadius: 999, padding: "3px 10px",
          }}
        >
          ★ Destacada
        </span>
      )}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <span style={{ flex: "none", width: 46, height: 46, borderRadius: 13, background: `${app.color}22`, border: `1px solid ${app.color}55`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 23, color: app.color }}>bolt</span>
        </span>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ font: "700 15.5px var(--ws-font,'Plus Jakarta Sans'),sans-serif" }}>{app.nombre}</span>
          <span style={{ font: "400 11.5px/1.4 var(--ws-font,'Plus Jakarta Sans'),sans-serif", color: "var(--ws-ink2,#8a8378)" }}>{app.descripcion}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 3, font: "600 10.5px var(--ws-font,'Plus Jakarta Sans'),sans-serif", color: "var(--ws-accent-light,#E5C378)" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>star</span>
            {simulatedRating(app.key).toFixed(1)} ({simulatedReviewCount(app.key)}, simulado)
          </span>
        </div>
      </div>

      {tags.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {tags.map((t) => (
            <span
              key={t}
              style={{
                font: "600 9.5px var(--ws-font,'Plus Jakarta Sans'),sans-serif", color: "var(--ws-ink2,#a49c8d)",
                background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)",
                borderRadius: 999, padding: "3px 9px",
              }}
            >
              {t}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,.07)" }}>
        <span
          style={{
            font: "700 9px var(--ws-font,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".06em", textTransform: "uppercase",
            color: app.status === "activo" ? "#7BC98E" : "var(--ws-accent,#C8A15A)",
            background: app.status === "activo" ? "rgba(123,201,142,.12)" : "rgba(200,161,90,.12)",
            borderRadius: 999, padding: "4px 9px", flex: "none",
          }}
        >
          {app.status === "activo" ? "Instalación inmediata" : "Próximamente"}
        </span>
        <span style={{ flex: 1, minWidth: 0, textAlign: "right", font: "700 14px var(--ws-font,'Plus Jakarta Sans'),sans-serif", color: "var(--ws-accent-light,#E5C378)" }}>
          {app.basePriceUsd > 0 ? `$${app.basePriceUsd.toFixed(0)} USD` : "Gratis"}
        </span>
        <span
          style={{
            flex: "none", font: "700 10px var(--ws-font,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".05em", textTransform: "uppercase",
            color: "var(--ws-bg,#0D0D0D)", background: "var(--ws-accent,#C8A15A)", borderRadius: 9, padding: "8px 13px",
          }}
        >
          Ver App
        </span>
      </div>
    </Link>
  );
}

// WowStore (2026-09-24, Fase W1/W2/W3) — vidriera de WowApps para
// cualquier MiPyME, navegada por rubro+dolor en vez de categoría técnica.
// Fase W3.1 suma "Destacadas": WowApps activas marcadas a mano por
// MasterN0 (lib/wowApps.ts#featuredWowApps) que se muestran SIEMPRE,
// arriba de todo, sin depender de qué chip de rubro/dolor esté tocado --
// corrige que WowAwe (la única WowApp con lógica real hoy) quedara
// invisible en la práctica al no tener industryTags propio.
export default async function WowStorePage({
  searchParams,
}: {
  searchParams: Promise<{ cardId?: string; rubro?: string; dolor?: string }>;
}) {
  const { cardId, rubro, dolor } = await searchParams;
  if (!cardId) redirect("/m/dashboard");

  const card = await requireCardHost(cardId);
  const skin = resolveWowStoreSkin(card.program);

  const catalogRows = await prisma.wowApp.findMany();
  const catalog = catalogRows.map(toCatalogEntry);
  const rubroCounts = countByRubro(catalog);
  const currentRubro = rubro || "";
  const currentDolor = dolor || "";
  const showResults = Boolean(rubro || dolor);
  const results = showResults ? matchWowApps(catalog, rubro || null, dolor || null) : [];
  const featured = featuredWowApps(catalog);

  return (
    <div
      style={{
        minHeight: "100vh", background: "var(--ws-bg,#131313)", color: "var(--ws-ink,#e5e2e1)",
        fontFamily: "var(--ws-font,'Plus Jakarta Sans'),sans-serif", padding: "40px 20px",
        ...wowStoreSkinVars(skin),
      }}
    >
      <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column", gap: 22 }}>
        <div>
          <span style={{ font: "600 10px var(--ws-font,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".24em", textTransform: "uppercase", color: "var(--ws-accent,#C8A15A)" }}>
            WowStore
          </span>
          <h1 style={{ margin: 0, font: "500 24px var(--ws-font,'Playfair Display'),serif", color: "var(--ws-ink,#F5F2EB)" }}>
            WowApps para {card.name || "tu negocio"}
          </h1>
        </div>

        <WowStoreTabs cardId={cardId} cardSlug={card.slug} active="explorar" />

        {featured.length > 0 && (
          <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <span style={{ font: "500 10px var(--ws-font,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ws-ink2,#9a8f80)" }}>
              Destacadas
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {featured.map((app) => (
                <WowAppCard key={app.key} app={app} cardId={cardId} featured />
              ))}
            </div>
          </section>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ font: "500 10px var(--ws-font,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ws-ink2,#9a8f80)" }}>
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
            <span style={{ font: "500 10px var(--ws-font,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ws-ink2,#9a8f80)" }}>
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
          <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <span style={{ font: "500 10px var(--ws-font,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ws-ink2,#9a8f80)" }}>
              Lo que encontramos para vos
            </span>
            {results.length === 0 && (
              <p style={{ margin: 0, font: "400 12.5px/1.6 var(--ws-font,'Plus Jakarta Sans'),sans-serif", color: "#5A5A5A" }}>
                Todavía no tenemos una WowApp para esa combinación — probá con otro rubro o dolor.
              </p>
            )}
            {results.map((app) => (
              <WowAppCard key={app.key} app={app} cardId={cardId} />
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
