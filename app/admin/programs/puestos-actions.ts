"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentAdminScope } from "@/lib/auth";

// MasterN0 can manage any Program's Puestos; a scoped N0 only their own —
// same guard as the rest of this Program dashboard.
async function requireProgramAccess(programId: string) {
  const scope = await currentAdminScope();
  if (!scope) redirect("/admin/login");
  if (scope.programId && scope.programId !== programId) redirect(`/admin/programs/${scope.programId}`);
  return scope;
}

async function requirePuesto(puestoId: string, programId: string) {
  const puesto = await prisma.puesto.findUnique({ where: { id: puestoId } });
  if (!puesto || puesto.programId !== programId) redirect(`/admin/programs/${programId}`);
  return puesto;
}

export async function createPuestoAction(programId: string, formData: FormData) {
  await requireProgramAccess(programId);

  const siglas = String(formData.get("siglas") || "").trim();
  const denominacion = String(formData.get("denominacion") || "").trim();
  const descripcion = String(formData.get("descripcion") || "").trim();
  const order = Number(formData.get("order") || 0) || 0;

  if (!siglas || !denominacion) redirect(`/admin/programs/${programId}?puestoError=required`);

  await prisma.puesto.create({ data: { programId, siglas, denominacion, descripcion, order } });

  revalidatePath(`/admin/programs/${programId}`);
  redirect(`/admin/programs/${programId}?puestoCreated=1`);
}

export async function updatePuestoAction(puestoId: string, programId: string, formData: FormData) {
  await requireProgramAccess(programId);
  await requirePuesto(puestoId, programId);

  const siglas = String(formData.get("siglas") || "").trim();
  const denominacion = String(formData.get("denominacion") || "").trim();
  const descripcion = String(formData.get("descripcion") || "").trim();
  const order = Number(formData.get("order") || 0) || 0;

  if (!siglas || !denominacion) redirect(`/admin/programs/${programId}?puestoError=required`);

  await prisma.puesto.update({ where: { id: puestoId }, data: { siglas, denominacion, descripcion, order } });

  revalidatePath(`/admin/programs/${programId}`);
  redirect(`/admin/programs/${programId}?puestoSaved=1`);
}

export async function deletePuestoAction(puestoId: string, programId: string) {
  await requireProgramAccess(programId);
  await requirePuesto(puestoId, programId);

  // Cards pointing at this Puesto fall back to their own frozen
  // siglas/tooltip snapshot (onDelete: SetNull on Card.puestoId) — no
  // guard needed here, deleting a Puesto is always safe.
  await prisma.puesto.delete({ where: { id: puestoId } });

  revalidatePath(`/admin/programs/${programId}`);
  redirect(`/admin/programs/${programId}?puestoDeleted=1`);
}
