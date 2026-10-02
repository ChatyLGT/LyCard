"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { slugify, uniqueSlug } from "@/lib/slug";

// Tarjeta personalizada por destinatario (2026-10-02, PASO 1 del pedido
// de Gunnar: "tarjeta personalizada para Rogelio"). CRUD mínimo desde
// /admin/<slug> (EditorForm.tsx) -- mismo patrón de confianza en el
// gate de la página que ya usa updateCardAction en este mismo
// directorio (no repite el check de admin acá).
export async function createRecipientAction(cardSlug: string, formData: FormData) {
  const nombre = String(formData.get("nombre") || "").trim();
  if (!nombre) redirect(`/admin/${cardSlug}?recipientError=empty`);

  const card = await prisma.card.findUnique({ where: { slug: cardSlug } });
  if (!card) redirect("/admin");

  const base = slugify(nombre);
  const slug = await uniqueSlug(base, async (s) => {
    const existing = await prisma.cardRecipient.findUnique({ where: { cardId_slug: { cardId: card.id, slug: s } } });
    return existing !== null;
  });

  await prisma.cardRecipient.create({ data: { cardId: card.id, slug, nombre } });

  revalidatePath(`/admin/${cardSlug}`);
  redirect(`/admin/${cardSlug}?recipientCreated=1`);
}

export async function deleteRecipientAction(cardSlug: string, recipientId: string) {
  await prisma.cardRecipient.delete({ where: { id: recipientId } }).catch(() => {});
  revalidatePath(`/admin/${cardSlug}`);
  redirect(`/admin/${cardSlug}?recipientDeleted=1`);
}
