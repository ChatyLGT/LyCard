"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentMemberId } from "@/lib/memberAuth";

// Directo 1:1 -- cualquier humano que no sea N0 (y de hecho también un
// N0, nada se lo impide) puede escribirle a alguien de su MISMO
// Programa. Nunca multi-canal acá -- eso es cosa de la difusión
// masiva; el directo siempre es "lycard" (bandeja interna), sin
// selector de canal.
export async function sendDirectMessageAction(programId: string, recipientMemberId: string, formData: FormData) {
  const memberId = await currentMemberId();
  if (!memberId) redirect("/m/login");

  const body = String(formData.get("body") || "").trim();
  if (!body) redirect(`/m/dashboard/messages?directError=empty&to=${recipientMemberId}`);

  const [senderMembership, recipientMembership] = await Promise.all([
    prisma.programMembership.findUnique({ where: { memberId_programId: { memberId, programId } } }),
    prisma.programMembership.findUnique({ where: { memberId_programId: { memberId: recipientMemberId, programId } } }),
  ]);
  // Los dos tienen que pertenecer al MISMO Programa -- "tu equipo" es,
  // a propósito, la definición más simple que ya soporta el dato que
  // existe (ver PLAN.md).
  if (!senderMembership || !recipientMembership) redirect("/m/dashboard/messages");

  const message = await prisma.message.create({
    data: { programId, scope: "directo", body, senderMemberId: memberId },
  });
  await prisma.messageDelivery.create({
    data: { messageId: message.id, recipientMemberId, channel: "lycard", status: "enviado" },
  });

  revalidatePath("/m/dashboard/messages");
  redirect(`/m/dashboard/messages?sent=1&to=${recipientMemberId}`);
}

export async function markMessageReadAction(deliveryId: string) {
  const memberId = await currentMemberId();
  if (!memberId) redirect("/m/login");

  await prisma.messageDelivery.updateMany({
    where: { id: deliveryId, recipientMemberId: memberId, readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath("/m/dashboard/messages");
}
