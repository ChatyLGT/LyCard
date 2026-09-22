"use server";

import { prisma } from "@/lib/prisma";
import { currentAdminScope } from "@/lib/auth";
import { currentMemberId } from "@/lib/memberAuth";
import { normalizeLeadStage } from "@/lib/leads";

// Mismo chequeo de dueño que voiceNotes-actions.ts — cada archivo de
// actions de la Oficina lo repite a propósito (patrón ya establecido en
// el repo), no hay un helper compartido todavía.
async function assertOwner(cardId: string) {
  const [adminScope, memberId] = await Promise.all([currentAdminScope(), currentMemberId()]);
  const card = await prisma.card.findUnique({ where: { id: cardId } });
  if (!card) throw new Error("card");
  const isOwner = adminScope !== null || card.isOrigin || (memberId !== null && memberId === card.memberId);
  if (!isOwner) throw new Error("forbidden");
}

export async function listLeadsAction(cardId: string) {
  await assertOwner(cardId);
  const leads = await prisma.cardLead.findMany({
    where: { cardId },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  return leads.map((l) => ({
    id: l.id,
    name: l.name,
    contact: l.contact,
    source: l.source,
    stage: l.stage,
    notes: l.notes,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
  }));
}

// Alguien que el dueño conoció por fuera de la app (ej. intercambió
// tarjeta en persona) — la única forma de crear un CardLead a mano, el
// resto se llena solo desde app/c/actions.ts.
export async function createLeadManualAction(cardId: string, formData: FormData) {
  await assertOwner(cardId);

  const name = String(formData.get("name") || "").trim();
  const contact = String(formData.get("contact") || "").trim().toLowerCase();
  const notes = String(formData.get("notes") || "").trim();
  if (!contact) return { ok: false as const, error: "contact" };

  await prisma.cardLead.create({
    data: { cardId, name, contact, source: "manual", stage: "compartido", notes: notes || null },
  });

  return { ok: true as const };
}

export async function setLeadStageAction(cardId: string, leadId: string, stage: string) {
  await assertOwner(cardId);
  const lead = await prisma.cardLead.findFirst({ where: { id: leadId, cardId } });
  if (!lead) return { ok: false as const };

  await prisma.cardLead.update({ where: { id: leadId }, data: { stage: normalizeLeadStage(stage) } });
  return { ok: true as const };
}

export async function updateLeadNotesAction(cardId: string, leadId: string, notes: string) {
  await assertOwner(cardId);
  const lead = await prisma.cardLead.findFirst({ where: { id: leadId, cardId } });
  if (!lead) return { ok: false as const };

  await prisma.cardLead.update({ where: { id: leadId }, data: { notes: notes.trim() || null } });
  return { ok: true as const };
}
