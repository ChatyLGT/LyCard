import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentAdminScope } from "@/lib/auth";
import { currentMemberId } from "@/lib/memberAuth";
import type { Card } from "@/generated/prisma/client";

// Mismo criterio de "isHost" que ya usa la Oficina Virtual
// (app/c/[slug]/oficina/page.tsx#OficinaPage): un Admin (cualquier N0 o
// MasterN0 -- criterio amplio ya establecido ahí, no se restringe acá)
// o el Member dueño de la Card. Evita repetir el bug ya documentado una
// vez (2026-09-19, "Editar Oficina") -- una pantalla que exige
// currentMemberId() a secas manda a un Admin-only session a /m/login
// aunque ya esté logueado. Reportado de nuevo 2026-09-24 en WowStore:
// mismo bug, lugar nuevo -- por eso ahora vive en un helper compartido
// en vez de repetir la lógica pantalla por pantalla.
export async function requireCardHost(cardId: string): Promise<Card> {
  const card = await prisma.card.findUnique({ where: { id: cardId } });
  if (!card) redirect("/m/dashboard");

  const [adminScope, memberId] = await Promise.all([currentAdminScope(), currentMemberId()]);
  const isHost = adminScope !== null || card.isOrigin || (memberId !== null && memberId === card.memberId);
  if (!isHost) redirect("/m/login");

  return card;
}
