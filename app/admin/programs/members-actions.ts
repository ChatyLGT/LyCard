"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentAdminScope, canAccessProgram } from "@/lib/auth";

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

  await prisma.programMembership.update({
    where: { id: membership.id },
    data: { membershipPaidAt: membership.membershipPaidAt ? null : new Date() },
  });

  revalidatePath(`/admin/programs/${programId}`);
  redirect(`/admin/programs/${programId}?memberPaidToggled=1`);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
