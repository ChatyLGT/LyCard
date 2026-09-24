import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { currentMember } from "@/lib/memberAuth";
import { prisma } from "@/lib/prisma";
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

export default async function WowAppDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ cardId?: string; installed?: string; adaptationRequested?: string; adaptationError?: string }>;
}) {
  const member = await currentMember();
  if (!member) redirect("/m/login");

  const { key } = await params;
  const { cardId, installed, adaptationRequested, adaptationError } = await searchParams;
  if (!cardId) redirect("/m/dashboard");

  const card = await prisma.card.findUnique({ where: { id: cardId } });
  if (!card || card.memberId !== member.id) redirect("/m/dashboard");

  const wowApp = await prisma.wowApp.findUnique({ where: { key } });
  if (!wowApp) notFound();

  const install = await prisma.wowAppInstall.findUnique({
    where: { cardId_wowAppId: { cardId, wowAppId: wowApp.id } },
  });

  return (
    <div style={{ minHeight: "100vh", background: "#131313", color: "#e5e2e1", fontFamily: "'Plus Jakarta Sans',sans-serif", padding: "40px 20px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
        <Link href={`/m/wowstore?cardId=${cardId}`} style={{ color: "#8a8378", font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase" }}>
          ← WowStore
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ flex: "none", width: 46, height: 46, borderRadius: 14, background: `${wowApp.color}1F`, border: `1px solid ${wowApp.color}55`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22, color: wowApp.color }}>bolt</span>
          </span>
          <div>
            <h1 style={{ margin: 0, font: "500 22px 'Playfair Display',serif", color: "#F5F2EB" }}>{wowApp.nombre}</h1>
            <span style={{ font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: wowApp.status === "activo" ? "#7BC98E" : "#C8A15A" }}>
              {wowApp.status === "activo" ? "Activa" : "Próximamente"}
            </span>
          </div>
        </div>

        <p style={{ margin: 0, font: "400 13px/1.7 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>{wowApp.descripcion}</p>

        {wowApp.basePriceUsd > 0 && (
          <p style={{ margin: 0, font: "700 14px 'Plus Jakarta Sans',sans-serif", color: "#E5C378" }}>
            Desde ${wowApp.basePriceUsd.toFixed(2)} USD
          </p>
        )}

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

        <div style={{ background: "#201f1f", borderRadius: 14, padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
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
