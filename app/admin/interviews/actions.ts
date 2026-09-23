"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentAdminScope, canAccessProgram } from "@/lib/auth";
import { activateMembershipAndSpawnCards } from "@/lib/activateMembership";

// PLAN.md Fase 4: the interview is the gate. MasterN0 (or later, a Program's
// own N0) marks it done here after the real conversation happens outside
// the app — there's no other way to know it occurred. Doing so flips the
// membership to active and, in the same pass, spawns the member's own
// project/company/personal cards (skipping any kind they already have, so
// this is safe to click more than once) and archives where they came from
// (lib/activateMembership.ts — shared with the Freemium self-service alta,
// 2026-09-23, the only difference being markInterviewed: true here, since
// this IS a real interview and must count for the Embudo).
export async function completeInterviewAction(registrationId: string, returnTo: string = "/admin/interviews") {
  const scope = await currentAdminScope();
  if (!scope) redirect("/admin/login");

  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { membership: true },
  });

  if (!registration?.membership) redirect(returnTo);
  const membership = registration.membership;
  // A scoped Program N0 can only activate memberships inside their own
  // Program — MasterN0 (scope.programId === null) can activate any of them.
  if (!canAccessProgram(scope, membership.programId)) redirect(returnTo);
  if (membership.status === "active") redirect(returnTo); // already activated — idempotent no-op

  await activateMembershipAndSpawnCards(membership.id, {
    markInterviewed: true,
    recruitedAt: registration.createdAt,
  });

  revalidatePath("/admin/interviews");
  revalidatePath(returnTo);
  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}activated=1`);
}
