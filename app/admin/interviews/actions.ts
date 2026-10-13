"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { resolveActingScope, canAccessProgram } from "@/lib/auth";
import { activateMembershipAndSpawnCards } from "@/lib/activateMembership";
import { findAccessDoor, isValidPaymentModel } from "@/lib/accessDoors";
import { parseSessionLog, nextSessionNumber } from "@/lib/sessionLog";

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

// Matriz de oferta de cierre, un solo tap (2026-10-12) -- misma acción
// de negocio que assignDoorAction, mismo guard, mismos campos reales
// de ACCESS_DOORS -- solo que en vez de tipear precio/forma de
// pago/quién lo trajo a mano, usa los defaults reales de la puerta
// elegida (su paymentModels[0] y su precioDefault). Pensada para
// cerrar en vivo durante una llamada, sin que la Oreja tenga que
// completar un formulario con el cliente esperando. El form detallado
// de assignDoorAction sigue existiendo al lado para precio/forma de
// pago distintos al default.
export async function quickAssignDoorAction(membershipId: string, programId: string, returnTo: string, doorKey: string) {
  const scope = await resolveActingScope();
  if (!scope) redirect("/admin/login");
  if (!canAccessProgram(scope, programId)) redirect(returnTo);

  const door = findAccessDoor(doorKey);
  if (!door) redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}doorError=doorKey`);

  const membership = await prisma.programMembership.findUnique({ where: { id: membershipId } });
  if (!membership || membership.programId !== programId) redirect(returnTo);

  await prisma.programMembership.update({
    where: { id: membershipId },
    data: {
      doorKey: door.key,
      priceAgreedUsd: door.precioDefault,
      paymentModel: door.paymentModels[0],
      traidoPor: "oreja",
      doorAssignedAt: new Date(),
      soldByAdminId: scope.id,
    },
  });

  revalidatePath(returnTo);
  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}doorAssigned=1`);
}

// Pool General de Leads -- marcar que de verdad asistió a su
// Masterclass (2026-10-12). Sin integración real con Zoom/Meet que
// reporte asistencia, esto es una marca humana, mismo criterio
// honesto que "Marcar entrevista hecha".
export async function markMasterclassAttendedAction(registrationId: string, programId: string, returnTo: string) {
  const scope = await resolveActingScope();
  if (!scope) redirect("/admin/login");
  if (!canAccessProgram(scope, programId)) redirect(returnTo);

  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { card: { select: { programId: true } } },
  });
  if (!registration || registration.card.programId !== programId) redirect(returnTo);

  await prisma.registration.update({ where: { id: registrationId }, data: { attendedAt: new Date() } });

  revalidatePath(returnTo);
  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}masterclassAttended=1`);
}

// Viaje del Cliente, Fase 2 (2026-10-12) -- la Oreja agenda a mano la
// entrevista 1:1 de Legacy, directo desde su tablero (/empleados), con el
// Lead ya "asistió" a su Masterclass. En la tarjeta pública SOLO se agenda
// la Masterclass -- esto nunca pasa por el selector de slots público. Se
// puede llamar más de una vez (reagendar), y queda limpio sola cuando
// completeInterviewAction marca la entrevista como hecha de verdad (ver
// lib/activateMembership.ts).
export async function scheduleInterviewAction(membershipId: string, programId: string, returnTo: string, formData: FormData) {
  const scope = await resolveActingScope();
  if (!scope) redirect("/admin/login");
  if (!canAccessProgram(scope, programId)) redirect(returnTo);

  const raw = String(formData.get("nextInterviewAt") || "");
  const date = raw ? new Date(raw) : null;
  if (!date || Number.isNaN(date.getTime())) {
    redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}interviewError=date`);
  }

  const membership = await prisma.programMembership.findUnique({ where: { id: membershipId } });
  if (!membership || membership.programId !== programId) redirect(returnTo);

  await prisma.programMembership.update({ where: { id: membershipId }, data: { nextInterviewAt: date } });

  revalidatePath(returnTo);
  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}interviewScheduled=1`);
}

// Bolsa de Leads (2026-10-12) -- cualquier Oreja del Programa puede
// tomar un Registration sin dueño todavía; una vez tomado, desaparece
// de la bolsa compartida y pasa a "Mis Leads" de quien lo tomó. Mismo
// guard de siempre -- nunca se puede reclamar un lead de otro Programa.
export async function claimLeadAction(registrationId: string, programId: string, returnTo: string) {
  const scope = await resolveActingScope();
  if (!scope) redirect("/admin/login");
  if (!canAccessProgram(scope, programId)) redirect(returnTo);

  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { card: { select: { programId: true } } },
  });
  if (!registration || registration.card.programId !== programId) redirect(returnTo);
  if (registration.claimedByAdminId) redirect(returnTo); // ya tomado -- no-op idempotente

  await prisma.registration.update({
    where: { id: registrationId },
    data: { claimedByAdminId: scope.id, claimedAt: new Date() },
  });

  revalidatePath(returnTo);
  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}leadClaimed=1`);
}

// Bitácora de sesiones (2026-10-12) -- ver lib/sessionLog.ts para el
// porqué de no inventar un checklist ni un número total de sesiones.
export async function logSessionAction(membershipId: string, programId: string, returnTo: string, formData: FormData) {
  const scope = await resolveActingScope();
  if (!scope) redirect("/admin/login");
  if (!canAccessProgram(scope, programId)) redirect(returnTo);

  const notes = String(formData.get("notes") || "").trim();
  if (!notes) redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}sessionError=notesEmpty`);

  const membership = await prisma.programMembership.findUnique({ where: { id: membershipId } });
  if (!membership || membership.programId !== programId) redirect(returnTo);

  const log = parseSessionLog(membership.sessionLog);
  log.push({
    sessionNumber: nextSessionNumber(log),
    notes,
    loggedAt: new Date().toISOString(),
    loggedByAdminId: scope.id,
  });

  await prisma.programMembership.update({
    where: { id: membershipId },
    data: { sessionLog: log },
  });

  revalidatePath(returnTo);
  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}sessionLogged=1`);
}

// Viaje del Cliente, Fase 3 (2026-10-13) -- chat interno real Oreja↔Lead.
// Reusa el canal "lycard" que ya existía para Member↔Member
// (app/m/dashboard/messages-actions.ts) -- Message.senderAdminId ya
// existía en el schema pero nunca se usaba desde ninguna action; esta es
// la primera. El Lead necesita una ProgramMembership real debajo (mismo
// gate honesto que scheduleInterviewAction/completeInterviewAction) --
// sin eso no hay a quién mandarle el mensaje de verdad.
export async function sendOrejaMessageAction(membershipId: string, programId: string, returnTo: string, formData: FormData) {
  const scope = await resolveActingScope();
  if (!scope) redirect("/admin/login");
  if (!canAccessProgram(scope, programId)) redirect(returnTo);

  const body = String(formData.get("body") || "").trim();
  if (!body) redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}chatError=empty`);

  const membership = await prisma.programMembership.findUnique({ where: { id: membershipId } });
  if (!membership || membership.programId !== programId) redirect(returnTo);

  const message = await prisma.message.create({
    data: { programId, scope: "directo", body, senderAdminId: scope.id },
  });
  await prisma.messageDelivery.create({
    data: { messageId: message.id, recipientMemberId: membership.memberId, channel: "lycard", status: "enviado" },
  });

  revalidatePath(returnTo);
  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}chatSent=1`);
}
