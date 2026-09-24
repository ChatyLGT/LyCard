"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentAdminScope } from "@/lib/auth";
import { currentMemberId } from "@/lib/memberAuth";
import { saveUpload } from "@/lib/storage";
import { generateSimulatedAweIndex } from "@/lib/aweWalk";
import { createVoiceNoteAction } from "./voiceNotes-actions";

// Mismo chequeo de dueño que voiceNotes-actions.ts -- solo el dueño de
// la Card graba/ve sus propias caminatas de asombro.
async function assertOwner(cardId: string) {
  const [adminScope, memberId] = await Promise.all([currentAdminScope(), currentMemberId()]);
  const card = await prisma.card.findUnique({ where: { id: cardId } });
  if (!card) throw new Error("card");
  const isOwner = adminScope !== null || card.isOrigin || (memberId !== null && memberId === card.memberId);
  if (!isOwner) throw new Error("forbidden");
}

export async function listAweWalkEntriesAction(cardId: string) {
  await assertOwner(cardId);
  const entries = await prisma.aweWalkEntry.findMany({
    where: { cardId },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { voiceNote: true },
  });
  return entries.map((e) => ({
    id: e.id,
    photoStartUrl: e.photoStartUrl,
    photoMidUrl: e.photoMidUrl,
    photoEndUrl: e.photoEndUrl,
    aweIndex: e.aweIndex,
    createdAt: e.createdAt.toISOString(),
    voiceNote: e.voiceNote
      ? { status: e.voiceNote.status, transcript: e.voiceNote.transcript, summary: e.voiceNote.summary }
      : null,
  }));
}

// Guarda una caminata: 3 selfies obligatorias + nota de voz opcional. La
// nota de voz reusa el pipeline REAL de siempre (createVoiceNoteAction,
// mismo que Notas de Voz y el cierre de Modo Foco); el Índice de Asombro
// es SIMULADO -- generateSimulatedAweIndex() nunca mira las fotos ni el
// audio de verdad, ver lib/aweWalk.ts.
export async function createAweWalkEntryAction(cardId: string, formData: FormData) {
  await assertOwner(cardId);

  const start = formData.get("photoStart");
  const mid = formData.get("photoMid");
  const end = formData.get("photoEnd");
  if (!(start instanceof File) || start.size === 0) return { ok: false as const, error: "photoStart" };
  if (!(mid instanceof File) || mid.size === 0) return { ok: false as const, error: "photoMid" };
  if (!(end instanceof File) || end.size === 0) return { ok: false as const, error: "photoEnd" };

  const [photoStartUrl, photoMidUrl, photoEndUrl] = await Promise.all([
    saveUpload(start, "awe-start"),
    saveUpload(mid, "awe-mid"),
    saveUpload(end, "awe-end"),
  ]);

  let voiceNoteId: string | undefined;
  const audio = formData.get("audio");
  if (audio instanceof File && audio.size > 0) {
    const voiceForm = new FormData();
    voiceForm.set("audio", audio);
    const result = await createVoiceNoteAction(cardId, voiceForm);
    if (result.ok) voiceNoteId = result.id;
  }

  await prisma.aweWalkEntry.create({
    data: {
      cardId,
      photoStartUrl,
      photoMidUrl,
      photoEndUrl,
      voiceNoteId,
      aweIndex: generateSimulatedAweIndex(),
    },
  });

  revalidatePath("/c/[slug]/oficina", "page");
  return { ok: true as const };
}
