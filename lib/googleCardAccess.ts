import { prisma } from "@/lib/prisma";
import { currentAdminScope } from "@/lib/auth";
import { currentMemberId } from "@/lib/memberAuth";

// Quién puede conectar o desconectar la cuenta de Google de una Card: el dueño
// de la Card (su Member), o un Admin (N0 o MasterN0). El token siempre queda
// ligado a card.memberId, nunca a quien inició el flujo.
// Pendiente (ver PLAN.md, "Fusión de identidades"): cuando cada persona sea un
// solo Member con roles por Programa, este criterio se reemplaza por ese modelo.
export async function canManageCardGoogle(cardId: string) {
  const card = await prisma.card.findUnique({ where: { id: cardId } });
  if (!card || !card.memberId) return null;

  const [adminScope, memberId] = await Promise.all([currentAdminScope(), currentMemberId()]);
  const isOwner = adminScope !== null || card.isOrigin || (memberId !== null && memberId === card.memberId);
  return isOwner ? { card, memberId: card.memberId } : null;
}
