"use server";

import { prisma } from "@/lib/prisma";
import { currentAdminScope } from "@/lib/auth";
import { currentMemberId } from "@/lib/memberAuth";
import { saveUpload } from "@/lib/storage";
import { transcriptionEnabled, startTranscriptionJob, pollTranscriptionJob } from "@/lib/transcription";
import { refreshGoogleAccessToken } from "@/lib/googleOAuth";
import { createCalendarEvent, createTask, ensureBridgeFolder, writeBridgeFile, buildDiracStampedMarkdown } from "@/lib/googleServices";
import { parseCalendarEvents, type CalendarEvent } from "@/lib/oficinaExtras";

// Solo el dueño de la Card puede grabar/ver sus propias notas — mismo
// chequeo de isHost que ya usa app/c/[slug]/oficina/page.tsx.
async function assertOwner(cardId: string) {
  const [adminScope, memberId] = await Promise.all([currentAdminScope(), currentMemberId()]);
  const card = await prisma.card.findUnique({ where: { id: cardId } });
  if (!card) throw new Error("card");
  const isOwner = adminScope !== null || card.isOrigin || (memberId !== null && memberId === card.memberId);
  if (!isOwner) throw new Error("forbidden");
}

export async function createVoiceNoteAction(cardId: string, formData: FormData) {
  await assertOwner(cardId);

  const file = formData.get("audio");
  if (!(file instanceof File) || file.size === 0) return { ok: false as const, error: "audio" };

  const audioUrl = await saveUpload(file, "voicenote", "audio");

  const note = await prisma.voiceNote.create({
    data: { cardId, audioUrl, status: "processing" },
  });

  if (transcriptionEnabled()) {
    try {
      const jobId = await startTranscriptionJob(audioUrl);
      await prisma.voiceNote.update({ where: { id: note.id }, data: { providerJobId: jobId } });
    } catch {
      await prisma.voiceNote.update({ where: { id: note.id }, data: { status: "error" } });
    }
  }

  return { ok: true as const, id: note.id };
}

// Polling desde el cliente mientras una nota sigue "processing" — nunca
// vía webhook todavía (eso queda para cuando haya más de una Skill que
// lo necesite; por ahora es un solo GET por nota cada pocos segundos).
export async function checkVoiceNoteStatusAction(noteId: string) {
  const note = await prisma.voiceNote.findUnique({ where: { id: noteId } });
  if (!note) return { status: "error" as const, error: "not-found" };
  if (note.status !== "processing" || !note.providerJobId) {
    return { status: note.status as "processing" | "ready" | "error", transcript: note.transcript, summary: note.summary };
  }

  const result = await pollTranscriptionJob(note.providerJobId);
  if (result.status === "ready") {
    await prisma.voiceNote.update({
      where: { id: noteId },
      data: { status: "ready", transcript: result.transcript, summary: result.summary },
    });
    await orchestrateReadyNote(note.cardId, noteId, result.summary, result.transcript);
    return { status: "ready" as const, transcript: result.transcript, summary: result.summary };
  }
  if (result.status === "error") {
    await prisma.voiceNote.update({ where: { id: noteId }, data: { status: "error" } });
    return { status: "error" as const, error: result.error };
  }
  return { status: "processing" as const, transcript: null, summary: null };
}

// Lo que pasa apenas una nota queda lista (Fase F, 2026-09-19): si el
// dueño de la Card ya conectó Google (Calendar+Tasks+Drive real), se crea
// una Tarea real, un evento en su Calendar y se aterriza el resumen
// estampado #Dirac en su carpeta Bridge. Si no conectó nada, cae al
// mismo lugar (Card.calendarEvents) pero marcado "voz-simulado" — nunca
// bloquea ni rompe el resultado ya mostrado al dueño si algo de esto
// falla, es una orquestación de fondo, no el camino crítico.
async function orchestrateReadyNote(cardId: string, noteId: string, summary: string | null, transcript: string | null) {
  const card = await prisma.card.findUnique({ where: { id: cardId } });
  if (!card) return;

  const title = summary ? `Revisar nota de voz: ${summary.slice(0, 60)}` : "Revisar una nota de voz nueva";
  const member = card.memberId ? await prisma.member.findUnique({ where: { id: card.memberId } }) : null;

  let entry: CalendarEvent;

  if (member?.googleRefreshToken) {
    try {
      const accessToken = await refreshGoogleAccessToken(member.googleRefreshToken);
      const notes = summary || transcript || "Nota de voz sin transcripción.";
      const [task, event] = await Promise.all([
        createTask(accessToken, { title, notes }),
        createCalendarEvent(accessToken, {
          title,
          description: notes,
          startISO: new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
        }),
      ]);
      const folderId = member.googleBridgeFolderId || (await ensureBridgeFolder(accessToken));
      if (!member.googleBridgeFolderId) {
        await prisma.member.update({ where: { id: member.id }, data: { googleBridgeFolderId: folderId } });
      }
      await writeBridgeFile(accessToken, folderId, {
        filename: `nota-de-voz-${noteId}.md`,
        content: buildDiracStampedMarkdown({
          title,
          origin: `LyCard · Notas de Voz · Card ${card.slug}`,
          body: `## Transcripción\n\n${transcript || "(sin transcripción)"}\n\n## Resumen\n\n${summary || "(sin resumen)"}`,
        }),
      });
      entry = { id: noteId, title, date: new Date(Date.now() + 24 * 60 * 60_000).toISOString(), source: "voz-real" };
      void task;
      void event;
    } catch (err) {
      console.error("Orquestación real de Google falló para la nota", noteId, err);
      entry = { id: noteId, title, date: new Date(Date.now() + 24 * 60 * 60_000).toISOString(), source: "voz-simulado" };
    }
  } else {
    entry = { id: noteId, title, date: new Date(Date.now() + 24 * 60 * 60_000).toISOString(), source: "voz-simulado" };
  }

  const current = parseCalendarEvents(card.calendarEvents);
  const updated = [entry, ...current.filter((e) => e.id !== noteId)];
  await prisma.card.update({ where: { id: cardId }, data: { calendarEvents: updated } });
}
