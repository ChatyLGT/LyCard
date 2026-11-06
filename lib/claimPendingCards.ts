import { prisma } from "@/lib/prisma";

// Las Cards que el importador de JSON dejó con `pendingOwnerEmail` pasan a ser
// de esa persona la primera vez que entra con Google usando ese email. También
// se la suma como miembro activo del Programa de cada Card.
export async function claimPendingCards(memberId: string, email: string): Promise<number> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return 0;
  const cards = await prisma.card.findMany({
    where: { memberId: null, pendingOwnerEmail: normalized },
    select: { id: true, programId: true },
  });
  for (const card of cards) {
    await prisma.card.update({ where: { id: card.id }, data: { memberId, pendingOwnerEmail: null } });
    if (card.programId) {
      await prisma.programMembership.upsert({
        where: { memberId_programId: { memberId, programId: card.programId } },
        update: {},
        create: { memberId, programId: card.programId, status: "active" },
      });
    }
  }
  return cards.length;
}
