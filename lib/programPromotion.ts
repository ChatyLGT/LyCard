import { prisma } from "@/lib/prisma";
import { slugify, uniqueSlug } from "@/lib/slug";

const programSlugTaken = (slug: string) =>
  prisma.program.findUnique({ where: { slug }, select: { id: true } }).then(Boolean);

// Regla dura (2026-09-29, pedido explícito de Gunnar, ver
// docs/02-ARQUITECTURA.md "Regla dura: quién puede volverse Admin/N0"):
// una promoción automática NUNCA puede dejar `Admin.programId` en null --
// eso convertiría a alguien en MasterN0 sin que Gunnar lo haya dado de
// alta a mano. `programId` es `string`, no `string | null`, a propósito:
// el compilador ya rechaza cualquier intento de pasarle `null` acá, y
// lib/__tests__/programPromotion.test.ts lo deja explícito también.
export function buildPromotedAdminData(memberId: string, programId: string): { memberId: string; programId: string } {
  return { memberId, programId };
}

// Promoción automática Chido→Programa (2026-09-24, ver PLAN.md "Modelo de
// monetización cerrado"). Un Chido (Member con `membershipPaidAt` seteado
// en alguna ProgramMembership) se convierte en N0 de su propio Programa en
// el instante exacto en que tiene 1+ humano real activo bajo él -- no
// importa cuántos agentes IA tenga, eso es indiferente. Nada de esto pasa
// por una aprobación aparte de MasterN0: es un efecto derivado del gate que
// YA existe (activar una membresía referida, o marcarla pagada), no un
// gate nuevo.
//
// Se llama desde 2 puntos, cada uno cubriendo el orden en que las 2
// condiciones (pagó / tiene referido activo) pueden cumplirse primero:
//   1. lib/activateMembership.ts, tras activar una membresía referida --
//      candidateMembershipId = la del REFERENTE (puede que ya sea Chido).
//   2. app/admin/programs/members-actions.ts#markMembershipPaidAction, tras
//      marcar pagada una membresía -- candidateMembershipId = la propia
//      (puede que ya tenga referidos activos de antes).
// Idempotente: una vez promovido (existe un Admin.memberId para ese
// Member), no vuelve a crear nada.
export async function checkAndPromoteToPrograma(candidateMembershipId: string): Promise<void> {
  const candidate = await prisma.programMembership.findUnique({
    where: { id: candidateMembershipId },
    include: { member: { include: { cards: true } } },
  });
  if (!candidate || !candidate.membershipPaidAt) return; // no es Chido todavía

  const alreadyPromoted = await prisma.admin.findUnique({
    where: { memberId: candidate.memberId },
    select: { id: true },
  });
  if (alreadyPromoted) return; // ya cruzó el umbral antes -- no-op idempotente

  const activeReferrals = await prisma.programMembership.count({
    where: { referredByMembershipId: candidate.id, status: "active" },
  });
  if (activeReferrals < 1) return; // todavía sin humanos reales bajo él

  const companyCard = candidate.member.cards.find((c) => c.kind === "company");
  if (!companyCard) return; // no debería pasar (activateMembershipAndSpawnCards siempre crea las 3), defensivo

  await promoteToPrograma(candidate.id, candidate.memberId, candidate.programId, companyCard.id, companyCard.name || companyCard.slug);
}

async function promoteToPrograma(
  candidateMembershipId: string,
  candidateMemberId: string,
  originProgramId: string,
  companyCardId: string,
  companyName: string
) {
  const baseSlug = await uniqueSlug(slugify(companyName), programSlugTaken);
  // Linaje (2026-10-05): el Programa nuevo siempre nace ligado al Programa
  // del que salió la membresía promovida (hoy, casi siempre Legacy) --
  // resuelve el caso Juancho/Digital Kingdom, donde el Programa nuevo
  // quedaba suelto sin ningún rastro de dónde vino.
  const newProgram = await prisma.program.create({
    data: { slug: baseSlug, name: companyName, originProgramId },
  });

  // Todos los humanos que este Chido ya reclutó y activó -- no solo el que
  // disparó este chequeo puntual. Si estuvo recultando gente antes de
  // pagar, todos migran juntos en el mismo momento de la promoción.
  const referredActive = await prisma.programMembership.findMany({
    where: { referredByMembershipId: candidateMembershipId, status: "active" },
    include: { member: { include: { cards: true } } },
  });

  await prisma.$transaction([
    prisma.card.update({ where: { id: companyCardId }, data: { programId: newProgram.id } }),
    prisma.admin.create({ data: buildPromotedAdminData(candidateMemberId, newProgram.id) }),
    ...referredActive.flatMap((membership) => {
      const projectCard = membership.member.cards.find((c) => c.kind === "project");
      return [
        prisma.programMembership.update({ where: { id: membership.id }, data: { programId: newProgram.id } }),
        ...(projectCard
          ? [prisma.card.update({ where: { id: projectCard.id }, data: { programId: newProgram.id } })]
          : []),
      ];
    }),
  ]);
}

// Para la UI (dashboard del Member, botón self-service "Convertir en
// Programa", 2026-10-05 pedido de Gunnar tras el caso Juancho/Digital
// Kingdom -- ver PLAN.md). El gate sigue siendo EXACTAMENTE el mismo que
// usa checkAndPromoteToPrograma (pagó + 1+ referido activo): esto no lo
// relaja, solo lo hace visible y autoservible -- si ya se cumple, el botón
// dispara la promoción ahí mismo; si no, la pantalla dice honestamente qué
// falta en vez de fingir un botón que no hace nada.
export type PromotionStatus = {
  membershipId: string;
  paid: boolean;
  activeReferrals: number;
  eligible: boolean;
};

export async function getPromotionStatus(memberId: string): Promise<PromotionStatus | null> {
  const legacyProgram = await prisma.program.findUnique({ where: { slug: "legacy" } });
  if (!legacyProgram) return null;

  const membership = await prisma.programMembership.findUnique({
    where: { memberId_programId: { memberId, programId: legacyProgram.id } },
  });
  if (!membership) return null;

  const activeReferrals = await prisma.programMembership.count({
    where: { referredByMembershipId: membership.id, status: "active" },
  });
  const paid = Boolean(membership.membershipPaidAt);

  return { membershipId: membership.id, paid, activeReferrals, eligible: paid && activeReferrals >= 1 };
}

// Para la UI (dashboard del Member, "Programa Legado"): ¿este Member fue
// promovido? Devuelve el Programa nuevo si sí, null si no -- una sola
// consulta indexada (Admin.memberId es único), barato de llamar en
// cualquier pantalla que necesite saberlo.
export async function findPromotedProgram(memberId: string) {
  const admin = await prisma.admin.findUnique({
    where: { memberId },
    select: { programId: true },
  });
  if (!admin?.programId) return null;
  return prisma.program.findUnique({ where: { id: admin.programId } });
}
