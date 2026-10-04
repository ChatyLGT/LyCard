"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentAdminScope, canAccessProgram } from "@/lib/auth";

export type CardTierField = "medal" | "rank" | "contacts" | "puestoId";

// Tap-to-select desde el modal de la tarjeta pública (2026-10-04, pedido
// de Gunnar: "le demos la oportunidad al N0 de seleccionar eso desde
// ahi" -- Puesto/O.D., Medallón de Resultados y Medallón de Imán). El
// mismo gate que puestos-actions.ts/EscalaEditor en el dashboard
// (currentAdminScope + canAccessProgram) -- la UI solo MUESTRA el
// selector si isAdmin, pero la autorización real vive acá, nunca
// confiada al cliente.
export async function setCardTierAction(cardId: string, field: CardTierField, value: string | null): Promise<{ ok: boolean }> {
  const scope = await currentAdminScope();
  if (!scope) return { ok: false };

  const card = await prisma.card.findUnique({ where: { id: cardId }, select: { programId: true, slug: true } });
  if (!card || !card.programId || !canAccessProgram(scope, card.programId)) return { ok: false };

  if (field === "puestoId") {
    // El único de los 4 que admite "ninguno" -- vuelve a los campos
    // propios siglas/tooltip/descripcion de la Card (ver displaySiglas
    // en LyCardView.tsx), igual que al borrar un Puesto desde el admin.
    if (value) {
      const puesto = await prisma.puesto.findUnique({ where: { id: value } });
      if (!puesto || puesto.programId !== card.programId) return { ok: false };
    }
    await prisma.card.update({ where: { id: cardId }, data: { puestoId: value } });
  } else {
    if (!value) return { ok: false };
    const scale = field === "medal" ? "medalScale" : field === "rank" ? "rankScale" : "contactsScale";
    const program = await prisma.program.findUnique({ where: { id: card.programId }, select: { [scale]: true } });
    const items = Array.isArray(program?.[scale]) ? (program[scale] as unknown[]) : [];
    const validKeys = items
      .filter((v): v is Record<string, unknown> => typeof v === "object" && v !== null)
      .map((v) => v.key);
    if (!validKeys.includes(value)) return { ok: false };
    await prisma.card.update({ where: { id: cardId }, data: { [field]: value } });
  }

  revalidatePath(`/c/${card.slug}`);
  return { ok: true };
}
