"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCardHost } from "@/lib/cardHost";

// Contratar un Agente Silicio -- versión self-service del cliente
// (mismo criterio de auth que installWowAppAction en
// app/m/wowstore/actions.ts), a diferencia de installEspecialistaAction
// en app/admin/wowstore/actions-equipo.ts, que es la versión
// MasterN0-only por slug de la Fase 5. Sin pasarela de pago real
// todavía, mismo límite honesto de siempre.
export async function contratarSilicioAction(cardId: string, especialistaKey: string) {
  const card = await requireCardHost(cardId);
  const especialista = await prisma.especialista.findUnique({ where: { key: especialistaKey } });
  if (!especialista) redirect(`/m/wowhead?cardId=${cardId}`);

  await prisma.especialistaInstall.upsert({
    where: { cardId_especialistaId: { cardId, especialistaId: especialista.id } },
    update: {},
    create: { cardId, especialistaId: especialista.id },
  });

  revalidatePath(`/c/${card.slug}/oficina`);
  redirect(`/m/wowhead/silicio/${especialistaKey}?cardId=${cardId}&contratado=1`);
}
