"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentEmployeeScope } from "@/lib/auth";
import { preguntaPorPaso } from "@/lib/bizToCardScript";

// BizToCard (2026-10-12) -- la Oreja responde EN VIVO junto al Miembro,
// un campo por vez, directo a la Card (ver nota de diseño en
// lib/bizToCardScript.ts sobre por qué esto no usa AssistantSession).
export async function guardarBizToCardAction(cardId: string, paso: number, formData: FormData) {
  const scope = await currentEmployeeScope();
  if (!scope) redirect("/empleados/login");

  // Guarda real: la Card tiene que ser "personal", de un Member cuya
  // membership sea del MISMO Programa que el de la Oreja -- nunca
  // confiar en el cardId de la URL solo porque llegó en el form.
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: {
      id: true,
      kind: true,
      member: { select: { memberships: { select: { programId: true } } } },
    },
  });
  const perteneceAlPrograma = card?.member?.memberships.some((m) => m.programId === scope.programId);
  if (!card || card.kind !== "personal" || !perteneceAlPrograma) {
    redirect("/empleados?memberError=bizToCardSinAcceso");
  }

  const pregunta = preguntaPorPaso(paso);
  if (!pregunta) redirect(`/empleados/biztocard/${cardId}`);

  const skip = formData.get("skip") === "1";
  if (!skip) {
    const valor = String(formData.get("respuesta") || "").trim();
    if (valor) {
      await prisma.card.update({ where: { id: cardId }, data: { [pregunta.campo]: valor } });
    }
  }

  redirect(`/empleados/biztocard/${cardId}?paso=${paso + 1}`);
}
