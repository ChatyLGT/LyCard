"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { canManageCardGoogle } from "@/lib/googleCardAccess";
import { revokeGoogleToken } from "@/lib/googleOAuth";

// Desconectar = revocar el permiso en Google y borrar lo guardado en LyCard.
// La revocación es best-effort: si Google no responde, igual se borra el token
// local, así la persona nunca queda con una conexión "fantasma" en LyCard.
export async function disconnectGoogleAction(cardId: string) {
  const access = await canManageCardGoogle(cardId);
  if (!access) redirect(`/m/google/conectar?cardId=${cardId}&error=forbidden`);

  const member = await prisma.member.findUnique({ where: { id: access.memberId } });
  if (member?.googleRefreshToken) {
    await revokeGoogleToken(member.googleRefreshToken).catch(() => {});
  }

  await prisma.member.update({
    where: { id: access.memberId },
    data: { googleRefreshToken: null, googleScopes: null, googleConnectedAt: null, googleBridgeFolderId: null },
  });

  revalidatePath(`/m/google/conectar`);
  redirect(`/m/google/conectar?cardId=${cardId}&disconnected=1`);
}
