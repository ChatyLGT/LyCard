"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { resolveActingScope, canAccessProgram } from "@/lib/auth";
import { activateMembershipAndSpawnCards } from "@/lib/activateMembership";
import { findAccessDoor, isValidPaymentModel } from "@/lib/accessDoors";

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
  // Panel de Empleados (2026-10-07): resolveActingScope también acepta
  // la cookie de empleado -- misma acción, mismo guard, sin duplicar.
  const scope = await resolveActingScope();
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

// Viaje del Cliente -- puerta de acceso (2026-10-07): el colaborador
// registra, sobre esta misma Membership, qué puerta del
// MENU_ACCESO_LEGACY v1.1 eligió el cliente y a qué precio/forma de
// pago -- no activa nada por sí sola, es independiente de "Marcar
// entrevista hecha" (se puede llenar antes o después). lib/accessDoors.ts
// es el mismo validador que usa este form y la UI, no uno nuevo.
export async function assignDoorAction(membershipId: string, programId: string, returnTo: string, formData: FormData) {
  const scope = await resolveActingScope();
  if (!scope) redirect("/admin/login");
  if (!canAccessProgram(scope, programId)) redirect(returnTo);

  const doorKey = String(formData.get("doorKey") || "");
  const paymentModel = String(formData.get("paymentModel") || "");
  const traidoPor = String(formData.get("traidoPor") || "");
  const priceAgreedUsd = Number(formData.get("priceAgreedUsd"));

  const door = findAccessDoor(doorKey);
  const errorParam = (code: string) => redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}doorError=${code}`);

  if (!door) errorParam("doorKey");
  if (!isValidPaymentModel(doorKey, paymentModel)) errorParam("paymentModel");
  if (traidoPor !== "empresa" && traidoPor !== "oreja") errorParam("traidoPor");
  if (!Number.isInteger(priceAgreedUsd) || priceAgreedUsd < 0) errorParam("priceAgreedUsd");

  const membership = await prisma.programMembership.findUnique({ where: { id: membershipId } });
  if (!membership || membership.programId !== programId) redirect(returnTo);

  await prisma.programMembership.update({
    where: { id: membershipId },
    data: { doorKey, priceAgreedUsd, paymentModel, traidoPor, doorAssignedAt: new Date(), soldByAdminId: scope.id },
  });

  revalidatePath(returnTo);
  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}doorAssigned=1`);
}
