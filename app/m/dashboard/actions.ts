"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentMemberId } from "@/lib/memberAuth";
import { saveUpload } from "@/lib/storage";
import { parseShareScope } from "@/lib/shareScope";

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
    "contacts",
    "wa",
    "ig",
    "li",
    "x",
    "fb",
    "tiktok",
    "yt",
    "web",
    "email",
    "location",
    "storyQuote",
    "storyBody",
  ]) {
    const v = formData.get(key);
    if (typeof v === "string") data[key] = v;
  }

  const portrait = formData.get("portrait");
  let portraitUrl: string | undefined;
  if (portrait instanceof File && portrait.size > 0) {
    portraitUrl = await saveUpload(portrait, `${slug}-portrait`);
  }

  // Company's own logo, shown in the Virtual Office trigger instead of the
  // fixed gem SVG (2026-09-16) — only company cards render the field, but
  // saved generically like every other upload here.
  const logo = formData.get("logo");
  let logoUrl: string | undefined;
  if (logo instanceof File && logo.size > 0) {
    logoUrl = await saveUpload(logo, `${slug}-logo`);
  }

  // Virtual Office content (PLAN.md Fase 7) — a portfolio (company) or
  // résumé/gallery (personal), sent as a JSON string. Sanitized here rather
  // than trusted as-is, same as every other field in this action.
  const officeItemsRaw = formData.get("officeItems");
  let officeItems: object[] | undefined;
  if (typeof officeItemsRaw === "string") {
    try {
      const parsed = JSON.parse(officeItemsRaw);
      if (Array.isArray(parsed)) {
        officeItems = parsed
          .filter((v): v is Record<string, unknown> => typeof v === "object" && v !== null)
          .map((v) => ({
            id: typeof v.id === "string" ? v.id : Math.random().toString(36).slice(2),
            title: typeof v.title === "string" ? v.title.trim() : "",
            subtitle: typeof v.subtitle === "string" ? v.subtitle.trim() : "",
            description: typeof v.description === "string" ? v.description.trim() : "",
            imageUrl: typeof v.imageUrl === "string" ? v.imageUrl.trim() : "",
          }))
          .filter((item) => item.title.length > 0);
      }
    } catch {
      // malformed JSON from the client — ignore rather than fail the whole save
    }
  }

  const shareScope = parseShareScope(formData.getAll("shareScope"));

  await prisma.card.update({
    where: { slug },
    data: {
      ...data,
      shareScope,
      ...(portraitUrl ? { portraitUrl } : {}),
      ...(logoUrl ? { logoUrl } : {}),
      ...(officeItems ? { officeItems } : {}),
    },
  });

  revalidatePath(`/m/dashboard/${card.kind}`);
  revalidatePath(`/c/${slug}`);
  redirect(`/m/dashboard/${card.kind}?saved=1`);
}

// Only the "Mi camino con..." modal content on a project card — deliberately
// narrower than updateMemberCardAction above. A project card's identity
// (siglas/denominación, badges, social channels) is Program-owned (PLAN.md
// Fase 9.1/9.2, Fase 7.1); this is the one piece of it that's the host's
// own voice, per Gunnar's request (2026-09-15).
export async function updateMemberStoryAction(slug: string, formData: FormData) {
  const memberId = await currentMemberId();
  if (!memberId) redirect("/m/login");

  const card = await prisma.card.findUnique({ where: { slug } });
  if (!card || card.memberId !== memberId || card.kind !== "project") redirect("/m/dashboard");

  const storyQuote = String(formData.get("storyQuote") || "").trim();
  const storyBody = String(formData.get("storyBody") || "").trim();

  await prisma.card.update({ where: { slug }, data: { storyQuote, storyBody } });

  revalidatePath("/m/dashboard/project");
  revalidatePath(`/c/${slug}`);
  redirect("/m/dashboard/project?saved=1");
}
