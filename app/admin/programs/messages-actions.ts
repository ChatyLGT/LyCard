"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentAdminScope, canAccessProgram } from "@/lib/auth";
import { parseChannels, resolveNonNetworkOutcome, type MessageChannel } from "@/lib/messaging";

async function requireProgramAccess(programId: string) {
  const scope = await currentAdminScope();
  if (!scope) redirect("/admin/login");
  if (!canAccessProgram(scope, programId)) redirect(`/admin/programs/${scope.programId}`);
  return scope;
}

// Mensaje masivo -- solo N0 (o MasterN0) llega hasta acá, ya lo filtró
// requireProgramAccess. El remitente queda como Member (si este N0 es
// uno promovido vía Fase P1, con Admin.memberId) o como Admin "clásico"
// (email/password, sin Member vinculado) -- ver PLAN.md, el wrinkle
// documentado ahí.
export async function sendMassMessageAction(programId: string, formData: FormData) {
  const scope = await requireProgramAccess(programId);

  const body = String(formData.get("body") || "").trim();
  if (!body) redirect(`/admin/programs/${programId}?messageError=empty`);

  const channels = parseChannels(formData.getAll("channels"));
  if (channels.length === 0) redirect(`/admin/programs/${programId}?messageError=noChannel`);

  const selectedIds = formData.getAll("recipientIds").map(String);
  const admin = await prisma.admin.findUnique({ where: { id: scope.id }, select: { memberId: true } });

  const memberships = await prisma.programMembership.findMany({
    where: {
      programId,
      status: "active",
      ...(selectedIds.length > 0 ? { memberId: { in: selectedIds } } : {}),
    },
    include: { member: true },
  });
  if (memberships.length === 0) redirect(`/admin/programs/${programId}?messageError=noRecipients`);

  const message = await prisma.message.create({
    data: {
      programId,
      scope: "masivo",
      body,
      senderMemberId: admin?.memberId ?? null,
      senderAdminId: admin?.memberId ? null : scope.id,
    },
  });

  await Promise.all(
    memberships.flatMap((m) =>
      channels.map((channel) => dispatchDelivery(message.id, m.member.id, channel, m.member.email))
    )
  );

  revalidatePath(`/admin/programs/${programId}`);
  redirect(`/admin/programs/${programId}?messageSent=1`);
}

async function dispatchDelivery(messageId: string, recipientMemberId: string, channel: MessageChannel, recipientEmail: string) {
  const nonNetwork = resolveNonNetworkOutcome(channel, recipientEmail);
  if (nonNetwork) {
    await prisma.messageDelivery.create({
      data: { messageId, recipientMemberId, channel, status: nonNetwork.status, errorDetail: nonNetwork.errorDetail },
    });
    return;
  }

  // Único caso que llega hasta acá: email con dirección cargada -- de
  // verdad necesita llamar a Resend.
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    await prisma.messageDelivery.create({
      data: { messageId, recipientMemberId, channel, status: "fallido", errorDetail: "RESEND_API_KEY no configurada." },
    });
    return;
  }

  try {
    const message = await prisma.message.findUnique({ where: { id: messageId }, include: { program: true } });
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM || "LyCard <onboarding@resend.dev>",
      to: recipientEmail,
      subject: `Mensaje de ${message?.program.name || "tu Programa"}`,
      html: `<div style="font-family:Georgia,serif;background:#0D0D0D;color:#F5F2EB;padding:32px;border-radius:16px;max-width:480px;margin:0 auto;"><p style="font-size:14px;line-height:1.7;color:#C2BEB5;white-space:pre-wrap;">${(message?.body || "").replace(/</g, "&lt;")}</p></div>`,
    });
    await prisma.messageDelivery.create({
      data: { messageId, recipientMemberId, channel, status: error ? "fallido" : "enviado", errorDetail: error ? String(error.message || error) : undefined },
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    await prisma.messageDelivery.create({ data: { messageId, recipientMemberId, channel, status: "fallido", errorDetail: detail.slice(0, 500) } });
  }
}
