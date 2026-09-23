import { prisma } from "@/lib/prisma";
import { activateMembershipAndSpawnCards } from "@/lib/activateMembership";

// Alta Freemium self-service (2026-09-23, pedido de Gunnar: "el registro
// Freemium no debería necesitar aprobación de nadie. Cualquier persona
// puede registrarse"). Todo Member que entra por WhatsApp OTP o Google
// termina acá, se haya registrado desde un link de referido o directo --
// une (o confirma) su lugar en el Programa Master "Legacy" y, en el mismo
// paso, le crea sus 3 Cards. `markInterviewed: false` es a propósito: esto
// es autoservicio, no una entrevista real, así que no debe contar para el
// Embudo (lib/funnel.ts). Idempotente por membershipId y por kind de Card
// -- llamarla de nuevo en cada login no duplica nada.
export async function ensureLegacyMembershipAndCards(
  memberId: string,
  referredByCardSlug: string | null
): Promise<string> {
  const program = await prisma.program.upsert({
    where: { slug: "legacy" },
    update: {},
    create: { slug: "legacy", name: "Legacy", primaryColor: "#C8A15A" },
  });

  let referredByMembershipId: string | null = null;
  if (referredByCardSlug) {
    const referrerCard = await prisma.card.findUnique({ where: { slug: referredByCardSlug } });
    if (referrerCard?.memberId) {
      const referrerMembership = await prisma.programMembership.findUnique({
        where: { memberId_programId: { memberId: referrerCard.memberId, programId: program.id } },
      });
      referredByMembershipId = referrerMembership?.id ?? null;
    }
  }

  const membership = await prisma.programMembership.upsert({
    where: { memberId_programId: { memberId, programId: program.id } },
    update: {},
    create: { memberId, programId: program.id, referredByMembershipId, status: "invited" },
  });

  await activateMembershipAndSpawnCards(membership.id, { markInterviewed: false });

  return membership.id;
}
