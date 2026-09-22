"use server";

import { prisma } from "@/lib/prisma";
import { currentAdminScope } from "@/lib/auth";
import { currentMemberId } from "@/lib/memberAuth";
import { saveUpload, deleteUpload } from "@/lib/storage";
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

// Trae el estado real de las notas desde la DB (2026-09-23, bug
// reportado por Gunnar: "cuando sales de la app, la nota de voz se
// borra"). No era un borrado real — VoiceNotesBlock vive detrás de un
// render condicional en OfficeSkillsBlock (`{active && <AppFace .../>}`)
// que lo DESMONTA por completo al cerrar el superpoder o abrir otro; al
// reabrir, React lo vuelve a montar desde cero con el prop `initialNotes`
// del primer render de la página — nunca vuelto a pedir — así que una
// nota grabada después de esa carga inicial desaparecía de la vista
// aunque siguiera perfectamente guardada en la DB. Este action se llama
// al montar el componente para que siempre muestre la verdad actual, sin
// importar cuántas veces se cierre y reabra el superpoder.
export async function listVoiceNotesAction(cardId: string) {
  await assertOwner(cardId);
  const notes = await prisma.voiceNote.findMany({
    where: { cardId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return notes.map((n) => ({
    id: n.id,
    status: n.status,
    audioUrl: n.audioUrl,
    transcript: n.transcript,
    summary: n.summary,
    errorDetail: n.errorDetail,
    createdAt: n.createdAt.toISOString(),
  }));
}

// Borrar una nota — pedido explícito de Gunnar (2026-09-23). Borra la
// fila y, best-effort, el audio subido (nunca bloquea el borrado real si
// el archivo ya no está o falla el storage).
export async function deleteVoiceNoteAction(cardId: string, noteId: string) {
  await assertOwner(cardId);
  const note = await prisma.voiceNote.findFirst({ where: { id: noteId, cardId } });
  if (!note) return { ok: false as const };
  await prisma.voiceNote.delete({ where: { id: noteId } });
  await deleteUpload(note.audioUrl);
  return { ok: true as const };
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
    } catch (err) {
      // Antes se tragaba el motivo real en silencio (2026-09-23, "dio
      // error en la transcripción" sin poder ver por qué) — ahora queda
      // en los logs de Vercel y guardado en la nota, visible para el
      // dueño en el popup de detalle.
      const detail = err instanceof Error ? err.message : String(err);
      console.error("Error arrancando el job de transcripción para la nota", note.id, detail);
      await prisma.voiceNote.update({ where: { id: note.id }, data: { status: "error", errorDetail: detail.slice(0, 500) } });
    }
  }

  return { ok: true as const, id: note.id, audioUrl: note.audioUrl };
}

// Polling desde el cliente mientras una nota sigue "processing" — nunca
// vía webhook todavía (eso queda para cuando haya más de una Skill que
// lo necesite; por ahora es un solo GET por nota cada pocos segundos).
export async function checkVoiceNoteStatusAction(noteId: string) {
  const note = await prisma.voiceNote.findUnique({ where: { id: noteId } });
  if (!note) return { status: "error" as const, transcript: null, summary: null, errorDetail: "not-found" };
  if (note.status !== "processing" || !note.providerJobId) {
    return { status: note.status as "processing" | "ready" | "error", transcript: note.transcript, summary: note.summary, errorDetail: note.errorDetail };
  }

  const result = await pollTranscriptionJob(note.providerJobId);
  if (result.status === "ready") {
    await prisma.voiceNote.update({
      where: { id: noteId },
      data: { status: "ready", transcript: result.transcript, summary: result.summary },
    });
    await orchestrateReadyNote(note.cardId, noteId, result.summary, result.transcript);
    return { status: "ready" as const, transcript: result.transcript, summary: result.summary, errorDetail: null };
  }
  if (result.status === "error") {
    console.error("AssemblyAI devolvió error para la nota", noteId, result.error);
    await prisma.voiceNote.update({ where: { id: noteId }, data: { status: "error", errorDetail: result.error.slice(0, 500) } });
    return { status: "error" as const, transcript: null, summary: null, errorDetail: result.error };
  }
  return { status: "processing" as const, transcript: null, summary: null, errorDetail: null };
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
