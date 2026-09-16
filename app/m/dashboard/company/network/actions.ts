"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentMemberId } from "@/lib/memberAuth";

// Member-scoped twin of admin/interviews' completeInterviewAction, but for
// a Company's own client network (PLAN.md, "independencia por tarjeta",
// 2026-09-16) — the owner marks a booked meeting as done, which is what
// flips the client's CardNetworkMembership to "active" and lets their N
// badge compute past NA. Unlike Program's activation, this doesn't spawn
// any new Cards — nobody asked for that yet, so it isn't built.
export async function activateNetworkMembershipAction(cardSlug: string, membershipId: string) {
  const memberId = await currentMemberId();
  if (!memberId) redirect("/m/login");

  const card = await prisma.card.findUnique({ where: { slug: cardSlug } });
  if (!card || card.memberId !== memberId || card.kind !== "company") redirect("/m/dashboard/company");

  const membership = await prisma.cardNetworkMembership.findUnique({ where: { id: membershipId } });
  if (!membership || membership.cardId !== card.id) redirect(`/m/dashboard/company/network`);
  if (membership.status === "active") redirect(`/m/dashboard/company/network`); // idempotent no-op

  await prisma.cardNetworkMembership.update({
    where: { id: membershipId },
    data: { status: "active", interviewedAt: new Date() },
  });

  revalidatePath("/m/dashboard/company/network");
  redirect("/m/dashboard/company/network?activated=1");
}
