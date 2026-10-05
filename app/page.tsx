import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buildCardBundle, PROGRAM_INCLUDE } from "@/lib/cardBundle";
import LyCardView from "@/components/LyCardView";

export const dynamic = "force-dynamic";

// Tarjeta visitante NA (2026-10-05, pedido de Gunnar: "Son quienes
// llegaron a la tarjeta por algún motivo sin tener un host"). Corrección
// del mismo Gunnar sobre el primer intento (una página aparte,
// MironLanding.tsx, ya borrada): "esto debería salir en vez del qr en la
// tarjeta del visitante.. el que viene de la nada" -- no es una pantalla
// bespoke con su propio diseño, es LA TARJETA REAL de Legacy (la Card
// marcada isOrigin, con su contenido/branding real), renderizada por el
// mismo LyCardView de siempre, con host forzado a false (nadie edita
// nada acá, sea quien sea) y el cubo central QR reemplazado por el de
// escanear/elegir Programa (ver `naMode` en components/LyCardView.tsx).
export default async function Home() {
  const cardCount = await prisma.card.count();
  if (cardCount === 0) redirect("/admin/login");

  const originCard = await prisma.card.findFirst({
    where: { isOrigin: true },
    include: { program: { include: PROGRAM_INCLUDE }, puesto: true },
  });
  const card =
    originCard ??
    (await prisma.card.findFirst({
      orderBy: { createdAt: "asc" },
      include: { program: { include: PROGRAM_INCLUDE }, puesto: true },
    }));
  if (!card) redirect("/admin/login");

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  // adminScope/memberId siempre null acá a propósito -- esta pantalla es
  // la misma para cualquiera, nunca personalizada por la sesión de quien
  // la mira (ni aunque sea el propio MasterN0 sin querer entrando a "/").
  const bundle = await buildCardBundle(card, baseUrl, null, null);

  const activePrograms = await prisma.program.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, cards: { select: { slug: true, kind: true }, orderBy: { createdAt: "asc" } } },
  });

  // Solo Programas con al menos una Card real para mostrar -- nunca un
  // link muerto. Prioriza company/project sobre personal como "cara
  // pública" del Programa.
  const naPrograms = activePrograms
    .map((p) => {
      const repCard = p.cards.find((c) => c.kind === "project") || p.cards.find((c) => c.kind === "company") || p.cards[0];
      return repCard ? { id: p.id, name: p.name, cardSlug: repCard.slug } : null;
    })
    .filter((p): p is { id: string; name: string; cardSlug: string } => p !== null);

  return (
    <LyCardView
      card={bundle.card}
      qrSvg={bundle.qrSvg}
      isAdmin={false}
      isHost={false}
      isAuthenticatedOwner={false}
      badge={bundle.badge}
      originMemento={bundle.originMemento}
      program={bundle.program}
      puesto={bundle.puesto}
      interviewSlots={bundle.interviewSlots}
      recipient={null}
      naMode={true}
      naPrograms={naPrograms}
    />
  );
}
