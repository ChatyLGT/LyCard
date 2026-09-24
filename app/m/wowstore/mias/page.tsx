import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCardHost } from "@/lib/cardHost";
import { parseOfficeSkills } from "@/lib/officeSkills";
import { resolveWowStoreSkin, wowStoreSkinVars } from "@/lib/wowStoreSkin";
import WowStoreTabs from "@/components/WowStoreTabs";

export const dynamic = "force-dynamic";

const APP_TYPE_ICON: Record<string, string> = {
  malla: "hub",
  "fathom-brief": "videocam",
  "notas-voz": "mic",
  agenda: "calendar_month",
  mensajes: "chat",
  cartera: "account_balance_wallet",
  configuracion: "settings",
  "modo-foco": "graphic_eq",
  custom: "bolt",
};

// Fase W2 (2026-09-24) -- "Mis WowApps": hasta ahora lo instalado en
// una Card solo se veía de vuelta en su Oficina Virtual (WowAppsBlock),
// WowStore en sí era una vidriera de una sola vía. Esta pantalla reusa
// el mismo dato (Card.wowAppInstalls), no lo duplica -- ver PLAN.md
// "WowStore -- Fase W2".
//
// Fix W2.1 (2026-09-24, reportado por Gunnar): las 8 herramientas
// reales del equipo (Program.officeSkills -- Brief, Notas de Voz,
// Agenda, Mensajes, Malla, Cartera, Configuración, Modo Foco) no
// aparecían acá, aunque son las WowApps que de verdad funcionan.
// No se migran al modelo WowApp (romperían su lógica real, que vive
// en OfficeSkillsBlock, no en WowAppsBlock) -- se listan tal cual son,
// con link de vuelta a la Oficina, donde sí se usan de verdad.
export default async function MisWowAppsPage({
  searchParams,
}: {
  searchParams: Promise<{ cardId?: string }>;
}) {
  const { cardId } = await searchParams;
  if (!cardId) redirect("/m/dashboard");

  const card = await requireCardHost(cardId);
  const skin = resolveWowStoreSkin(card.program);
  const installs = await prisma.wowAppInstall.findMany({
    where: { cardId },
    include: { wowApp: true },
    orderBy: { installedAt: "asc" },
  });

  const officeSkills =
    card.kind === "project" && card.programId
      ? parseOfficeSkills((await prisma.program.findUnique({ where: { id: card.programId }, select: { officeSkills: true } }))?.officeSkills).filter((s) => s.enabled)
      : [];

  const hasAny = installs.length > 0 || officeSkills.length > 0;

  return (
    <div style={{ minHeight: "100vh", background: "var(--ws-bg,#131313)", color: "var(--ws-ink,#e5e2e1)", fontFamily: "var(--ws-font,'Plus Jakarta Sans'),sans-serif", padding: "40px 20px", ...wowStoreSkinVars(skin) }}>
      <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <span style={{ font: "600 10px var(--ws-font,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".24em", textTransform: "uppercase", color: "var(--ws-accent,#C8A15A)" }}>
            WowStore
          </span>
          <h1 style={{ margin: 0, font: "500 24px var(--ws-font,'Playfair Display'),serif", color: "var(--ws-ink,#F5F2EB)" }}>
            Mis WowApps
          </h1>
        </div>

        <WowStoreTabs cardId={cardId} cardSlug={card.slug} active="mias" />

        {!hasAny && (
          <p style={{ margin: 0, font: "400 12.5px/1.6 var(--ws-font,'Plus Jakarta Sans'),sans-serif", color: "#5A5A5A" }}>
            Todavía no instalaste ninguna WowApp en {card.name || "esta tarjeta"} — probá la pestaña Explorar.
          </p>
        )}

        {hasAny && (
          <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {officeSkills.length > 0 && (
              <span style={{ font: "500 10px var(--ws-font,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ws-ink2,#9a8f80)" }}>
                Ya en tu Oficina
              </span>
            )}
            {officeSkills.map((skill) => (
              <Link
                key={skill.key}
                href={`/c/${card.slug}/oficina`}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: 16, borderRadius: 16, background: "var(--ws-surf,#201f1f)", textDecoration: "none", color: "var(--ws-ink,#F5F2EB)", border: "1px solid rgba(255,255,255,.06)" }}
              >
                <span style={{ flex: "none", width: 42, height: 42, borderRadius: 12, background: skill.iconUrl ? "#0D0D0D" : `${skill.color}1F`, border: `1px solid ${skill.color}55`, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {skill.iconUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={skill.iconUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span className="material-symbols-outlined" style={{ fontSize: 20, color: skill.color }}>{APP_TYPE_ICON[skill.appType] || "bolt"}</span>
                  )}
                </span>
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={{ font: "700 14px var(--ws-font,'Plus Jakarta Sans'),sans-serif" }}>{skill.nombre}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 5, font: "400 10.5px var(--ws-font,'Plus Jakarta Sans'),sans-serif", color: "var(--ws-ink2,#8a8378)" }}>
                    <span style={{ width: 6, height: 6, borderRadius: 999, background: "#7BC98E", flex: "none" }} />
                    Herramienta del equipo — activa
                  </span>
                </span>
                <span style={{ flex: "none", font: "700 9px var(--ws-font,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".06em", textTransform: "uppercase", color: "var(--ws-bg,#0D0D0D)", background: "var(--ws-accent,#C8A15A)", borderRadius: 8, padding: "7px 11px" }}>
                  Ver
                </span>
              </Link>
            ))}

            {installs.length > 0 && (
              <span style={{ font: "500 10px var(--ws-font,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ws-ink2,#9a8f80)", marginTop: officeSkills.length > 0 ? 6 : 0 }}>
                Instaladas desde WowStore
              </span>
            )}
            {installs.map((install) => (
              <div
                key={install.id}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: 16, borderRadius: 16, background: "var(--ws-surf,#201f1f)", border: "1px solid rgba(255,255,255,.06)" }}
              >
                <span style={{ flex: "none", width: 42, height: 42, borderRadius: 12, background: `${install.wowApp.color}1F`, border: `1px solid ${install.wowApp.color}55`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: install.wowApp.color }}>bolt</span>
                </span>
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, font: "700 14px var(--ws-font,'Plus Jakarta Sans'),sans-serif" }}>
                    {install.wowApp.nombre}
                    {install.wowApp.destacado && <span style={{ font: "700 10px var(--ws-font,'Plus Jakarta Sans'),sans-serif", color: "var(--ws-accent-light,#E5C378)" }}>★</span>}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 5, font: "400 10.5px var(--ws-font,'Plus Jakarta Sans'),sans-serif", color: "var(--ws-ink2,#8a8378)" }}>
                    <span style={{ width: 6, height: 6, borderRadius: 999, background: "#7BC98E", flex: "none" }} />
                    Instalada el {new Date(install.installedAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                </span>
                <Link
                  href={`/m/wowstore/${install.wowApp.key}?cardId=${cardId}`}
                  style={{ flex: "none", font: "700 9px var(--ws-font,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".06em", textTransform: "uppercase", color: "var(--ws-bg,#0D0D0D)", background: "var(--ws-accent,#C8A15A)", borderRadius: 8, padding: "7px 11px", textDecoration: "none" }}
                >
                  Ver
                </Link>
              </div>
            ))}
            {installs.length > 0 && (
              <Link
                href={`/c/${card.slug}/oficina`}
                style={{ font: "700 9px var(--ws-font,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ws-accent,#C8A15A)", textDecoration: "none", alignSelf: "flex-start" }}
              >
                Ver funcionando en tu Oficina Virtual →
              </Link>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
