"use server";

import { prisma } from "@/lib/prisma";
import { createMemberSession } from "@/lib/memberAuth";
import { ensureLegacyMembershipAndCards } from "@/lib/legacyMembership";
import { registerInterviewAction } from "@/app/c/actions";
import { PROGRAM_DURATIONS } from "@/lib/legacyProgramDurations";

// PASO 6 (2026-10-02, pedido de Gunnar): el funnel de "Agendar una
// entrevista" para un destinatario con link personalizado -- calcado del
// funnel real de MayanCity (video → tus datos → elegí tu sesión →
// confirmación, ver captura que mandó Gunnar), pero con los datos
// quedando 100% en LyCard: nunca se conecta con la app de MayanCity ni
// se crea ninguna billetera blockchain. Reusa el alta Freemium
// self-service (lib/legacyMembership.ts, el mismo del login de /m) y
// `registerInterviewAction` -- la MISMA función que ya usa el slot-picker
// de siempre -- para la reserva del horario, capacidad incluida.
//
// "Sin código de acceso: el link personalizado ya identifica a la
// persona" (pedido textual) -- a diferencia del login real de /m (WhatsApp
// OTP, aunque hoy simulado), acá el Member se crea/encuentra directo por
// whatsapp, sin paso de código. Mismo find-or-create que usa
// verifyOtpAction (app/m/actions.ts), menos el código.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type LegacyFunnelResult =
  | { ok: true; cardSlug: string; interviewLabel: string }
  | { ok: false; error: "nombre" | "email" | "whatsapp" | "duracion" | "privacidad" | "slot" | "card" };

export async function startLegacyFunnelAction(input: {
  referrerCardSlug: string;
  nombre: string;
  email: string;
  whatsapp: string;
  programDuracion: string;
  aceptaPrivacidad: boolean;
  slotId: string;
}): Promise<LegacyFunnelResult> {
  const nombre = input.nombre.trim();
  const email = input.email.trim();
  const whatsapp = input.whatsapp.trim();

  if (!nombre) return { ok: false, error: "nombre" };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "email" };
  if (!whatsapp) return { ok: false, error: "whatsapp" };
  if (!PROGRAM_DURATIONS.some((d) => d.id === input.programDuracion)) return { ok: false, error: "duracion" };
  if (!input.aceptaPrivacidad) return { ok: false, error: "privacidad" };
  if (!input.slotId) return { ok: false, error: "slot" };

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

  // Sesión creada ANTES de llamar a registerInterviewAction a propósito:
  // esa función lee currentMemberId() de la cookie para linkear el
  // Registration a la membresía -- mismo mecanismo que usa el slot-picker
  // de siempre cuando quien agenda ya tiene sesión.
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
  if (!projectCard) return { ok: false, error: "card" };

  // El horario elegido en el paso 3 -- misma reserva real que usa el
  // slot-picker de siempre (resuelve slot real o legacy, capacidad
  // incluida, y ya se ocupa de su propio upsertLead), nada duplicado.
  const reg = await registerInterviewAction({ cardSlug: projectCard.slug, slotId: input.slotId, name: nombre, whatsapp, email });
  if (!reg.ok) return { ok: false, error: "slot" };

  return { ok: true, cardSlug: projectCard.slug, interviewLabel: reg.slotLabel };
}
