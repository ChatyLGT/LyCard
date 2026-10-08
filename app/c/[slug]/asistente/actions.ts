"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { currentAdminScope, isMasterN0Scope } from "@/lib/auth";
import { findPregunta, type PistaId } from "@/lib/assistantScript";

export type VolverDestino = "siguiente" | "indice" | "abiertas";

// Paso 2 -- guarda UNA respuesta de S2 en el borrador (AssistantAnswer),
// nunca en la configuración publicada (Program/Card/modales) -- eso es
// S4, todavía no existe. "Todavía no sé" (permiteNoSe, siempre true en
// esta fase) guarda con estado "abierto", el mismo nombre que ya usa
// el guion para "Decisión abierta" (ver lib/assistantScript.ts).
//
// Paso 3 -- `volver` dice adónde ir después de guardar: "siguiente"
// (el flujo de avance normal de S2, vuelve a la pista para mostrar la
// próxima sin responder) o "indice"/"abiertas" cuando la pregunta se
// abrió para EDITAR una respuesta ya guardada desde S1 o S5 -- ahí
// vuelve a donde el usuario vino, no sigue avanzando por la pista.
export async function responderPreguntaAction(
  sessionId: string,
  slug: string,
  pistaId: PistaId,
  preguntaId: string,
  volver: VolverDestino,
  formData: FormData
) {
  const scope = await currentAdminScope();
  if (!scope || !isMasterN0Scope(scope)) redirect(`/c/${slug}`);

  // La sesión tiene que ser la de ESTE Admin -- el sessionId viaja en
  // un campo oculto del form, nunca hay que confiar en eso sin
  // verificar dueño (mismo criterio que requireProgramAccess en el
  // resto de la app).
  const session = await prisma.assistantSession.findUnique({ where: { id: sessionId } });
  if (!session || session.adminId !== scope.id) redirect(`/c/${slug}`);

  const volverUrl =
    volver === "indice"
      ? `/c/${slug}/asistente/indice`
      : volver === "abiertas"
        ? `/c/${slug}/asistente/decisiones-abiertas`
        : `/c/${slug}/asistente/pista/${pistaId}`;

  const pregunta = findPregunta(preguntaId);
  if (!pregunta) redirect(volverUrl);

  const porqueRaw = String(formData.get("porque") ?? "").trim();
  const porque = porqueRaw === "" ? null : porqueRaw;

  if (String(formData.get("accion")) === "no_se") {
    await prisma.assistantAnswer.upsert({
      where: { sessionId_preguntaId: { sessionId, preguntaId } },
      create: { sessionId, preguntaId, valor: Prisma.JsonNull, porque, estado: "abierto" },
      update: { valor: Prisma.JsonNull, porque, estado: "abierto" },
    });
  } else {
    const opcionId = String(formData.get("opcion") ?? "");
    const opcionValida = pregunta.opciones.some((o) => o.id === opcionId);
    // Nada seleccionado o un id que no existe en esta pregunta -- no
    // guarda nada a medias, vuelve a donde estaba.
    if (!opcionValida) redirect(volverUrl);

    await prisma.assistantAnswer.upsert({
      where: { sessionId_preguntaId: { sessionId, preguntaId } },
      create: { sessionId, preguntaId, valor: { opcionId }, porque, estado: "propuesto" },
      update: { valor: { opcionId }, porque, estado: "propuesto" },
    });
  }

  revalidatePath(`/c/${slug}/asistente`);
  revalidatePath(`/c/${slug}/asistente/indice`);
  revalidatePath(`/c/${slug}/asistente/decisiones-abiertas`);
  revalidatePath(`/c/${slug}/asistente/pista/${pistaId}`);
  redirect(volverUrl);
}
