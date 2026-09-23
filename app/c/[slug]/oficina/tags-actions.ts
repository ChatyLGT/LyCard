"use server";

import { prisma } from "@/lib/prisma";
import { currentAdminScope } from "@/lib/auth";
import { currentMemberId } from "@/lib/memberAuth";
import { normalizeTagText, normalizeTagPolarity, type TagSummary } from "@/lib/tags";

// Mismo chequeo de dueño que leads-actions.ts/voiceNotes-actions.ts —
// cada archivo de actions de la Oficina lo repite a propósito (patrón ya
// establecido en el repo), no hay un helper compartido todavía.
async function assertOwner(cardId: string) {
  const [adminScope, memberId] = await Promise.all([currentAdminScope(), currentMemberId()]);
  const card = await prisma.card.findUnique({ where: { id: cardId } });
  if (!card) throw new Error("card");
  const isOwner = adminScope !== null || card.isOrigin || (memberId !== null && memberId === card.memberId);
  if (!isOwner) throw new Error("forbidden");
}

// A diferencia de Seguimiento/KPIs, los tags son a propósito PÚBLICOS —
// todo el punto de Janus ("todos contra todos") es que se puedan
// descubrir. listTagsAction no chequea dueño: la lee tanto el editor del
// dueño como la vista de un visitante.
export async function listTagsAction(cardId: string): Promise<TagSummary[]> {
  const tags = await prisma.tag.findMany({ where: { cardId }, orderBy: { createdAt: "desc" } });
  return tags.map((t) => ({
    id: t.id,
    text: t.text,
    polarity: normalizeTagPolarity(t.polarity),
    category: t.category,
    source: t.source,
  }));
}

export async function createTagAction(cardId: string, formData: FormData) {
  await assertOwner(cardId);

  const text = String(formData.get("text") || "").trim();
  if (!text) return { ok: false as const, error: "text" };
  const polarity = normalizeTagPolarity(formData.get("polarity"));
  const category = String(formData.get("category") || "").trim();

  await prisma.tag.create({
    data: { cardId, text, normalized: normalizeTagText(text), polarity, category, source: "manual" },
  });

  return { ok: true as const };
}

export async function deleteTagAction(cardId: string, tagId: string) {
  await assertOwner(cardId);
  const tag = await prisma.tag.findFirst({ where: { id: tagId, cardId } });
  if (!tag) return { ok: false as const };

  await prisma.tag.delete({ where: { id: tagId } });
  return { ok: true as const };
}
