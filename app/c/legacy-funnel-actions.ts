"use server";

import { prisma } from "@/lib/prisma";
import { createMemberSession } from "@/lib/memberAuth";
import { ensureLegacyMembershipAndCards } from "@/lib/legacyMembership";
import { generateLegacySlots } from "@/lib/interviewSlots";
import { upsertLead } from "@/lib/leadsUpsert";
import { PROGRAM_DURATIONS } from "@/lib/legacyProgramDurations";

// PASO 6 (2026-10-02, pedido de Gunnar): el funnel de "Agendar una
// entrevista" para un destinatario con link personalizado. Reusa el alta
// Freemium self-service (lib/legacyMembership.ts, ya construido para el
// login de /m) y el sistema de entrevistas que ya existe (Registration +
// lib/interviewSlots.ts) -- no se arma nada de cero, no hay MayanCity ni
// billeteras blockchain acá, pedido explícito de Gunnar.
//
// "Sin código de acceso: el link personalizado ya identifica a la
// persona" (pedido textual) -- a diferencia del login real de /m (WhatsApp
// OTP, aunque hoy simulado), acá el Member se crea/encuentra directo por
// whatsapp, sin paso de código. Mismo find-or-create que usa
// verifyOtpAction (app/m/actions.ts), menos el código.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type LegacyFunnelResult =
  | { ok: true; cardSlug: string; interviewLabel: string }
  | { ok: false; error: "nombre" | "email" | "whatsapp" | "duracion" | "privacidad" | "card" };

export async function startLegacyFunnelAction(input: {
  referrerCardSlug: string;
  nombre: string;
  email: string;
  whatsapp: string;
  programDuracion: string;
  aceptaPrivacidad: boolean;
}): Promise<LegacyFunnelResult> {
  const nombre = input.nombre.trim();
  const email = input.email.trim();
  const whatsapp = input.whatsapp.trim();

  if (!nombre) return { ok: false, error: "nombre" };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "email" };
  if (!whatsapp) return { ok: false, error: "whatsapp" };
  if (!PROGRAM_DURATIONS.some((d) => d.id === input.programDuracion)) return { ok: false, error: "duracion" };
  if (!input.aceptaPrivacidad) return { ok: false, error: "privacidad" };

  const referrerCard = await prisma.card.findUnique({ where: { slug: input.referrerCardSlug } });
  if (!referrerCard) return { ok: false, error: "card" };

  let member = await prisma.member.findUnique({ where: { whatsapp } });
  if (!member) {
    member = await prisma.member.create({ data: { whatsapp, name: nombre, email } });
  } else {
    member = await prisma.member.update({
      where: { id: member.id },
      data: { name: member.name || nombre, email: member.email || email },
    });
  }

  await createMemberSession(member.id);
  await ensureLegacyMembershipAndCards(member.id, referrerCard.slug);

  const legacyProgram = await prisma.program.findUnique({ where: { slug: "legacy" } });
  const membership = legacyProgram
    ? await prisma.programMembership.findUnique({
        where: { memberId_programId: { memberId: member.id, programId: legacyProgram.id } },
      })
    : null;

  if (membership) {
    await prisma.programMembership.update({
      where: { id: membership.id },
      data: { programDuracion: input.programDuracion },
    });
  }

  // Su tarjeta oficial de proyecto, recién creada (o ya existente si este
  // whatsapp ya había pasado por acá o por /m/login antes -- idempotente).
  const projectCard = await prisma.card.findFirst({
    where: { memberId: member.id, kind: "project" },
    orderBy: { createdAt: "asc" },
  });

  // Entrevista inicial -- próximo turno disponible, auto-asignado (el
  // pedido de PASO 6 no incluye un paso de elegir horario a mano).
  const nextSlot = generateLegacySlots()[0];
  const interviewLabel = `${nextSlot.label} — ${nextSlot.time}`;

  if (projectCard) {
    const existing = await prisma.registration.findFirst({ where: { cardId: projectCard.id, whatsapp } });
    const registration = existing
      ? await prisma.registration.update({
          where: { id: existing.id },
          data: { slotId: nextSlot.id, slotLabel: interviewLabel, name: nombre, email, membershipId: membership?.id ?? null },
        })
      : await prisma.registration.create({
          data: {
            cardId: projectCard.id,
            slotId: nextSlot.id,
            slotLabel: interviewLabel,
            name: nombre,
            whatsapp,
            email,
            membershipId: membership?.id ?? null,
          },
        });

    await upsertLead(projectCard.id, {
      name: nombre,
      contacts: [whatsapp, email],
      source: "entrevista",
      proposedStage: "en_seguimiento",
      registrationId: registration.id,
    });
  }

  return { ok: true, cardSlug: projectCard?.slug ?? "", interviewLabel };
}
