import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

// Favicon/título dinámico por tarjeta (2026-09-19, pedido de Gunnar): el
// triángulo dorado que se ve hoy es el ícono genérico de PWA, nunca fue
// pensado como logo — cada Programa puede reemplazarlo por el suyo
// (Program.logoUrl + Program.cardAppName, editable en
// /admin/programs/[id]). Solo aplica a project cards (las únicas con
// Program) — company/personal siguen con "LyCard" hasta que
// "Negocio→Programa" (docs/05-ROADMAP-EDT.md) las convierta en su
// propio Programa. Sin nada configurado, cae a los íconos de siempre —
// nunca rompe, nunca muestra un favicon vacío.
export async function buildCardMetadata(slug: string): Promise<Metadata> {
  const card = await prisma.card.findUnique({
    where: { slug },
    select: { kind: true, program: { select: { logoUrl: true, cardAppName: true } } },
  });

  const appName = card?.kind === "project" ? card.program?.cardAppName?.trim() : "";
  const logoUrl = card?.kind === "project" ? card.program?.logoUrl : null;

  if (!appName && !logoUrl) return {};

  return {
    ...(appName ? { title: appName } : {}),
    ...(logoUrl ? { icons: { icon: [{ url: logoUrl }], apple: [{ url: logoUrl }] } } : {}),
  };
}
