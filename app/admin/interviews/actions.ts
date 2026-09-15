"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentAdminId } from "@/lib/auth";
import { MEDALS, RANKS } from "@/lib/data";
import { slugify, uniqueSlug } from "@/lib/slug";

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

// PLAN.md Fase 4: the interview is the gate. MasterN0 (or later, a Program's
// own N0) marks it done here after the real conversation happens outside
// the app — there's no other way to know it occurred. Doing so flips the
// membership to active and, in the same pass, spawns the member's own
// project/company/personal cards (skipping any kind they already have, so
// this is safe to click more than once) and archives where they came from.
export async function completeInterviewAction(registrationId: string) {
  const adminId = await currentAdminId();
  if (!adminId) redirect("/admin/login");

  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: {
      membership: {
        include: {
          member: { include: { cards: true } },
          program: true,
          referredBy: { include: { member: { include: { cards: true } } } },
        },
      },
    },
  });

  if (!registration?.membership) redirect("/admin/interviews");
  const membership = registration.membership;
  if (membership.status === "active") redirect("/admin/interviews"); // already activated — idempotent no-op

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

  // Archive "the card that recruited me" before its guest-mode view stops
  // being relevant — only when there's a referrer and we haven't already
  // (memberId is unique on OriginMemento, so this stays a one-time snapshot).
  const referrerMember = membership.referredBy?.member;
  const referrerProjectCard = referrerMember?.cards.find((c) => c.kind === "project");

  await prisma.$transaction([
    prisma.programMembership.update({
      where: { id: membership.id },
      data: { status: "active", interviewedAt: new Date() },
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
                recruitedAt: registration.createdAt.toISOString(),
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

  revalidatePath("/admin/interviews");
  redirect("/admin/interviews?activated=1");
}
