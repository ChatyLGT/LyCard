"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentAdminScope, canAccessProgram } from "@/lib/auth";

// Auditoría 2026-09-23, hallazgo 1.4 -- cupo real de entrevistas por
// Programa. Mismo patrón que puestos-actions.ts: filas propias con id
// estable (no un JSON compartido), porque acá hace falta poder contar
// Registrations reales contra cada slot.
async function requireProgramAccess(programId: string) {
  const scope = await currentAdminScope();
  if (!scope) redirect("/admin/login");
  if (!canAccessProgram(scope, programId)) redirect(`/admin/programs/${scope.programId}`);
  return scope;
}

async function requireInterviewSlot(slotId: string, programId: string) {
  const slot = await prisma.interviewSlot.findUnique({ where: { id: slotId } });
  if (!slot || slot.programId !== programId) redirect(`/admin/programs/${programId}`);
  return slot;
}

export async function createInterviewSlotAction(programId: string, formData: FormData) {
  await requireProgramAccess(programId);

  const label = String(formData.get("label") || "").trim();
  const labelEn = String(formData.get("labelEn") || "").trim();
  const time = String(formData.get("time") || "").trim();
  const dateRaw = String(formData.get("date") || "").trim();
  const capacity = Math.max(1, Number(formData.get("capacity") || 20) || 20);

  const date = dateRaw ? new Date(dateRaw) : null;
  if (!label || !time || !date || Number.isNaN(date.getTime())) {
    redirect(`/admin/programs/${programId}?slotError=required`);
  }

  await prisma.interviewSlot.create({
    data: { programId, label, labelEn: labelEn || label, time, date, capacity },
  });

  revalidatePath(`/admin/programs/${programId}`);
  redirect(`/admin/programs/${programId}?slotCreated=1`);
}

export async function updateInterviewSlotAction(slotId: string, programId: string, formData: FormData) {
  await requireProgramAccess(programId);
  await requireInterviewSlot(slotId, programId);

  const label = String(formData.get("label") || "").trim();
  const labelEn = String(formData.get("labelEn") || "").trim();
  const time = String(formData.get("time") || "").trim();
  const dateRaw = String(formData.get("date") || "").trim();
  const capacity = Math.max(1, Number(formData.get("capacity") || 20) || 20);

  const date = dateRaw ? new Date(dateRaw) : null;
  if (!label || !time || !date || Number.isNaN(date.getTime())) {
    redirect(`/admin/programs/${programId}?slotError=required`);
  }

  await prisma.interviewSlot.update({
    where: { id: slotId },
    data: { label, labelEn: labelEn || label, time, date, capacity },
  });

  revalidatePath(`/admin/programs/${programId}`);
  redirect(`/admin/programs/${programId}?slotSaved=1`);
}

export async function deleteInterviewSlotAction(slotId: string, programId: string) {
  await requireProgramAccess(programId);
  await requireInterviewSlot(slotId, programId);

  // A diferencia de Puesto, acá SÍ importa: borrar un slot con gente ya
  // anotada le rompe la trazabilidad real de quién se anotó a qué
  // horario -- misma lógica de guardia que deleteMemberAction con
  // cardCount.
  const registrationCount = await prisma.registration.count({ where: { interviewSlotId: slotId } });
  if (registrationCount > 0) {
    redirect(`/admin/programs/${programId}?slotError=hasRegistrations`);
  }

  await prisma.interviewSlot.delete({ where: { id: slotId } });

  revalidatePath(`/admin/programs/${programId}`);
  redirect(`/admin/programs/${programId}?slotDeleted=1`);
}
