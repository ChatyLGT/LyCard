import { prisma } from "@/lib/prisma";
import { MEDALS, RANKS } from "@/lib/data";
import { slugify, uniqueSlug } from "@/lib/slug";
import { checkAndPromoteToPrograma } from "@/lib/programPromotion";

type NewCard = {
  slug: string;
  name: string;
  title: string;
  quote: string;
  medal: string;
  rank: string;
  kind: string;
  memberId: string;
  programId?: string;
};

const slugTaken = (slug: string) =>
  prisma.card.findUnique({ where: { slug }, select: { id: true } }).then(Boolean);

// Extraído de completeInterviewAction (PLAN.md Fase 4) para reusarlo en el
// alta Freemium self-service (2026-09-23): la parte que activa una
// membresía y crea las 3 Cards del Member es la misma sea cual sea el
// gatillo -- la entrevista real marcada por un admin, o el registro
// automático de un Vividor. `markInterviewed` es la única diferencia real:
// solo la entrevista humana debe contar para el Embudo (lib/funnel.ts).
// Idempotente -- llamarla dos veces sobre la misma membresía, o sobre un
// Member que ya tiene alguna de las 3 Cards, no duplica nada.
export async function activateMembershipAndSpawnCards(
  membershipId: string,
  options: { markInterviewed: boolean; recruitedAt?: Date }
) {
  const membership = await prisma.programMembership.findUnique({
    where: { id: membershipId },
    include: {
      member: { include: { cards: true } },
      program: true,
      referredBy: { include: { member: { include: { cards: true } } } },
    },
  });

  if (!membership) return;
  if (membership.status === "active") return; // ya activada -- no-op idempotente

  const member = membership.member;
  const haveKinds = new Set(member.cards.map((c) => c.kind));

  const cardsToCreate: NewCard[] = [];
  const baseSlug = await uniqueSlug(slugify(member.name || member.whatsapp || "miembro"), slugTaken);

  if (!haveKinds.has("project")) {
    cardsToCreate.push({
      slug: baseSlug,
      name: member.name,
      title: "",
      quote: "",
      medal: MEDALS[2].id,
      rank: RANKS[1].id,
      kind: "project",
      memberId: member.id,
      programId: membership.programId,
    });
  }
  if (!haveKinds.has("company")) {
    cardsToCreate.push({
      slug: await uniqueSlug(`${baseSlug}-empresa`, slugTaken),
      name: member.name,
      title: "Empresa",
      quote: "",
      medal: MEDALS[2].id,
      rank: RANKS[1].id,
      kind: "company",
      memberId: member.id,
    });
  }
  if (!haveKinds.has("personal")) {
    cardsToCreate.push({
      slug: await uniqueSlug(`${baseSlug}-personal`, slugTaken),
      name: member.name,
      title: "",
      quote: "",
      medal: MEDALS[2].id,
      rank: RANKS[1].id,
      kind: "personal",
      memberId: member.id,
    });
  }

  // Archiva "la tarjeta que me reclutó" antes de que su vista de invitado
  // deje de ser relevante -- solo cuando hay referente y todavía no se hizo
  // (memberId es único en OriginMemento, así que esto queda como snapshot
  // de una sola vez).
  const referrerMember = membership.referredBy?.member;
  const referrerProjectCard = referrerMember?.cards.find((c) => c.kind === "project");

  await prisma.$transaction([
    prisma.programMembership.update({
      where: { id: membership.id },
      data: options.markInterviewed ? { status: "active", interviewedAt: new Date() } : { status: "active" },
    }),
    ...(cardsToCreate.length ? [prisma.card.createMany({ data: cardsToCreate })] : []),
    ...(referrerMember
      ? [
          prisma.originMemento.upsert({
            where: { memberId: member.id },
            update: {},
            create: {
              memberId: member.id,
              snapshot: {
                recruitedAt: (options.recruitedAt ?? new Date()).toISOString(),
                programName: membership.program.name,
                referrerName: referrerMember.name,
                referrerCardSlug: referrerProjectCard?.slug ?? null,
                referrerCardName: referrerProjectCard?.name ?? null,
                referrerCardTitle: referrerProjectCard?.title ?? null,
                referrerPortraitUrl: referrerProjectCard?.portraitUrl ?? null,
              },
            },
          }),
        ]
      : []),
  ]);

  // Promoción Chido→Programa (2026-09-24) -- se chequea DESPUÉS de que la
  // transacción de arriba ya comprometió el "active", nunca antes: si el
  // referente ya es Chido, este humano recién activado puede ser el que
  // le cruza el umbral. No hace nada si no hay referente, o si el
  // referente no es Chido todavía -- ver lib/programPromotion.ts.
  if (membership.referredByMembershipId) {
    await checkAndPromoteToPrograma(membership.referredByMembershipId);
  }
}
