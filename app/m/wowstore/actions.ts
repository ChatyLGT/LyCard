"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentMemberId } from "@/lib/memberAuth";

async function requireOwnCard(cardId: string) {
  const memberId = await currentMemberId();
  if (!memberId) redirect("/m/login");
  const card = await prisma.card.findUnique({ where: { id: cardId } });
  if (!card || card.memberId !== memberId) redirect("/m/dashboard");
  return card;
}

async function requireWowApp(wowAppKey: string) {
  const wowApp = await prisma.wowApp.findUnique({ where: { key: wowAppKey } });
  if (!wowApp) redirect("/m/wowstore");
  return wowApp;
}

// Instalación base -- mismo criterio honesto que markMembershipPaidAction:
// no hay pasarela de pago real todavía, esto solo registra la instalación.
export async function installWowAppAction(cardId: string, wowAppKey: string) {
  await requireOwnCard(cardId);
  const wowApp = await requireWowApp(wowAppKey);

  await prisma.wowAppInstall.upsert({
    where: { cardId_wowAppId: { cardId, wowAppId: wowApp.id } },
    update: {},
    create: { cardId, wowAppId: wowApp.id },
  });

  revalidatePath(`/m/wowstore/${wowAppKey}`);
  redirect(`/m/wowstore/${wowAppKey}?cardId=${cardId}&installed=1`);
}

// "Adaptación a mi medida" -- el pedido en sí no tiene backend
// automatizado (cáscara honesta, igual que el resto del proyecto): queda
// guardado en WowAppInstall.adaptationStatus/-Notes y se avisa por email
// al equipo (Sergio/Fabricio) si hay credenciales de Resend configuradas.
// Sin ellas, el pedido igual queda registrado -- nunca se pierde por
// falta de mail.
export async function requestAdaptationAction(cardId: string, wowAppKey: string, formData: FormData) {
  const card = await requireOwnCard(cardId);
  const wowApp = await requireWowApp(wowAppKey);

  const notes = String(formData.get("notes") || "").trim();
  if (!notes) redirect(`/m/wowstore/${wowAppKey}?cardId=${cardId}&adaptationError=required`);

  await prisma.wowAppInstall.upsert({
    where: { cardId_wowAppId: { cardId, wowAppId: wowApp.id } },
    update: { adaptationStatus: "pendiente", adaptationNotes: notes },
    create: { cardId, wowAppId: wowApp.id, adaptationStatus: "pendiente", adaptationNotes: notes },
  });

  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.WOWSTORE_ADAPTATION_TO;
  if (!apiKey || !toEmail) {
    console.error(
      `requestAdaptationAction: not configured (RESEND_API_KEY o WOWSTORE_ADAPTATION_TO faltantes) -- pedido de "${wowApp.nombre}" de la Card ${card.slug} quedó guardado en DB pero sin notificar por mail.`
    );
  } else {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: process.env.RESEND_FROM || "WowStore <onboarding@resend.dev>",
      to: toEmail,
      subject: `Pedido de adaptación VIP: ${wowApp.nombre} (${card.slug})`,
      html: `<div style="font-family:Georgia,serif;background:#0D0D0D;color:#F5F2EB;padding:32px;border-radius:16px;max-width:480px;margin:0 auto;">
        <p style="font-size:14px;color:#C2BEB5;">Card: <strong>${card.slug}</strong> (${card.name || "sin nombre"})</p>
        <p style="font-size:14px;color:#C2BEB5;">WowApp: <strong>${wowApp.nombre}</strong></p>
        <p style="font-size:14px;line-height:1.7;color:#C2BEB5;white-space:pre-wrap;">${notes.replace(/</g, "&lt;")}</p>
      </div>`,
    }).catch((error) => {
      console.error(`requestAdaptationAction: Resend send failed -- pedido igual quedó guardado en DB.`, error);
    });
  }

  revalidatePath(`/m/wowstore/${wowAppKey}`);
  redirect(`/m/wowstore/${wowAppKey}?cardId=${cardId}&adaptationRequested=1`);
}
