"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { unlockRecipientSession } from "@/lib/recipientAuth";

// Confirma la palabra secreta del gate de tarjeta completa (ver
// lib/recipientAuth.ts) y redirige de vuelta al mismo link `?para=` --
// la propia página (app/c/[slug]/page.tsx) vuelve a chequear la cookie
// recién puesta antes de renderizar. Archivo separado de
// recipient-actions.ts (el CRUD de destinatarios del dashboard) a
// propósito, para no mezclar el gate público con esas acciones internas.
export async function unlockRecipientAction(cardSlug: string, recipientSlug: string, formData: FormData) {
  const palabra = String(formData.get("palabraSecreta") || "").trim();
  const backTo = `/c/${cardSlug}?para=${encodeURIComponent(recipientSlug)}`;

  if (!palabra) redirect(`${backTo}&gateError=empty`);

  const card = await prisma.card.findUnique({ where: { slug: cardSlug }, select: { id: true } });
  if (!card) redirect(backTo);

  const recipient = await prisma.cardRecipient.findUnique({
    where: { cardId_slug: { cardId: card.id, slug: recipientSlug } },
  });
  if (!recipient) redirect(backTo);

  if (recipient.palabraSecreta && recipient.palabraSecreta === palabra) {
    await unlockRecipientSession(recipient.id);
    redirect(backTo);
  }

  redirect(`${backTo}&gateError=wrong`);
}
