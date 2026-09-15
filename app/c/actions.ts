"use server";

import { prisma } from "@/lib/prisma";
import { slotById } from "@/lib/interviewSlots";
import { currentMemberId } from "@/lib/memberAuth";

export async function registerInterviewAction(input: {
  cardSlug: string;
  slotId: string;
  name: string;
  whatsapp: string;
  email: string;
}) {
  const name = input.name.trim();
  const whatsapp = input.whatsapp.trim();
  const email = input.email.trim();
  const slot = slotById(input.slotId);

  if (!slot) return { ok: false as const, error: "slot" };
  if (!name) return { ok: false as const, error: "name" };
  if (!whatsapp) return { ok: false as const, error: "whatsapp" };

  const card = await prisma.card.findUnique({ where: { slug: input.cardSlug } });
  if (!card) return { ok: false as const, error: "card" };

  // Link this registration to the visitor's own membership when they're
  // logged in as a Member (PLAN.md Fase 4) — this is what lets the admin
  // panel activate their membership from the registration. Anonymous
  // registrations (or ones with no matching membership yet) keep working,
  // just unlinked, exactly as before.
  const memberId = await currentMemberId();
  let membershipId: string | null = null;
  if (memberId) {
    const membership = card.programId
      ? await prisma.programMembership.findUnique({
          where: { memberId_programId: { memberId, programId: card.programId } },
        })
      : await prisma.programMembership.findFirst({
          where: { memberId },
          orderBy: { createdAt: "desc" },
        });
    membershipId = membership?.id ?? null;
  }

  await prisma.registration.create({
    data: {
      cardId: card.id,
      slotId: slot.id,
      slotLabel: `${slot.label} — ${slot.time}`,
      name,
      whatsapp,
      email,
      membershipId,
    },
  });

  return { ok: true as const, slotLabel: `${slot.label} — ${slot.time}` };
}

export async function sendInvitationAction(input: { cardSlug: string; inviteeEmail: string }) {
  const inviteeEmail = input.inviteeEmail.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteeEmail)) {
    return { ok: false as const, error: "email" };
  }

  const card = await prisma.card.findUnique({ where: { slug: input.cardSlug } });
  if (!card) return { ok: false as const, error: "card" };

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error(
      `sendInvitationAction: RESEND_API_KEY is not set — invitation to ${inviteeEmail} from ${card.slug} was not sent.`
    );
    return { ok: false as const, error: "not_configured" };
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const cardUrl = `${baseUrl}/c/${card.slug}`;
  const isCompany = card.kind === "company";

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM || "Legacy Program <onboarding@resend.dev>",
    to: inviteeEmail,
    subject: isCompany ? `${card.name} te invita a conocer su negocio` : `${card.name} te invita al Programa Legacy`,
    html: isCompany
      ? `
      <div style="font-family:Georgia,serif;background:#0D0D0D;color:#F5F2EB;padding:32px;border-radius:16px;max-width:480px;margin:0 auto;">
        <p style="letter-spacing:.2em;text-transform:uppercase;font-size:11px;color:#C8A15A;margin:0 0 16px;">${escapeHtml(card.title || "Negocio")}</p>
        <h1 style="font-size:22px;margin:0 0 16px;">${escapeHtml(card.name)} te invita a conocer su negocio</h1>
        <p style="font-size:14px;line-height:1.7;color:#C2BEB5;">${escapeHtml(card.quote || "")}</p>
        <a href="${cardUrl}" style="display:inline-block;margin-top:20px;padding:12px 24px;border-radius:10px;background:linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B);color:#0D0D0D;font-weight:700;text-decoration:none;letter-spacing:.08em;">
          Ver la tarjeta de ${escapeHtml(card.name)}
        </a>
      </div>
    `
      : `
      <div style="font-family:Georgia,serif;background:#0D0D0D;color:#F5F2EB;padding:32px;border-radius:16px;max-width:480px;margin:0 auto;">
        <p style="letter-spacing:.2em;text-transform:uppercase;font-size:11px;color:#C8A15A;margin:0 0 16px;">Programa Legacy</p>
        <h1 style="font-size:22px;margin:0 0 16px;">${escapeHtml(card.name)} te invita a conocer Legacy</h1>
        <p style="font-size:14px;line-height:1.7;color:#C2BEB5;">
          Formación de alto calibre, networking con líderes selectos y un ecosistema
          Web3 transparente. ${escapeHtml(card.name)} comparte esta invitación con su círculo de confianza.
        </p>
        <a href="${cardUrl}" style="display:inline-block;margin-top:20px;padding:12px 24px;border-radius:10px;background:linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B);color:#0D0D0D;font-weight:700;text-decoration:none;letter-spacing:.08em;">
          Ver la tarjeta de ${escapeHtml(card.name)}
        </a>
      </div>
    `,
  });

  if (error) {
    console.error("sendInvitationAction: Resend error", error);
    return { ok: false as const, error: "send_failed" };
  }

  return { ok: true as const };
}

export async function sendContactMessageAction(input: {
  cardSlug: string;
  senderName: string;
  senderEmail: string;
  message: string;
}) {
  const senderName = input.senderName.trim();
  const senderEmail = input.senderEmail.trim();
  const message = input.message.trim();

  if (!senderName) return { ok: false as const, error: "name" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail)) return { ok: false as const, error: "email" };
  if (!message) return { ok: false as const, error: "message" };

  const card = await prisma.card.findUnique({
    where: { slug: input.cardSlug },
    include: { member: true },
  });
  if (!card) return { ok: false as const, error: "card" };

  const toEmail = card.member?.email;
  const apiKey = process.env.RESEND_API_KEY;
  if (!toEmail || !apiKey) {
    console.error(
      `sendContactMessageAction: not configured (member email or RESEND_API_KEY missing) — message to ${card.slug} from ${senderEmail} was not sent.`
    );
    return { ok: false as const, error: "not_configured" };
  }

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM || "LyCard <onboarding@resend.dev>",
    to: toEmail,
    replyTo: senderEmail,
    subject: `${senderName} te escribió por tu LyCard`,
    html: `
      <div style="font-family:Georgia,serif;background:#0D0D0D;color:#F5F2EB;padding:32px;border-radius:16px;max-width:480px;margin:0 auto;">
        <p style="letter-spacing:.2em;text-transform:uppercase;font-size:11px;color:#C8A15A;margin:0 0 16px;">Nuevo mensaje en tu LyCard</p>
        <h1 style="font-size:20px;margin:0 0 16px;">${escapeHtml(senderName)}</h1>
        <p style="font-size:13px;color:#9a8f80;margin:0 0 14px;">${escapeHtml(senderEmail)}</p>
        <p style="font-size:14px;line-height:1.7;color:#C2BEB5;white-space:pre-wrap;">${escapeHtml(message)}</p>
      </div>
    `,
  });

  if (error) {
    console.error("sendContactMessageAction: Resend error", error);
    return { ok: false as const, error: "send_failed" };
  }

  return { ok: true as const };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
