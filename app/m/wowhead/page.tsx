import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCardHost } from "@/lib/cardHost";
import { simulatedRating, simulatedReviewCount } from "@/lib/wowApps";
import { canPublishExperto, parseRango, RANGO_LABEL } from "@/lib/expertos";

export const dynamic = "force-dynamic";

type AgentCard = {
  key: string;
  nombre: string;
  headline: string;
  color: string;
  origen: "legacy" | "silicio";
  badge: string;
  equipoCount: number;
};

const PANEL = { display: "flex", flexDirection: "column" as const, gap: 12, padding: 16, borderRadius: 16, background: "rgba(255,255,255,.03)", border: "1px solid rgba(200,161,90,.16)" };
const PILL_BASE = { font: "700 11px 'Plus Jakarta Sans',sans-serif", padding: "8px 14px", borderRadius: 999, cursor: "pointer", border: "1px solid", textDecoration: "none", display: "inline-block" };

function tipoHref(cardId: string, tipo: string) {
  const params = new URLSearchParams({ cardId });
  if (tipo) params.set("tipo", tipo);
  return `/m/wowhead?${params.toString()}`;
}

// WowHead (Fase 6, 2026-10-01) -- el HeadHunter de Agentes, pantalla
// completa que reemplaza a WowStore adentro de la Oficina Virtual. Ver
// PLAN.md "Fase 6: DISEÑO -- WowHead, el HeadHunter de Agentes". Dos
// orígenes (Legacy/Silicio) y, solo para Legacy, un rango
// (Especialista/Experto) -- un Experto además muestra cuántos
// especialistas tiene en su propio equipo.
export default async function WowHeadPage({
  searchParams,
}: {
  searchParams: Promise<{ cardId?: string; tipo?: string }>;
}) {
  const { cardId, tipo } = await searchParams;
  if (!cardId) return null;
  const card = await requireCardHost(cardId);

  const [especialistas, expertosRaw] = await Promise.all([
    prisma.especialista.findMany({ where: { status: "activo" }, orderBy: { createdAt: "asc" } }),
    prisma.experto.findMany({ where: { consentGivenAt: { not: null }, consentRevokedAt: null }, orderBy: { createdAt: "asc" }, include: { _count: { select: { equipo: true } } } }),
  ]);
  const expertos = expertosRaw.filter(canPublishExperto);

  const agentes: AgentCard[] = [
    ...especialistas.map((e): AgentCard => ({
      key: e.key,
      nombre: e.nombre,
      headline: e.trabajo,
      color: e.color,
      origen: "silicio",
      badge: "Silicio",
      equipoCount: 0,
    })),
    ...expertos.map((e): AgentCard => {
      const rango = parseRango(e.rango);
      return {
        key: e.key,
        nombre: e.nombrePublico,
        headline: e.profesion,
        color: e.color,
        origen: "legacy",
        badge: `Legacy · ${RANGO_LABEL[rango]}`,
        equipoCount: e._count.equipo,
      };
    }),
  ];

  const currentTipo = tipo || "";
  const filtered = agentes.filter((a) => !currentTipo || a.origen === currentTipo);

  return (
    <div style={{ minHeight: "100vh", background: "#0B0B0A", color: "#F5F2EB", fontFamily: "'Plus Jakarta Sans',sans-serif", padding: "28px 20px 60px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Link href={`/c/${card.slug}/oficina`} style={{ font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "#C8A15A", textDecoration: "none" }}>
            ← Volver a tu Oficina
          </Link>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
            <h1 style={{ margin: 0, font: "700 28px 'Playfair Display',serif" }}>WowHead</h1>
            <span style={{ font: "700 9px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".14em", textTransform: "uppercase", color: "#5A5A5A", border: "1px solid rgba(200,161,90,.3)", borderRadius: 999, padding: "4px 10px", whiteSpace: "nowrap" }}>
              {filtered.length} agentes
            </span>
          </div>
          <p style={{ margin: 0, font: "400 13px/1.6 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>
            Reclutá tu equipo para {card.name || "tu negocio"}. Agentes Legacy (el gemelo digital de una persona real, Especialista o Experto con su propio equipo) y Agentes Silicio (IA con un perfil propio) -- cada uno con su CV, sus herramientas y su reputación.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <Link href={tipoHref(cardId, "")} style={{ ...PILL_BASE, borderColor: !currentTipo ? "#C8A15A" : "rgba(255,255,255,.1)", background: !currentTipo ? "#C8A15A" : "none", color: !currentTipo ? "#0D0D0D" : "#8a8378" }}>
            Todos
          </Link>
          <Link href={tipoHref(cardId, "legacy")} style={{ ...PILL_BASE, borderColor: currentTipo === "legacy" ? "#C8A15A" : "rgba(255,255,255,.1)", background: currentTipo === "legacy" ? "rgba(200,161,90,.14)" : "none", color: currentTipo === "legacy" ? "#C8A15A" : "#8a8378" }}>
            ● Legacy
          </Link>
          <Link href={tipoHref(cardId, "silicio")} style={{ ...PILL_BASE, borderColor: currentTipo === "silicio" ? "#7FB0C4" : "rgba(255,255,255,.1)", background: currentTipo === "silicio" ? "rgba(127,176,196,.14)" : "none", color: currentTipo === "silicio" ? "#7FB0C4" : "#8a8378" }}>
            ● Silicio
          </Link>
        </div>

        {filtered.length === 0 && (
          <p style={{ margin: 0, font: "400 12.5px/1.6 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
            Todavía no hay Agentes publicados para esta categoría.
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((a) => (
            <Link key={`${a.origen}-${a.key}`} href={`/m/wowhead/${a.origen}/${a.key}?cardId=${cardId}`} style={{ ...PANEL, textDecoration: "none", color: "inherit" }}>
              <div style={{ display: "flex", gap: 12 }}>
                <span style={{ flex: "none", width: 52, height: 52, borderRadius: 14, background: `${a.color}1F`, border: `1.5px solid ${a.color}`, display: "flex", alignItems: "center", justifyContent: "center", font: "700 19px 'Playfair Display',serif", color: a.color }}>
                  {a.nombre.charAt(0).toUpperCase()}
                </span>
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                    <span style={{ font: "700 15px 'Playfair Display',serif", color: "#F5F2EB" }}>{a.nombre}</span>
                    <span style={{ font: "700 8px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", color: a.origen === "legacy" ? "#0D0D0D" : "#7FB0C4", background: a.origen === "legacy" ? "#C8A15A" : "rgba(127,176,196,.14)", borderRadius: 999, padding: "3px 7px" }}>
                      {a.badge}
                    </span>
                  </div>
                  <span style={{ font: "400 12px 'Plus Jakarta Sans',sans-serif", color: "#8a8378" }}>{a.headline}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                    <span style={{ font: "700 11px 'Plus Jakarta Sans',sans-serif", color: "#E5C378" }}>★ {simulatedRating(a.key).toFixed(1)}</span>
                    <span style={{ font: "400 10px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>· {simulatedReviewCount(a.key)} reseñas (simulado)</span>
                  </div>
                  {a.equipoCount > 0 && (
                    <span style={{ font: "600 9.5px 'Plus Jakarta Sans',sans-serif", color: "#7FB0C4", marginTop: 3 }}>⬡ Tiene equipo -- {a.equipoCount} especialista{a.equipoCount === 1 ? "" : "s"}</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        <p style={{ margin: 0, font: "400 10.5px/1.6 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
          Las calificaciones son de ejemplo (simulado) hasta que haya actividad real para mostrar.
        </p>
      </div>
    </div>
  );
}
