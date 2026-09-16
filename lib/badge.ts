import { prisma } from "@/lib/prisma";
import type { Card } from "@/generated/prisma/client";

// Viewer-relative "N" badge for the top-left circle (2026-09-16) — every
// fractal is independent per Card, per Gunnar: MasterN0 sees N0 on any
// Card; a Program's own scoped N0 sees N0 only on that Program's project
// cards; a Member sees their own depth in that specific fractal (a
// Program's referral chain for project, a Company's own client network for
// company); Personal has no fractal at all, just a contact list. Anyone
// with no relationship to that particular fractal — including a plain
// anonymous visitor — sees "NA", so the badge always has something to show
// and the circle never has to disappear (it used to, when it only meant
// "is this the global MasterN0 admin").
export async function computeBadge(
  card: Card,
  adminScope: { id: string; programId: string | null } | null,
  memberId: string | null
): Promise<string> {
  if (adminScope) {
    if (adminScope.programId === null) return "N0"; // MasterN0 — N0 everywhere
    if (card.kind === "project" && adminScope.programId === card.programId) return "N0";
  }

  if (card.kind === "personal") return "NA";
  if (!memberId) return "NA";

  if (card.kind === "project") {
    if (!card.programId) return "NA";
    const membership = await prisma.programMembership.findUnique({
      where: { memberId_programId: { memberId, programId: card.programId } },
    });
    if (!membership || membership.status !== "active") return "NA";
    // +1: N0 is reserved for the actual root (the Program's N0 admin, who
    // has no ProgramMembership row of their own) — a member with zero
    // referrers is still one level below that, N1, not N0.
    return `N${(await chainDepth("programMembership", membership.id)) + 1}`;
  }

  if (card.kind === "company") {
    if (card.memberId === memberId) return "N0"; // the owner is their own network's root
    const membership = await prisma.cardNetworkMembership.findUnique({
      where: { memberId_cardId: { memberId, cardId: card.id } },
    });
    if (!membership || membership.status !== "active") return "NA";
    // Same +1 as above — N0 is the owner, who has no membership row either.
    return `N${(await chainDepth("cardNetworkMembership", membership.id)) + 1}`;
  }

  return "NA";
}

// Walks referredByMembershipId up to the root, counting hops — 0 means no
// referrer (the fractal's own root member). Guarded against bad/circular
// data; neither model's chains are expected to run anywhere near 50 deep.
async function chainDepth(model: "programMembership" | "cardNetworkMembership", membershipId: string): Promise<number> {
  let depth = 0;
  let currentId: string | null = membershipId;
  for (let guard = 0; guard < 50 && currentId; guard++) {
    const row: { referredByMembershipId: string | null } | null =
      model === "programMembership"
        ? await prisma.programMembership.findUnique({ where: { id: currentId }, select: { referredByMembershipId: true } })
        : await prisma.cardNetworkMembership.findUnique({ where: { id: currentId }, select: { referredByMembershipId: true } });
    if (!row?.referredByMembershipId) break;
    depth++;
    currentId = row.referredByMembershipId;
  }
  return depth;
}
