"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentAdminScope } from "@/lib/auth";
import { slugify, uniqueSlug } from "@/lib/slug";

const slugTaken = (slug: string) =>
  prisma.card.findUnique({ where: { slug }, select: { id: true } }).then(Boolean);

// "Crear Business y Personal" (2026-09-16) — bootstraps the other two Cards
// for a project Card's owner directly from the backoffice, bypassing the
// simulated WhatsApp OTP flow entirely: there's nothing to "receive", the
// Member row is created straight from the WhatsApp number already on the
// Card (or reused if that number already went through the real onboarding
// chat — upsert on the unique whatsapp field handles both). Copies shared
// identity fields as an editable starting point; idempotent like
// completeInterviewAction — skips any kind that already exists for that
// Member, safe to click more than once.
export async function createSiblingCardsAction(slug: string) {
  const scope = await currentAdminScope();
  if (!scope) redirect("/admin/login");

  const card = await prisma.card.findUnique({ where: { slug } });
  if (!card) redirect("/admin");
  if (card.kind !== "project") redirect(`/admin/${slug}`);
  if (scope.programId && scope.programId !== card.programId) redirect("/admin");

  let memberId = card.memberId;
  if (!memberId) {
    if (!card.wa.trim()) redirect(`/admin/${slug}?siblingError=noWa`);
    const member = await prisma.member.upsert({
      where: { whatsapp: card.wa },
      update: {},
      create: { whatsapp: card.wa, name: card.name },
    });
    memberId = member.id;
  }

  const existingKinds = new Set(
    (await prisma.card.findMany({ where: { memberId }, select: { kind: true } })).map((c) => c.kind)
  );

  const shared = {
    name: card.name,
    title: card.title,
    quote: card.quote,
    siglas: card.siglas,
    tooltip: card.tooltip,
    medal: card.medal,
    rank: card.rank,
    wa: card.wa,
    ig: card.ig,
    li: card.li,
    x: card.x,
    fb: card.fb,
    tiktok: card.tiktok,
    yt: card.yt,
    web: card.web,
    portraitUrl: card.portraitUrl,
    defaultTheme: card.defaultTheme,
    defaultLang: card.defaultLang,
    memberId,
  };

  const toCreate: Array<typeof shared & { slug: string; kind: string }> = [];
  if (!existingKinds.has("company")) {
    toCreate.push({ ...shared, slug: await uniqueSlug(slugify(`${card.slug}-business`), slugTaken), kind: "company" });
  }
  if (!existingKinds.has("personal")) {
    toCreate.push({ ...shared, slug: await uniqueSlug(slugify(`${card.slug}-personal`), slugTaken), kind: "personal" });
  }

  await prisma.$transaction([
    ...(card.memberId ? [] : [prisma.card.update({ where: { slug }, data: { memberId } })]),
    ...(toCreate.length ? [prisma.card.createMany({ data: toCreate })] : []),
  ]);

  revalidatePath(`/admin/${slug}`);
  revalidatePath(`/c/${slug}`);
  redirect(`/admin/${slug}?siblingsCreated=${toCreate.length}`);
}
