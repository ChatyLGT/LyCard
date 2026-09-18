import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { currentAdminScope } from "@/lib/auth";
import { currentMemberId } from "@/lib/memberAuth";
import { computeBadge } from "@/lib/badge";
import { buildCardMetadata } from "@/lib/cardMetadata";
import { parseShareScope } from "@/lib/shareScope";
import LyCardView from "@/components/LyCardView";
import CardCarousel, { type CarouselBundle } from "@/components/CardCarousel";
import type { Card, Program, ProgramSkin, Puesto } from "@/generated/prisma/client";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return buildCardMetadata(slug);
}

// A project card's Program plus only its active skin (0 or 1 rows) — the
// filter lives in the Prisma query itself (Fase 2 del sistema de skins,
// 2026-09-16), so LyCardView never has to pick the right one out of 3.
const PROGRAM_INCLUDE = { skins: { where: { active: true } } } as const;

export const dynamic = "force-dynamic";

// Fixed swipe order across a Member's 3 Cards, whichever of the 3 links
// someone opens: Programa → Business → Personal.
const KIND_ORDER = ["project", "company", "personal"];

async function buildCardBundle(
  card: Card & { program: (Program & { skins: ProgramSkin[] }) | null; puesto: Puesto | null },
  baseUrl: string,
  adminScope: { id: string; programId: string | null } | null,
  memberId: string | null
): Promise<CarouselBundle> {
  const cardUrl = `${baseUrl}/c/${card.slug}`;
  const [qrSvg, originMemento, badge] = await Promise.all([
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
    // Independent per Card (2026-09-16) — unlike isHost/isAdmin, which are
    // shared across the whole carousel, each slide computes its own N.
    computeBadge(card, adminScope, memberId),
  ]);
  return { card, qrSvg, originMemento, program: card.program, puesto: card.puesto, badge };
}

export default async function CardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const card = await prisma.card.findUnique({ where: { slug }, include: { program: { include: PROGRAM_INCLUDE }, puesto: true } });
  if (!card) notFound();

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const [adminScope, memberId] = await Promise.all([currentAdminScope(), currentMemberId()]);
  const isAdmin = adminScope !== null;

  // MasterN0 always sees host mode (same reasoning as the existing tune-icon
  // edit access: admin already has full control over every card). The one
  // Card marked isOrigin (Einar Horn/MasterN0, 2026-09-16) is host to EVERY
  // visitor too — it's the root the referral fractal activates from, so it
  // doesn't depend on a Member session to prove ownership. Otherwise host
  // mode requires the viewer's own Member session to match the card's owner
  // (PLAN.md Fase 2).
  const isHost = isAdmin || card.isOrigin || (memberId !== null && memberId === card.memberId);

  // Swipeable Programa/Business/Personal carousel — pero solo hasta donde
  // ESTA tarjeta puntual lo permite (2026-09-19, pedido de Gunnar): un
  // visitante que abre el link de la Personal no debería enterarse en qué
  // Programa está alguien, a menos que el dueño lo prenda a mano
  // (Card.shareScope). El propio dueño (isHost) siempre ve sus 3 juntas,
  // sin restricción — esto es sobre lo que ve un tercero, no sobre la
  // navegación propia. Una Card sin memberId (standalone/MasterN0 seed) no
  // tiene hermanas y renderiza sola, sin cambios.
  const siblings = card.memberId
    ? await prisma.card.findMany({ where: { memberId: card.memberId }, include: { program: { include: PROGRAM_INCLUDE }, puesto: true } })
    : [card];
  const visibleKinds = isHost ? KIND_ORDER : [card.kind, ...parseShareScope(card.shareScope)];
  const ordered = KIND_ORDER.filter((k) => visibleKinds.includes(k))
    .map((k) => siblings.find((c) => c.kind === k))
    .filter((c): c is typeof siblings[number] => Boolean(c));

  const bundles = await Promise.all(ordered.map((c) => buildCardBundle(c, baseUrl, adminScope, memberId)));

  if (bundles.length <= 1) {
    const b = bundles[0];
    return (
      <LyCardView
        card={b.card}
        qrSvg={b.qrSvg}
        isAdmin={isAdmin}
        isHost={isHost}
        badge={b.badge}
        originMemento={b.originMemento}
        program={b.program}
        puesto={b.puesto}
      />
    );
  }

  return <CardCarousel cards={bundles} initialSlug={slug} isAdmin={isAdmin} isHost={isHost} />;
}
