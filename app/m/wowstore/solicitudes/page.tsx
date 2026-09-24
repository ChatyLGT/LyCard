import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCardHost } from "@/lib/cardHost";
import { resolveWowStoreSkin, wowStoreSkinVars } from "@/lib/wowStoreSkin";
import WowStoreTabs from "@/components/WowStoreTabs";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  en_progreso: "En progreso",
  entregada: "Entregada",
};

const STATUS_COLOR: Record<string, string> = {
  pendiente: "#E5C378",
  en_progreso: "#C8A15A",
  entregada: "#7BC98E",
};

// Fase W2 (2026-09-24) -- "Solicitudes": estado real de cada pedido de
// adaptación a medida (WowAppInstall.adaptationStatus) para esta Card.
// A propósito NO es el stepper de 4 fases con % inventado ni el asesor
// con foto de stock del mockup de referencia -- solo mostramos el
// estado que de verdad está guardado, ver PLAN.md "WowStore -- Fase W2".
export default async function SolicitudesPage({
  searchParams,
}: {
  searchParams: Promise<{ cardId?: string }>;
}) {
  const { cardId } = await searchParams;
  if (!cardId) redirect("/m/dashboard");

  const card = await requireCardHost(cardId);
  const skin = resolveWowStoreSkin(card.program);
  const solicitudes = await prisma.wowAppInstall.findMany({
    where: { cardId, adaptationStatus: { not: "sin_pedir" } },
    include: { wowApp: true },
    orderBy: { installedAt: "asc" },
  });

  return (
    <div
      style={{
        minHeight: "100vh", background: "var(--ws-bg,#131313)", color: "var(--ws-ink,#e5e2e1)",
        fontFamily: "var(--ws-font,'Plus Jakarta Sans'),sans-serif", padding: "40px 20px",
        ...wowStoreSkinVars(skin),
      }}
    >
      <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <span style={{ font: "600 10px var(--ws-font,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".24em", textTransform: "uppercase", color: "var(--ws-accent,#C8A15A)" }}>
            WowStore
          </span>
          <h1 style={{ margin: 0, font: "500 24px var(--ws-font,'Playfair Display'),serif", color: "var(--ws-ink,#F5F2EB)" }}>
            Solicitudes de adaptación
          </h1>
        </div>

        <WowStoreTabs cardId={cardId} cardSlug={card.slug} active="solicitudes" />

        {solicitudes.length === 0 && (
          <p style={{ margin: 0, font: "400 12.5px/1.6 var(--ws-font,'Plus Jakarta Sans'),sans-serif", color: "#5A5A5A" }}>
            Todavía no pediste ninguna adaptación a medida — la pedís desde el detalle de cualquier WowApp.
          </p>
        )}

        {solicitudes.length > 0 && (
          <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {solicitudes.map((s) => (
              <div key={s.id} style={{ display: "flex", flexDirection: "column", gap: 8, padding: 14, borderRadius: 14, background: "var(--ws-surf,#201f1f)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ font: "700 13px var(--ws-font,'Plus Jakarta Sans'),sans-serif" }}>{s.wowApp.nombre}</span>
                  <span
                    style={{
                      font: "700 9px var(--ws-font,'Plus Jakarta Sans'),sans-serif",
                      letterSpacing: ".06em",
                      textTransform: "uppercase",
                      color: STATUS_COLOR[s.adaptationStatus] || "#8a8378",
                      background: `${STATUS_COLOR[s.adaptationStatus] || "#8a8378"}1F`,
                      border: `1px solid ${STATUS_COLOR[s.adaptationStatus] || "#8a8378"}55`,
                      borderRadius: 999,
                      padding: "3px 8px",
                      flex: "none",
                    }}
                  >
                    {STATUS_LABEL[s.adaptationStatus] || s.adaptationStatus}
                  </span>
                </div>
                {s.adaptationNotes && (
                  <p style={{ margin: 0, font: "400 11.5px/1.5 var(--ws-font,'Plus Jakarta Sans'),sans-serif", color: "var(--ws-ink2,#8a8378)" }}>{s.adaptationNotes}</p>
                )}
                {s.adaptationStatus === "en_progreso" && (
                  <p style={{ margin: 0, font: "400 italic 10.5px/1.5 var(--ws-font,'Plus Jakarta Sans'),sans-serif", color: "var(--ws-ink2,#7d7566)" }}>
                    Nuestro equipo ya la está armando — sin ETA exacta todavía (simulado: no hay tracking automático de avance).
                  </p>
                )}
                <Link
                  href={`/m/wowstore/${s.wowApp.key}?cardId=${cardId}`}
                  style={{ font: "700 9px var(--ws-font,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".06em", textTransform: "uppercase", color: "var(--ws-accent,#C8A15A)", textDecoration: "none", alignSelf: "flex-start" }}
                >
                  Ver WowApp
                </Link>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
