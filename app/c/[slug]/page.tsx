import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { isAdminAuthed } from "@/lib/auth";
import { currentMemberId } from "@/lib/memberAuth";
import LyCardView from "@/components/LyCardView";
import CardCarousel, { type CarouselBundle } from "@/components/CardCarousel";
import type { Card, Program, Puesto } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

// Fixed swipe order across a Member's 3 Cards, whichever of the 3 links
// someone opens: Programa → Business → Personal.
const KIND_ORDER = ["project", "company", "personal"];

async function buildCardBundle(
  card: Card & { program: Program | null; puesto: Puesto | null },
  baseUrl: string
): Promise<CarouselBundle> {
  const cardUrl = `${baseUrl}/c/${card.slug}`;
  const [qrSvg, originMemento] = await Promise.all([
    QRCode.toString(cardUrl, {
      type: "svg",
      margin: 1,
      color: { dark: "#141414", light: "#FFFFFF" },
    }),
    // Only project cards show this (their Virtual Office is their own
    // recruitment story, PLAN.md Fase 7) — skip the query otherwise.
    card.kind === "project" && card.memberId
      ? prisma.originMemento.findUnique({ where: { memberId: card.memberId } })
      : null,
  ]);
  return { card, qrSvg, originMemento, program: card.program, puesto: card.puesto };
}

export default async function CardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const card = await prisma.card.findUnique({ where: { slug }, include: { program: true, puesto: true } });
  if (!card) notFound();

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const [isAdmin, memberId] = await Promise.all([isAdminAuthed(), currentMemberId()]);

  // MasterN0 always sees host mode (same reasoning as the existing tune-icon
  // edit access: admin already has full control over every card). The one
  // Card marked isOrigin (Einar Horn/MasterN0, 2026-09-16) is host to EVERY
  // visitor too — it's the root the referral fractal activates from, so it
  // doesn't depend on a Member session to prove ownership. Otherwise host
  // mode requires the viewer's own Member session to match the card's owner
  // (PLAN.md Fase 2).
  const isHost = isAdmin || card.isOrigin || (memberId !== null && memberId === card.memberId);

  // Swipeable Programa/Business/Personal carousel: any visitor holding a
  // link to one of a Member's 3 Cards can swipe to the other two — a Card
  // with no memberId (a standalone/legacy card, or the MasterN0 seed) has
  // no siblings and just renders on its own, unchanged.
  const siblings = card.memberId
    ? await prisma.card.findMany({ where: { memberId: card.memberId }, include: { program: true, puesto: true } })
    : [card];
  const ordered = KIND_ORDER.map((k) => siblings.find((c) => c.kind === k)).filter(
    (c): c is typeof siblings[number] => Boolean(c)
  );

  const bundles = await Promise.all(ordered.map((c) => buildCardBundle(c, baseUrl)));

  if (bundles.length <= 1) {
    const b = bundles[0];
    return (
      <LyCardView
        card={b.card}
        qrSvg={b.qrSvg}
        isAdmin={isAdmin}
        isHost={isHost}
        originMemento={b.originMemento}
        program={b.program}
        puesto={b.puesto}
      />
    );
  }

  return <CardCarousel cards={bundles} initialSlug={slug} isAdmin={isAdmin} isHost={isHost} />;
}
