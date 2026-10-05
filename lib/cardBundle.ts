import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { computeBadge } from "@/lib/badge";
import { upcomingSlots } from "@/lib/interviewSlots";
import type { Card, Program, ProgramSkin, Puesto } from "@/generated/prisma/client";

// Extraído de app/c/[slug]/page.tsx (2026-10-05) para que app/page.tsx (la
// pantalla Mirón/NA) pueda armar el mismo bundle real para la Card Origen
// sin duplicar esta lógica -- un solo lugar que arma qrSvg/originMemento/
// badge/interviewSlots a partir de una Card.
export const PROGRAM_INCLUDE = { skins: { where: { active: true } }, puestos: { orderBy: { order: "asc" } } } as const;

export type CardBundle = {
  card: Card;
  qrSvg: string;
  originMemento: Awaited<ReturnType<typeof prisma.originMemento.findUnique>>;
  program: (Program & { skins: ProgramSkin[]; puestos: Puesto[] }) | null;
  puesto: Puesto | null;
  badge: string;
  interviewSlots: { id: string; label: string; labelEn: string; time: string }[];
};

export async function buildCardBundle(
  card: Card & { program: (Program & { skins: ProgramSkin[]; puestos: Puesto[] }) | null; puesto: Puesto | null },
  baseUrl: string,
  adminScope: { id: string; programId: string | null } | null,
  memberId: string | null
): Promise<CardBundle> {
  const cardUrl = `${baseUrl}/c/${card.slug}`;
  const [qrSvg, originMemento, badge] = await Promise.all([
    QRCode.toString(cardUrl, {
      type: "svg",
      margin: 1,
      color: { dark: "#141414", light: "#FFFFFF" },
    }),
    card.kind === "project" && card.memberId
      ? prisma.originMemento.findUnique({ where: { memberId: card.memberId } })
      : null,
    computeBadge(card, adminScope, memberId),
  ]);

  let interviewSlots: { id: string; label: string; labelEn: string; time: string }[] = upcomingSlots();
  if (card.kind === "project" && card.programId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const realSlots = await prisma.interviewSlot.findMany({
      where: { programId: card.programId, date: { gte: today } },
      orderBy: { date: "asc" },
    });
    if (realSlots.length > 0) {
      interviewSlots = realSlots.map((s) => ({ id: s.id, label: s.label, labelEn: s.labelEn, time: s.time }));
    }
  }

  return { card, qrSvg, originMemento, program: card.program, puesto: card.puesto, badge, interviewSlots };
}
