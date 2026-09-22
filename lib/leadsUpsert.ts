import { prisma } from "@/lib/prisma";
import { bumpStage, type LeadStage, type LeadSource } from "@/lib/leads";

// Server-only a propósito (importa `lib/prisma`) — solo lo llaman
// server actions (app/c/actions.ts), nunca un Client Component. Ver el
// comentario en lib/leads.ts sobre por qué está separado de ahí.

/**
 * Registra actividad real de una Card con una persona — llamado desde los
 * 4 puntos reales de la app (invitación, QR, mensaje entrante, entrevista
 * agendada), nunca inventado. Busca por cualquiera de los contactos
 * dados (email y/o whatsapp) DENTRO de esa misma Card únicamente — nunca
 * cruza entre Cards, ni siquiera las 3 de un mismo dueño.
 */
export async function upsertLead(
  cardId: string,
  opts: { name?: string; contacts: string[]; source: LeadSource; proposedStage: LeadStage; registrationId?: string }
): Promise<void> {
  const contacts = opts.contacts.map((c) => c.trim().toLowerCase()).filter(Boolean);
  if (contacts.length === 0) return;

  const existing = await prisma.cardLead.findFirst({ where: { cardId, contact: { in: contacts } } });

  if (existing) {
    await prisma.cardLead.update({
      where: { id: existing.id },
      data: {
        stage: bumpStage(existing.stage, opts.proposedStage),
        name: existing.name || opts.name || "",
        registrationId: opts.registrationId ?? existing.registrationId,
      },
    });
    return;
  }

  await prisma.cardLead.create({
    data: {
      cardId,
      name: opts.name || "",
      contact: contacts[0],
      source: opts.source,
      stage: opts.proposedStage,
      registrationId: opts.registrationId ?? null,
    },
  });
}
