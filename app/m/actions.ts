"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createMemberSession, currentMemberId, destroyMemberSession } from "@/lib/memberAuth";

// WhatsApp OTP — simulated (PLAN.md Fase 1). requestOtpAction returns the
// code directly in its result instead of "sending" it anywhere real; the
// login screen displays it inline as a stand-in for the WhatsApp message
// it'll actually be once Fase 8 wires up the real Business API. Swapping
// that in later only touches this one function, not the rest of the flow.
export async function requestOtpAction(input: { whatsapp: string }) {
  const whatsapp = input.whatsapp.trim();
  if (!whatsapp) return { ok: false as const, error: "whatsapp" };

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await prisma.otpCode.create({ data: { whatsapp, code, expiresAt } });

  return { ok: true as const, simulatedCode: code };
}

export async function verifyOtpAction(input: { whatsapp: string; code: string; name: string }) {
  const whatsapp = input.whatsapp.trim();
  const code = input.code.trim();
  if (!whatsapp || !code) return { ok: false as const, error: "invalid_code" };

  const otp = await prisma.otpCode.findFirst({
    where: { whatsapp, code, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) return { ok: false as const, error: "invalid_code" };

  await prisma.otpCode.update({ where: { id: otp.id }, data: { usedAt: new Date() } });

  let member = await prisma.member.findUnique({ where: { whatsapp } });
  if (!member) {
    member = await prisma.member.create({ data: { whatsapp, name: input.name.trim() } });
  } else if (input.name.trim() && !member.name) {
    member = await prisma.member.update({ where: { id: member.id }, data: { name: input.name.trim() } });
  }

  await createMemberSession(member.id);
  return { ok: true as const };
}

export async function updateMemberEmailAction(input: { email: string }) {
  const memberId = await currentMemberId();
  if (!memberId) return { ok: false as const, error: "unauthenticated" };

  const email = input.email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false as const, error: "invalid_email" };
  }

  await prisma.member.update({ where: { id: memberId }, data: { email } });
  return { ok: true as const };
}

export async function memberLogoutAction() {
  await destroyMemberSession();
  redirect("/m/login");
}
