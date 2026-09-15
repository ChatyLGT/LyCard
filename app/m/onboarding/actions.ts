"use server";

import { prisma } from "@/lib/prisma";
import { currentMemberId } from "@/lib/memberAuth";

// Ensures the Legacy Program row exists rather than depending on someone
// having run prisma/seed-legacy-program.ts by hand first (PLAN.md Fase 0
// left that as an optional manual step) — the onboarding chat should work
// standalone.
export async function joinLegacyProgramAction(input: { referredByCardSlug: string | null }) {
  const memberId = await currentMemberId();
  if (!memberId) return { ok: false as const, error: "unauthenticated" };

  const program = await prisma.program.upsert({
    where: { slug: "legacy" },
    update: {},
    create: { slug: "legacy", name: "Legacy", primaryColor: "#C8A15A" },
  });

  let referredByMembershipId: string | null = null;
  if (input.referredByCardSlug) {
    const referrerCard = await prisma.card.findUnique({ where: { slug: input.referredByCardSlug } });
    if (referrerCard?.memberId) {
      const referrerMembership = await prisma.programMembership.findUnique({
        where: { memberId_programId: { memberId: referrerCard.memberId, programId: program.id } },
      });
      referredByMembershipId = referrerMembership?.id ?? null;
    }
  }

  const membership = await prisma.programMembership.upsert({
    where: { memberId_programId: { memberId, programId: program.id } },
    update: {},
    create: { memberId, programId: program.id, referredByMembershipId, status: "invited" },
  });

  return { ok: true as const, membershipId: membership.id };
}
