"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentAdminScope, canAccessProgram } from "@/lib/auth";
import { parsePuestoTemplatePayload } from "@/lib/puestos";

// MasterN0 can manage any Program's Puestos; a scoped N0 only their own —
// same guard as the rest of this Program dashboard.
async function requireProgramAccess(programId: string) {
  const scope = await currentAdminScope();
  if (!scope) redirect("/admin/login");
  if (!canAccessProgram(scope, programId)) redirect(`/admin/programs/${scope.programId}`);
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
  const icono = String(formData.get("icono") || "").trim() || "diamond";

  if (!siglas || !denominacion) redirect(`/admin/programs/${programId}?puestoError=required`);

  // Un Puesto por sigla dentro del Programa (índice único, lo usa el importador de JSON).
  if (await prisma.puesto.findUnique({ where: { programId_siglas: { programId, siglas } }, select: { id: true } })) {
    redirect(`/admin/programs/${programId}?puestoError=duplicate`);
  }
  await prisma.puesto.create({ data: { programId, siglas, denominacion, descripcion, order, icono } });

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
  const icono = String(formData.get("icono") || "").trim() || "diamond";

  if (!siglas || !denominacion) redirect(`/admin/programs/${programId}?puestoError=required`);

  const clash = await prisma.puesto.findUnique({ where: { programId_siglas: { programId, siglas } }, select: { id: true } });
  if (clash && clash.id !== puestoId) redirect(`/admin/programs/${programId}?puestoError=duplicate`);
  await prisma.puesto.update({ where: { id: puestoId }, data: { siglas, denominacion, descripcion, order, icono } });

  revalidatePath(`/admin/programs/${programId}`);
  redirect(`/admin/programs/${programId}?puestoSaved=1`);
}

// "Elegir de la librería" (2026-10-07, Fase 2 de la Librería de Slots)
// -- a diferencia de Escalas/Superpoderes/Modales (un campo Json que se
// reemplaza), la escalera de Puestos son filas reales de DB. Aplicar un
// template reemplaza TODA la escalera existente (mismo criterio
// "reemplaza, no suma" que el resto de la librería) -- borra los
// Puestos actuales de este Programa y crea los del template, en una
// transacción.
export async function applyPuestoTemplateAction(programId: string, templateId: string) {
  await requireProgramAccess(programId);

  const template = await prisma.slotTemplate.findUnique({ where: { id: templateId } });
  if (!template || template.slotType !== "puesto") redirect(`/admin/programs/${programId}?puestoError=templateNotFound`);

  // Sin siglas repetidas: un Puesto por sigla dentro del Programa (se queda con la primera).
  const items = parsePuestoTemplatePayload(template.payload).filter((it, i, arr) => arr.findIndex((o) => o.siglas === it.siglas) === i);
  if (items.length === 0) redirect(`/admin/programs/${programId}?puestoError=templateEmpty`);

  await prisma.$transaction([
    prisma.puesto.deleteMany({ where: { programId } }),
    prisma.puesto.createMany({
      data: items.map((item) => ({ programId, siglas: item.siglas, denominacion: item.denominacion, descripcion: item.descripcion, icono: item.icono, order: item.order })),
    }),
  ]);

  revalidatePath(`/admin/programs/${programId}`);
  redirect(`/admin/programs/${programId}?puestoTemplateApplied=1`);
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
