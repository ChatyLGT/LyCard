import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCardHost } from "@/lib/cardHost";
import { resolveWowStoreSkin, wowStoreSkinVars } from "@/lib/wowStoreSkin";
import WowStoreTabs from "@/components/WowStoreTabs";

export const dynamic = "force-dynamic";

const EDITOR_HREF: Record<string, string> = {
  company: "/m/dashboard/company",
  personal: "/m/dashboard/personal",
  project: "/m/dashboard/project",
};

const CHANNELS: { key: "email" | "wa" | "web" | "ig" | "li" | "x" | "fb" | "tiktok" | "yt"; label: string; icon: string }[] = [
  { key: "email", label: "Email", icon: "mail" },
  { key: "wa", label: "WhatsApp", icon: "chat" },
  { key: "web", label: "Sitio web", icon: "language" },
  { key: "ig", label: "Instagram", icon: "photo_camera" },
  { key: "li", label: "LinkedIn", icon: "work" },
  { key: "x", label: "X", icon: "tag" },
  { key: "fb", label: "Facebook", icon: "thumb_up" },
  { key: "tiktok", label: "TikTok", icon: "music_note" },
  { key: "yt", label: "YouTube", icon: "smart_display" },
];

// Fase W3 (2026-09-24) -- "Perfil": el mockup de referencia de Gunnar
// traía RFC, últimos 4 dígitos de tarjeta e historial de pagos -- eso
// cruza a "datos fiscales/de pago fabricados" incluso con etiqueta
// "(simulado)", que es una categoría distinta de una estrella o un
// testimonio genérico (ver PLAN.md "WowStore -- Fase W3"). Acá se
// muestra SOLO lo que de verdad existe: los datos reales de la Card +
// el estado real de facturación (que hoy es "no hay pasarela", punto,
// sin inventar un número de tarjeta para disimularlo).
export default async function WowStorePerfilPage({
  searchParams,
}: {
  searchParams: Promise<{ cardId?: string }>;
}) {
  const { cardId } = await searchParams;
  if (!cardId) redirect("/m/dashboard");

  const card = await requireCardHost(cardId);
  const skin = resolveWowStoreSkin(card.program);

  const [installCount, solicitudCount] = await Promise.all([
    prisma.wowAppInstall.count({ where: { cardId } }),
    prisma.wowAppInstall.count({ where: { cardId, adaptationStatus: { not: "sin_pedir" } } }),
  ]);

  const channels = CHANNELS.filter((c) => Boolean(card[c.key]));
  const editorHref = EDITOR_HREF[card.kind] || "/m/dashboard";
  const supportWa = card.program?.wa || "";

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
            Perfil
          </h1>
        </div>

        <WowStoreTabs cardId={cardId} cardSlug={card.slug} active="perfil" />

        <section style={{ display: "flex", flexDirection: "column", gap: 12, padding: 18, borderRadius: 18, background: "linear-gradient(155deg,var(--ws-surf,#201f1f),var(--ws-surf2,#181818))", border: "1px solid rgba(200,161,90,.2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ flex: "none", width: 46, height: 46, borderRadius: 13, background: "rgba(200,161,90,.14)", border: "1px solid rgba(200,161,90,.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 23, color: "var(--ws-accent,#C8A15A)" }}>storefront</span>
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", font: "500 10px var(--ws-font,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ws-ink2,#9a8f80)" }}>
                Tu negocio
              </span>
              <span style={{ font: "700 17px var(--ws-font,'Plus Jakarta Sans'),sans-serif", color: "var(--ws-ink,#F5F2EB)" }}>{card.name || card.slug}</span>
            </div>
          </div>
          {card.program?.name && (
            <span style={{ font: "400 11.5px var(--ws-font,'Plus Jakarta Sans'),sans-serif", color: "var(--ws-ink2,#8a8378)" }}>
              Programa: {card.program.name}
            </span>
          )}
          {card.location && (
            <span style={{ font: "400 11.5px var(--ws-font,'Plus Jakarta Sans'),sans-serif", color: "var(--ws-ink2,#8a8378)" }}>{card.location}</span>
          )}
          <Link
            href={editorHref}
            style={{
              alignSelf: "flex-start", font: "700 9px var(--ws-font,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".06em", textTransform: "uppercase",
              color: "var(--ws-bg,#0D0D0D)", background: "var(--ws-accent,#C8A15A)", borderRadius: 8, padding: "7px 11px", textDecoration: "none",
            }}
          >
            Editar tu tarjeta →
          </Link>
        </section>

        {channels.length > 0 && (
          <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ font: "500 10px var(--ws-font,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ws-ink2,#9a8f80)" }}>
              Canales de contacto
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {channels.map((c) => (
                <div key={c.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 12, background: "var(--ws-surf,#201f1f)" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 17, color: "var(--ws-accent,#C8A15A)" }}>{c.icon}</span>
                  <span style={{ flex: 1, minWidth: 0, font: "400 12px var(--ws-font,'Plus Jakarta Sans'),sans-serif", color: "var(--ws-ink,#C2BEB5)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {card[c.key]}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ font: "500 10px var(--ws-font,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ws-ink2,#9a8f80)" }}>
            Tu actividad en la WowStore
          </span>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, padding: 14, borderRadius: 12, background: "var(--ws-surf,#201f1f)" }}>
              <span style={{ font: "700 22px var(--ws-font,'Plus Jakarta Sans'),sans-serif", color: "var(--ws-accent-light,#E5C378)" }}>{installCount}</span>
              <span style={{ font: "400 10.5px var(--ws-font,'Plus Jakarta Sans'),sans-serif", color: "var(--ws-ink2,#8a8378)" }}>WowApps instaladas</span>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, padding: 14, borderRadius: 12, background: "var(--ws-surf,#201f1f)" }}>
              <span style={{ font: "700 22px var(--ws-font,'Plus Jakarta Sans'),sans-serif", color: "var(--ws-accent-light,#E5C378)" }}>{solicitudCount}</span>
              <span style={{ font: "400 10.5px var(--ws-font,'Plus Jakarta Sans'),sans-serif", color: "var(--ws-ink2,#8a8378)" }}>Adaptaciones pedidas</span>
            </div>
          </div>
        </section>

        {supportWa && (
          <section style={{ display: "flex", flexDirection: "column", gap: 10, padding: 18, borderRadius: 16, background: "var(--ws-surf,#201f1f)" }}>
            <span style={{ font: "500 10px var(--ws-font,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ws-ink2,#9a8f80)" }}>
              Soporte
            </span>
            <p style={{ margin: 0, font: "400 11.5px/1.6 var(--ws-font,'Plus Jakarta Sans'),sans-serif", color: "var(--ws-ink2,#8a8378)" }}>
              Dudas sobre una WowApp instalada o una adaptación pedida -- escribile directo al equipo real de{" "}
              {card.program?.name || "tu Programa"}.
            </p>
            <a
              href={`https://wa.me/${supportWa.replace(/[^\d]/g, "")}`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8, alignSelf: "flex-start",
                font: "700 10px var(--ws-font,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".06em", textTransform: "uppercase",
                color: "var(--ws-bg,#0D0D0D)", background: "var(--ws-accent,#C8A15A)", borderRadius: 10, padding: "10px 16px", textDecoration: "none",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chat</span>
              Escribir por WhatsApp
            </a>
          </section>
        )}

        <section style={{ display: "flex", flexDirection: "column", gap: 6, padding: 18, borderRadius: 16, background: "var(--ws-surf,#201f1f)", border: "1px dashed rgba(255,255,255,.16)" }}>
          <span style={{ font: "500 10px var(--ws-font,'Plus Jakarta Sans'),sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ws-ink2,#9a8f80)" }}>
            Facturación
          </span>
          <p style={{ margin: 0, font: "400 11.5px/1.6 var(--ws-font,'Plus Jakarta Sans'),sans-serif", color: "var(--ws-ink2,#8a8378)" }}>
            No hay — todavía no existe una pasarela de pago real ni datos fiscales cargados. Cuando instalás o pedís una
            adaptación, hoy queda registrado como pedido real y te contacta una persona del equipo — no un cobro automático.
          </p>
        </section>
      </div>
    </div>
  );
}
