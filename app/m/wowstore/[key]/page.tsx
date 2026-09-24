import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCardHost } from "@/lib/cardHost";
import { simulatedRating, simulatedReviewCount } from "@/lib/wowApps";
import { installWowAppAction, requestAdaptationAction } from "../actions";

export const dynamic = "force-dynamic";

const CTA_PRIMARY = {
  padding: 14,
  border: "none",
  borderRadius: 12,
  background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)",
  color: "#0D0D0D",
  font: "700 12px 'Plus Jakarta Sans',sans-serif",
  letterSpacing: ".08em",
  textTransform: "uppercase",
  cursor: "pointer",
  width: "100%",
} as const;

const CTA_SECONDARY = {
  padding: 14,
  border: "1px solid rgba(200,161,90,.4)",
  borderRadius: 12,
  background: "none",
  color: "#C8A15A",
  font: "700 12px 'Plus Jakarta Sans',sans-serif",
  letterSpacing: ".08em",
  textTransform: "uppercase",
  cursor: "pointer",
  width: "100%",
} as const;

// Fase W2 (2026-09-24) -- las 2 opciones ("Instalación Express" y
// "Adaptación a medida") pasan a ser 2 cards del mismo peso visual, en
// vez de un botón suelto arriba + un panel abajo -- tomado del mockup
// de referencia de Gunnar (ahí eran "Estándar" vs "Personalizada"), sin
// inventar un segundo precio: la adaptación sigue siendo "a cotizar",
// no hay pasarela de pago real todavía (ver PLAN.md "WowStore -- Fase
// W2").
const OPTION_CARD = {
  background: "#201f1f",
  borderRadius: 14,
  padding: 18,
  display: "flex",
  flexDirection: "column" as const,
  gap: 10,
};

export default async function WowAppDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ cardId?: string; installed?: string; adaptationRequested?: string; adaptationError?: string }>;
}) {
  const { key } = await params;
  const { cardId, installed, adaptationRequested, adaptationError } = await searchParams;
  if (!cardId) redirect("/m/dashboard");

  const card = await requireCardHost(cardId);

  const wowApp = await prisma.wowApp.findUnique({ where: { key } });
  if (!wowApp) notFound();

  const install = await prisma.wowAppInstall.findUnique({
    where: { cardId_wowAppId: { cardId, wowAppId: wowApp.id } },
  });

  return (
    <div style={{ minHeight: "100vh", background: "#131313", color: "#e5e2e1", fontFamily: "'Plus Jakarta Sans',sans-serif", padding: "40px 20px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <Link href={`/c/${card.slug}/oficina`} style={{ color: "#8a8378", font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", textDecoration: "none" }}>
            ← Volver a tu tarjeta
          </Link>
          <Link href={`/m/wowstore?cardId=${cardId}`} style={{ color: "#8a8378", font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", textDecoration: "none" }}>
            ← WowStore
          </Link>
        </div>

        <div
          style={{
            display: "flex", flexDirection: "column", gap: 10, padding: 20, borderRadius: 18,
            background: `linear-gradient(160deg, ${wowApp.color}26, #171717 65%)`, border: `1px solid ${wowApp.color}40`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ flex: "none", width: 50, height: 50, borderRadius: 15, background: `${wowApp.color}2A`, border: `1px solid ${wowApp.color}66`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 24, color: wowApp.color }}>bolt</span>
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ margin: 0, font: "500 22px 'Playfair Display',serif", color: "#F5F2EB" }}>{wowApp.nombre}</h1>
              <span
                style={{
                  display: "inline-block", marginTop: 3, font: "700 9px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".06em", textTransform: "uppercase",
                  color: wowApp.status === "activo" ? "#7BC98E" : "#C8A15A",
                  background: wowApp.status === "activo" ? "rgba(123,201,142,.14)" : "rgba(200,161,90,.14)",
                  borderRadius: 999, padding: "3px 9px",
                }}
              >
                {wowApp.status === "activo" ? "Instalación inmediata" : "Próximamente"}
              </span>
            </div>
          </div>

          {/* Rating simulado (2026-09-24, pedido de Gunnar): mismo
              principio que WhatsApp/Telegram en Mensajería -- se
              etiqueta explícito, nunca se presenta como real. */}
          <span style={{ display: "flex", alignItems: "center", gap: 4, font: "600 12px 'Plus Jakarta Sans',sans-serif", color: "#E5C378" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>star</span>
            {simulatedRating(key).toFixed(1)} · {simulatedReviewCount(key)} reseñas (simulado)
          </span>

          <p style={{ margin: 0, font: "400 13px/1.7 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>{wowApp.descripcion}</p>

          <div style={{ display: "flex", alignItems: "baseline", gap: 6, paddingTop: 4, borderTop: "1px solid rgba(255,255,255,.08)" }}>
            <span style={{ font: "700 20px 'Plus Jakarta Sans',sans-serif", color: "#E5C378" }}>
              {wowApp.basePriceUsd > 0 ? `$${wowApp.basePriceUsd.toFixed(0)} USD` : "Gratis"}
            </span>
            {wowApp.basePriceUsd > 0 && <span style={{ font: "400 11px 'Plus Jakarta Sans',sans-serif", color: "#8a8378" }}>pago único</span>}
          </div>
        </div>

        <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "#9a8f80" }}>
          Elegí cómo la querés
        </span>

        <div style={OPTION_CARD}>
          <span style={{ font: "700 12px 'Plus Jakarta Sans',sans-serif", color: "#F5F2EB" }}>Instalación Express</span>
          <p style={{ margin: 0, font: "400 11.5px/1.6 'Plus Jakarta Sans',sans-serif", color: "#8a8378" }}>
            La versión base, lista ya, tal cual está en el catálogo — sin esperar nada.
          </p>
          {install && (
            <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>
              ✓ Ya instalada en {card.name || card.slug} — la ves desde su Oficina Virtual.
            </p>
          )}
          {installed === "1" && !install && (
            <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Instalada.</p>
          )}
          {!install && (
            <form action={installWowAppAction.bind(null, cardId, key)}>
              <button type="submit" style={CTA_PRIMARY}>
                Instalación Express
              </button>
            </form>
          )}
        </div>

        <div style={OPTION_CARD}>
          <span style={{ font: "700 12px 'Plus Jakarta Sans',sans-serif", color: "#F5F2EB" }}>
            Adaptación a tu medida
          </span>
          <p style={{ margin: 0, font: "400 11.5px/1.6 'Plus Jakarta Sans',sans-serif", color: "#8a8378" }}>
            Contanos qué necesitás ajustado para {card.name || "tu negocio"} — nuestro equipo te contacta para
            cotizarlo. Pedido real, atendido por una persona, no un backend automatizado.
          </p>
          {install?.adaptationStatus && install.adaptationStatus !== "sin_pedir" && (
            <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>
              ✓ Ya pediste una adaptación — estado: {install.adaptationStatus}.
            </p>
          )}
          {adaptationRequested === "1" && (
            <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>
              ✓ Pedido enviado, te contactamos pronto.
            </p>
          )}
          {adaptationError === "required" && (
            <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>
              Contanos al menos brevemente qué necesitás.
            </p>
          )}
          <form action={requestAdaptationAction.bind(null, cardId, key)} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <textarea
              name="notes"
              placeholder="Ej. cargame el menú y que hable como una taquería de barrio, no un bistró cheto"
              rows={3}
              style={{ background: "#0D0D0D", border: "1px solid rgba(200,161,90,.25)", borderRadius: 10, padding: "10px 12px", color: "#F5F2EB", font: "400 12.5px 'Plus Jakarta Sans',sans-serif", outline: "none", resize: "vertical" }}
            />
            <button type="submit" style={CTA_SECONDARY}>
              Quiero que funcione exacto para mi negocio
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
