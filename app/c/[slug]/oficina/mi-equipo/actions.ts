"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentAdminScope } from "@/lib/auth";
import { currentMemberId } from "@/lib/memberAuth";
import { parseRango } from "@/lib/expertos";

// mi-equipo (Fase 6, WowHead, 2026-10-01) -- el panel del propio
// Experto para armar su equipo. Ver PLAN.md "Fase 6: DISEÑO -- WowHead"
// (c)(4). Dos reglas duras de esta pieza: (1) solo un Legacy rango
// "experto" puede mandar invitaciones -- ese ascenso ya pasó por
// MasterN0 aparte (app/admin/wowstore/actions-equipo.ts
// #promoverAExpertoAction); (2) el invitado SIEMPRE tiene que aceptar
// -- "el experto debe aceptar", confirmado por Gunnar -- nunca se
// setea recruitedById sin esa aceptación explícita.

async function requireOwnExperto(expertoId: string) {
  const experto = await prisma.experto.findUnique({ where: { id: expertoId } });
  if (!experto) redirect("/m/dashboard");

  const [adminScope, memberId] = await Promise.all([currentAdminScope(), currentMemberId()]);
  const isOwner = adminScope !== null || (memberId !== null && memberId === experto.memberId);
  if (!isOwner) redirect("/m/dashboard");

  return experto;
}

async function cardSlugFor(memberId: string): Promise<string> {
  const card = await prisma.card.findFirst({ where: { memberId }, orderBy: { createdAt: "asc" } });
  return card?.slug ?? "";
}

export async function enviarInvitacionEquipoAction(expertoId: string, formData: FormData) {
  const experto = await requireOwnExperto(expertoId);
  const slug = await cardSlugFor(experto.memberId);

  if (parseRango(experto.rango) !== "experto") {
    redirect(`/c/${slug}/oficina/mi-equipo?error=noExperto`);
  }

  const especialistaKey = String(formData.get("especialistaKey") || "").trim();
  if (!especialistaKey) redirect(`/c/${slug}/oficina/mi-equipo?error=empty`);

  const especialista = await prisma.experto.findUnique({ where: { key: especialistaKey } });
  if (!especialista) redirect(`/c/${slug}/oficina/mi-equipo?error=notFound`);
  if (especialista.id === experto.id) redirect(`/c/${slug}/oficina/mi-equipo?error=self`);
  if (especialista.recruitedById) redirect(`/c/${slug}/oficina/mi-equipo?error=yaReclutado`);

  await prisma.equipoInvitacion.upsert({
    where: { expertoId_especialistaId: { expertoId: experto.id, especialistaId: especialista.id } },
    update: { estado: "pendiente", respondidaAt: null },
    create: { expertoId: experto.id, especialistaId: especialista.id },
  });

  revalidatePath(`/c/${slug}/oficina/mi-equipo`);
  redirect(`/c/${slug}/oficina/mi-equipo?invitacionEnviada=1`);
}

// El invitado responde -- SIEMPRE tiene que ser el propio Legacy
// invitado quien acepte o rechace, nunca el Experto que invitó ni
// nadie más. Al aceptar, se setea recruitedById en la misma
// transacción -- de ahí sale el organigrama sin recalcular nada.
export async function responderInvitacionEquipoAction(invitacionId: string, formData: FormData) {
  const invitacion = await prisma.equipoInvitacion.findUnique({ where: { id: invitacionId }, include: { especialista: true } });
  if (!invitacion) redirect("/m/dashboard");

  const [adminScope, memberId] = await Promise.all([currentAdminScope(), currentMemberId()]);
  const isInvitado = adminScope !== null || (memberId !== null && memberId === invitacion.especialista.memberId);
  if (!isInvitado) redirect("/m/dashboard");

  const slug = await cardSlugFor(invitacion.especialista.memberId);
  const respuesta = String(formData.get("respuesta") || "");
  if (respuesta !== "aceptar" && respuesta !== "rechazar") redirect(`/c/${slug}/oficina/mi-equipo`);

  await prisma.$transaction(async (tx) => {
    await tx.equipoInvitacion.update({
      where: { id: invitacionId },
      data: { estado: respuesta === "aceptar" ? "aceptada" : "rechazada", respondidaAt: new Date() },
    });
    if (respuesta === "aceptar") {
      await tx.experto.update({ where: { id: invitacion.especialistaId }, data: { recruitedById: invitacion.expertoId } });
    }
  });

  revalidatePath(`/c/${slug}/oficina/mi-equipo`);
  redirect(`/c/${slug}/oficina/mi-equipo?invitacionRespondida=1`);
}
