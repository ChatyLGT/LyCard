"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { currentMemberId } from "@/lib/memberAuth";
import { canPublishExperto, matchCodiceEntry, shouldRequireRegistration, EXPERTO_VISITOR_COOKIE } from "@/lib/expertos";

async function getOrSetVisitorToken(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(EXPERTO_VISITOR_COOKIE)?.value;
  if (existing) return existing;
  const token = randomUUID();
  jar.set(EXPERTO_VISITOR_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  return token;
}

// Regla dura 5 (Fase 4): el Códice nunca sale entero -- esta acción solo
// le da al visitante una respuesta ya aprobada (matchCodiceEntry filtra
// por aprobadaAt) o, sin match, la pregunta queda pendiente en el inbox
// del propio Experto (Consulta.respuesta null).
export async function askExpertoAction(expertoKey: string, formData: FormData) {
  const pregunta = String(formData.get("pregunta") || "").trim();
  if (!pregunta) redirect(`/experto/${expertoKey}?error=empty`);

  const experto = await prisma.experto.findUnique({ where: { key: expertoKey }, include: { codice: true } });
  if (!experto) redirect("/experto");
  // Regla dura 1-2: sin consentimiento vigente + Bautizo, no responde
  // consultas nuevas, aunque el visitante llegue directo a la URL.
  if (!canPublishExperto(experto)) redirect(`/experto/${expertoKey}?error=notPublished`);

  const memberId = await currentMemberId();
  const respuesta = matchCodiceEntry(pregunta, experto.codice);

  if (memberId) {
    await prisma.consulta.create({ data: { expertoId: experto.id, memberId, pregunta, respuesta } });
  } else {
    const visitorToken = await getOrSetVisitorToken();
    const freeCount = await prisma.consulta.count({ where: { expertoId: experto.id, visitorToken } });
    if (shouldRequireRegistration(freeCount)) {
      redirect(`/experto/${expertoKey}?error=needsRegistration`);
    }
    await prisma.consulta.create({ data: { expertoId: experto.id, visitorToken, pregunta, respuesta } });
  }

  revalidatePath(`/experto/${expertoKey}`);
  redirect(`/experto/${expertoKey}?asked=1`);
}
