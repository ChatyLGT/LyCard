"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentAdminScope } from "@/lib/auth";
import { currentMemberId } from "@/lib/memberAuth";
import { CARD_SIZE_KEYS, parseCardSizeConfig, type CardSizeConfig } from "@/lib/cardSizeConfig";

// Tamaños ajustables por Card (2026-09-23) -- mismo chequeo de "sos el
// dueño" que ya usan voiceNotes-actions.ts/leads-actions.ts/tags-actions.ts.
async function assertOwner(cardId: string) {
  const [adminScope, memberId] = await Promise.all([currentAdminScope(), currentMemberId()]);
  const card = await prisma.card.findUnique({ where: { id: cardId } });
  if (!card) throw new Error("card");
  const isOwner = adminScope !== null || card.isOrigin || (memberId !== null && memberId === card.memberId);
  if (!isOwner) throw new Error("forbidden");
  return card;
}

export async function updateCardSizeConfigAction(cardId: string, config: CardSizeConfig) {
  const card = await assertOwner(cardId);

  // No confía en lo que mande el cliente a ciegas -- reparsea/clampea
  // igual que si viniera de la DB, mismo criterio que cualquier otro
  // campo Json editable del proyecto.
  const sanitized = parseCardSizeConfig(config);
  const data: Record<string, number> = {};
  for (const key of CARD_SIZE_KEYS) data[key] = sanitized[key];

  await prisma.card.update({ where: { id: card.id }, data: { sizeConfig: data } });

  revalidatePath(`/c/${card.slug}`);
  return { ok: true as const };
}
