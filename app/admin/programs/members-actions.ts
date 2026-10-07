"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentAdminScope, canAccessProgram, currentAdminId } from "@/lib/auth";
import { checkAndPromoteToPrograma } from "@/lib/programPromotion";
import { createMemberSession } from "@/lib/memberAuth";
import { activateMembershipAndSpawnCards } from "@/lib/activateMembership";

// MasterN0 can manage any Program's members; a scoped N0 only their own —
// and only members who actually belong to that Program (checked at the
// membership level below, not just trusted from the form).
async function requireProgramAccess(programId: string) {
  const scope = await currentAdminScope();
  if (!scope) redirect("/admin/login");
  if (!canAccessProgram(scope, programId)) redirect(`/admin/programs/${scope.programId}`);
  return scope;
}

async function requireMembership(memberId: string, programId: string) {
  const membership = await prisma.programMembership.findUnique({
    where: { memberId_programId: { memberId, programId } },
  });
  if (!membership) redirect(`/admin/programs/${programId}`);
  return membership;
}

// Agregar un Miembro directo desde el admin (2026-10-07, pedido de
// Gunnar: "no puedo poner un miembro" en un Programa nuevo) -- hasta
// ahora un Member solo nacía por el funnel self-service público
// (WhatsApp/Google, que además aterriza siempre en Legacy). Un N0 que
// recién crea su Programa (ej. HeroSuite) no tenía forma de sumar gente
// real sin pasar por ese funnel ajeno. Si el WhatsApp ya existe (Member
// de otro Programa), lo suma a este en vez de duplicarlo -- mismo
// criterio idempotente que el resto del alta (ver activateMembership.ts).
export async function addMemberToProgramAction(programId: string, formData: FormData) {
  await requireProgramAccess(programId);

  const name = String(formData.get("name") || "").trim();
  const whatsapp = String(formData.get("whatsapp") || "").trim() || null;
  const email = String(formData.get("email") || "").trim();
  if (!name) redirect(`/admin/programs/${programId}?memberError=addName`);

  const existingMember = whatsapp ? await prisma.member.findUnique({ where: { whatsapp } }) : null;
  const member = existingMember ?? (await prisma.member.create({ data: { name, whatsapp, email } }));

  const membership = await prisma.programMembership.upsert({
    where: { memberId_programId: { memberId: member.id, programId } },
    update: {},
    create: { memberId: member.id, programId, status: "invited" },
  });

  await activateMembershipAndSpawnCards(membership.id, { markInterviewed: false });

  revalidatePath(`/admin/programs/${programId}`);
  redirect(`/admin/programs/${programId}?memberAdded=1`);
}

export async function updateMemberAction(memberId: string, programId: string, formData: FormData) {
  await requireProgramAccess(programId);
  await requireMembership(memberId, programId);

  const name = String(formData.get("name") || "").trim();
  const whatsapp = String(formData.get("whatsapp") || "").trim();
  const email = String(formData.get("email") || "").trim();

  await prisma.member.update({
    where: { id: memberId },
    data: { name, whatsapp: whatsapp || null, email },
  });

  revalidatePath(`/admin/programs/${programId}`);
  redirect(`/admin/programs/${programId}?memberSaved=1`);
}

export async function deleteMemberAction(memberId: string, programId: string) {
  await requireProgramAccess(programId);
  await requireMembership(memberId, programId);

  const cardCount = await prisma.card.count({ where: { memberId } });
  // A member with live cards has public URLs already circulating — deleting
  // them would 404 those out from under whoever has the link. Only safe to
  // delete someone who's still "invited" (no cards yet).
  if (cardCount > 0) {
    redirect(`/admin/programs/${programId}?memberError=hasCards`);
  }

  await prisma.member.delete({ where: { id: memberId } });

  revalidatePath(`/admin/programs/${programId}`);
  redirect(`/admin/programs/${programId}?memberDeleted=1`);
}

export async function messageMemberAction(memberId: string, programId: string, formData: FormData) {
  await requireProgramAccess(programId);
  await requireMembership(memberId, programId);

  const subject = String(formData.get("subject") || "").trim();
  const message = String(formData.get("message") || "").trim();
  if (!subject || !message) redirect(`/admin/programs/${programId}?memberError=messageEmpty`);

  const member = await prisma.member.findUnique({ where: { id: memberId } });
  const apiKey = process.env.RESEND_API_KEY;
  if (!member?.email || !apiKey) {
    redirect(`/admin/programs/${programId}?memberError=messageNotConfigured`);
  }

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM || "LyCard <onboarding@resend.dev>",
    to: member.email,
    subject,
    html: `<div style="font-family:Georgia,serif;background:#0D0D0D;color:#F5F2EB;padding:32px;border-radius:16px;max-width:480px;margin:0 auto;"><p style="font-size:14px;line-height:1.7;color:#C2BEB5;white-space:pre-wrap;">${escapeHtml(message)}</p></div>`,
  });

  if (error) redirect(`/admin/programs/${programId}?memberError=messageFailed`);
  revalidatePath(`/admin/programs/${programId}`);
  redirect(`/admin/programs/${programId}?memberMessaged=1`);
}

// Marcado a mano por el admin -- no hay pasarela de pago real todavía
// (cáscara honesta: esto es un flag, no una confirmación de cobro).
// Solo tiene sentido sobre una membresía ya activa (Oficina Virtual
// creada); togglea entre pagado/no-pagado.
export async function markMembershipPaidAction(memberId: string, programId: string) {
  await requireProgramAccess(programId);
  const membership = await requireMembership(memberId, programId);

  if (membership.status !== "active") {
    redirect(`/admin/programs/${programId}?memberError=paidRequiresActive`);
  }

  const willBePaid = !membership.membershipPaidAt;
  await prisma.programMembership.update({
    where: { id: membership.id },
    data: { membershipPaidAt: willBePaid ? new Date() : null },
  });

  // Promoción Chido→Programa (2026-09-24) -- solo al pasar a pagado, nunca
  // al des-marcar. Des-marcar "pagado" por error no des-promueve: una vez
  // que existe un Programa con gente real adentro, no se desarma solo
  // porque alguien tocó un checkbox de vuelta -- fuera de alcance por
  // ahora, ver lib/programPromotion.ts.
  if (willBePaid) {
    await checkAndPromoteToPrograma(membership.id);
  }

  revalidatePath(`/admin/programs/${programId}`);
  redirect(`/admin/programs/${programId}?memberPaidToggled=1`);
}

// "Entrar como este Miembro" (2026-10-06, pedido de Gunnar: "necesito
// que todas las pantallas sean accesibles en el Dashboard" -- el hueco
// real era /m/dashboard y todo lo que cuelga de ahí: un Admin clásico
// (login por contraseña) nunca tiene sesión de Member propia, así que
// nunca veía esas pantallas ni por accidente. Mintea una sesión de
// Member real (lib/memberAuth.ts) y manda al N0 al mismo /m/dashboard
// que vería ese Miembro -- no es una vista de solo lectura, es entrar
// de verdad, mismo criterio que cualquier "ver como" de soporte.
//
// Guard extra (`currentAdminId()`, la cookie propia de Admin, no el
// scope ya resuelto que puede venir del puente Member→Admin): un N0
// promovido por Chido→Programa (Admin.memberId) nunca tuvo cookie de
// Admin propia, navega siempre con su propia cookie de Member -- si
// "entrara como" otro Miembro se pisaría su propia sesión y perdería
// su propio acceso de Admin hasta volver a loguearse. Ese caso ya
// tiene su /m/dashboard a un click (el suyo propio), no necesita este
// atajo -- así que directamente no se lo ofrecemos.
export async function viewAsMemberAction(memberId: string, programId: string) {
  const ownAdminId = await currentAdminId();
  if (!ownAdminId) redirect(`/admin/programs/${programId}?memberError=viewAsRequiresOwnLogin`);
  await requireProgramAccess(programId);
  await requireMembership(memberId, programId);

  await createMemberSession(memberId);
  redirect("/m/dashboard");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
