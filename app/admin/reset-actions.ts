"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentAdminScope, isMasterN0Scope } from "@/lib/auth";

const CONFIRM_PHRASE = "BORRAR TODO";

// MasterN0-only, one-shot reset of the whole platform back to a clean
// skeleton (2026-10-03, pedido de Gunnar: "necesito repasar la lógica
// precisa del negocio... quiero que esté todo en esqueleto"). Reescrito
// para cubrir el schema ACTUAL completo -- la versión original (2026-09)
// solo cubría lo que existía hasta Fase 6 y quedó corta contra todo lo
// sumado después (WowStore, Especialistas/Expertos, Destinatarios,
// Mensajería, Janus, Notas de Voz, WowAwe). A diferencia de la versión
// original, esta NO borra ni recrea la Card mastern0 -- Gunnar pidió
// explícitamente conservarla tal cual está (su propia identidad/branding
// no se toca), solo se le limpia el contenido colgado (destinatarios de
// prueba, tags, notas de voz, etc., igual que a cualquier otra Card).
// Su propio login de Admin (quien ejecuta esto) tampoco se toca.
//
// Orden de borrado: hojas primero, raíces al final -- varias relaciones
// clave (Card.member, Card.program, Experto.member, Admin.program,
// Admin.member) NO tienen onDelete:Cascade/SetNull en el schema (a
// propósito, para no perder historial por accidente en el uso normal de
// la app), así que acá hay que borrar en el orden correcto a mano: Card
// y Admin ANTES que Member/Program, Experto ANTES que Member. Todo lo
// demás cascada solo desde Card/Program/Member/Experto, confirmado
// contra prisma/schema.prisma antes de escribir esto.
export async function resetPlatformAction(formData: FormData) {
  const scope = await currentAdminScope();
  if (!scope) redirect("/admin/login");
  if (!isMasterN0Scope(scope)) redirect("/admin");

  const confirm = String(formData.get("confirm") || "").trim();
  if (confirm !== CONFIRM_PHRASE) {
    redirect("/admin/reset?error=confirm");
  }

  await prisma.$transaction(
    [
      // WowHead: Expertos/Especialistas y todo lo que cuelga de ellos
      prisma.consulta.deleteMany(),
      prisma.codiceEntry.deleteMany(),
      prisma.equipoInvitacion.deleteMany(),
      prisma.experto.deleteMany(),
      prisma.especialistaInstall.deleteMany(),
      prisma.especialista.deleteMany(),
      // WowStore
      prisma.wowAppInstall.deleteMany(),
      prisma.wowApp.deleteMany(),
      // Mensajería Interna
      prisma.messageDelivery.deleteMany(),
      prisma.message.deleteMany(),
      // Red de clientes de una Company + entrevistas agendadas
      prisma.cardNetworkMembership.deleteMany(),
      prisma.registration.deleteMany(),
      // Seguimiento + contenido por Card (Janus, Notas de Voz, WowAwe,
      // Destinatarios) -- sin filtro de cardId a propósito: a esta
      // altura solo pueden quedar filas de mastern0 (las de cualquier
      // otra Card ya cascadearon cuando se borre esa Card más abajo),
      // así que un deleteMany() sin where limpia mastern0 también.
      prisma.cardLead.deleteMany(),
      prisma.aweWalkEntry.deleteMany(),
      prisma.voiceNote.deleteMany(),
      prisma.tag.deleteMany(),
      prisma.cardRecipientSource.deleteMany(),
      prisma.cardRecipient.deleteMany(),
      // Programa: horarios, skins y escalera de Puestos
      prisma.interviewSlot.deleteMany(),
      prisma.programSkin.deleteMany(),
      prisma.puesto.deleteMany(),
      // Membresías
      prisma.originMemento.deleteMany(),
      prisma.programMembership.deleteMany(),
      // Cards -- todas menos la raíz (mastern0, isOrigin:true), que
      // queda intacta con su contenido propio (nombre/foto/redes/etc.)
      prisma.card.deleteMany({ where: { isOrigin: false } }),
      // N0 acotados -- tu propio login MasterN0 (quien ejecuta esto) no
      // se toca
      prisma.admin.deleteMany({ where: { id: { not: scope.id } } }),
      prisma.otpCode.deleteMany(),
      // Raíces
      prisma.member.deleteMany(),
      prisma.program.deleteMany(),
    ],
    { timeout: 60_000 }
  );

  revalidatePath("/admin");
  revalidatePath("/admin/programs");
  redirect("/admin/programs?reset=1");
}
