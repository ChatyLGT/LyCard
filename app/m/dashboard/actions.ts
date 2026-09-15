"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentMemberId } from "@/lib/memberAuth";
import { saveUpload } from "@/lib/storage";

// Member-scoped twin of app/admin/actions.ts's updateCardAction — same
// field set, but gated by ownership (card.memberId must match the caller's
// own session) instead of Admin auth, since this edits a Member's own
// company/personal card (PLAN.md Fase 5).
export async function updateMemberCardAction(slug: string, formData: FormData) {
  const memberId = await currentMemberId();
  if (!memberId) redirect("/m/login");

  const card = await prisma.card.findUnique({ where: { slug } });
  if (!card || card.memberId !== memberId) redirect("/m/dashboard");

  const data: Record<string, string> = {};
  for (const key of [
    "name",
    "title",
    "quote",
    "siglas",
    "tooltip",
    "medal",
    "rank",
    "wa",
    "ig",
    "li",
    "x",
    "fb",
    "tiktok",
    "yt",
    "web",
  ]) {
    const v = formData.get(key);
    if (typeof v === "string") data[key] = v;
  }

  const portrait = formData.get("portrait");
  let portraitUrl: string | undefined;
  if (portrait instanceof File && portrait.size > 0) {
    portraitUrl = await saveUpload(portrait, `${slug}-portrait`);
  }

  await prisma.card.update({
    where: { slug },
    data: {
      ...data,
      ...(portraitUrl ? { portraitUrl } : {}),
    },
  });

  revalidatePath(`/m/dashboard/${card.kind}`);
  revalidatePath(`/c/${slug}`);
  redirect(`/m/dashboard/${card.kind}?saved=1`);
}
