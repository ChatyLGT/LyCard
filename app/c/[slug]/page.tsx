import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { isAdminAuthed } from "@/lib/auth";
import { currentMemberId } from "@/lib/memberAuth";
import LyCardView from "@/components/LyCardView";

export const dynamic = "force-dynamic";

export default async function CardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const card = await prisma.card.findUnique({ where: { slug }, include: { program: true } });
  if (!card) notFound();

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const cardUrl = `${baseUrl}/c/${card.slug}`;
  const [qrSvg, isAdmin, memberId, originMemento] = await Promise.all([
    QRCode.toString(cardUrl, {
      type: "svg",
      margin: 1,
      color: { dark: "#141414", light: "#FFFFFF" },
    }),
    isAdminAuthed(),
    currentMemberId(),
    // Only project cards show this (their Virtual Office is their own
    // recruitment story, PLAN.md Fase 7) — skip the query otherwise.
    card.kind === "project" && card.memberId
      ? prisma.originMemento.findUnique({ where: { memberId: card.memberId } })
      : null,
  ]);

  // MasterN0 always sees host mode (same reasoning as the existing tune-icon
  // edit access: admin already has full control over every card). Otherwise
  // host mode requires the viewer's own Member session to match the card's
  // owner (PLAN.md Fase 2).
  const isHost = isAdmin || (memberId !== null && memberId === card.memberId);

  return (
    <LyCardView
      card={card}
      qrSvg={qrSvg}
      isAdmin={isAdmin}
      isHost={isHost}
      originMemento={originMemento}
      program={card.program}
    />
  );
}
