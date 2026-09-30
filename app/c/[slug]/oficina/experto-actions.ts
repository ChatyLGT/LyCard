"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentAdminScope } from "@/lib/auth";
import { currentMemberId } from "@/lib/memberAuth";

// Inbox del propio Experto (Fase 5, 2026-09-30) -- "preguntas que tu
// gemelo no supo responder", ver PLAN.md "Fase 4: DISEÑO --
// Especialistas y Expertos" (c). Solo el dueño real de ese perfil de
// Experto (o MasterN0) puede responder/aprobar -- nunca otro Member ni
// un visitante, aunque conozca el id de la Consulta.
async function requireExpertoOwner(consultaId: string) {
  const consulta = await prisma.consulta.findUnique({ where: { id: consultaId }, include: { experto: true } });
  if (!consulta) redirect("/m/dashboard");

  const [adminScope, memberId] = await Promise.all([currentAdminScope(), currentMemberId()]);
  const isOwner = adminScope !== null || (memberId !== null && memberId === consulta.experto.memberId);
  if (!isOwner) redirect("/m/dashboard");

  return consulta;
}

// Responder una pregunta del inbox -- por sí sola NO la suma al Códice
// (regla dura 5: el Códice nunca sale crudo, solo entra lo que la
// persona aprueba explícitamente, vía el checkbox "aprobar" del form).
// `cardSlug` viaja bindeado desde la propia Oficina que llama a esta
// acción -- evita tener que adivinar a cuál de las hasta-3 Cards del
// Member volver después de guardar.
export async function answerConsultaAction(cardSlug: string, consultaId: string, formData: FormData) {
  const consulta = await requireExpertoOwner(consultaId);

  const respuesta = String(formData.get("respuesta") || "").trim();
  if (!respuesta) redirect(`/c/${cardSlug}/oficina?expertoError=empty`);

  const shouldApprove = formData.get("aprobar") === "on";

  await prisma.$transaction(async (tx) => {
    await tx.consulta.update({ where: { id: consultaId }, data: { respuesta, revisadaPorExpertoAt: new Date() } });
    if (shouldApprove) {
      await tx.codiceEntry.create({
        data: { expertoId: consulta.expertoId, pregunta: consulta.pregunta, respuesta, aprobadaAt: new Date() },
      });
    }
  });

  revalidatePath(`/c/${cardSlug}/oficina`);
  redirect(`/c/${cardSlug}/oficina?expertoAnswered=1`);
}
