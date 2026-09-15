"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  verifyMasterPassword,
  createAdminSession,
  destroyAdminSession,
} from "@/lib/auth";
import { saveUpload } from "@/lib/storage";
import { MEDALS, RANKS } from "@/lib/data";

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/admin");

  const ok = await verifyMasterPassword(password);
  if (!ok) {
    redirect(`/admin/login?error=1&next=${encodeURIComponent(next)}`);
  }

  await createAdminSession();
  redirect(next);
}

export async function logoutAction() {
  await destroyAdminSession();
  redirect("/admin/login");
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export async function createCardAction(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  let slug = slugify(String(formData.get("slug") || "") || name);
  if (!name || !slug) {
    throw new Error("Nombre y slug son obligatorios.");
  }

  const existing = await prisma.card.findUnique({ where: { slug } });
  if (existing) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const card = await prisma.card.create({
    data: {
      slug,
      name,
      title: "",
      quote: "",
      medal: MEDALS[2].id,
      rank: RANKS[1].id,
    },
  });

  revalidatePath("/admin");
  redirect(`/admin/${card.slug}`);
}

export async function updateCardAction(slug: string, formData: FormData) {
  const data: Record<string, string> = {};
  for (const key of ["name", "title", "quote", "siglas", "tooltip", "medal", "rank", "wa", "ig", "li", "x"]) {
    const v = formData.get(key);
    if (typeof v === "string") data[key] = v;
  }

  const portrait = formData.get("portrait");
  let portraitUrl: string | undefined;
  if (portrait instanceof File && portrait.size > 0) {
    portraitUrl = await saveUpload(portrait, `${slug}-portrait`);
  }

  const thumbnail = formData.get("videoThumbnail");
  let videoThumbnailUrl: string | undefined;
  if (thumbnail instanceof File && thumbnail.size > 0) {
    videoThumbnailUrl = await saveUpload(thumbnail, `${slug}-thumb`);
  }

  await prisma.card.update({
    where: { slug },
    data: {
      ...data,
      ...(portraitUrl ? { portraitUrl } : {}),
      ...(videoThumbnailUrl ? { videoThumbnailUrl } : {}),
    },
  });

  revalidatePath(`/admin/${slug}`);
  revalidatePath(`/c/${slug}`);
  redirect(`/admin/${slug}?saved=1`);
}

export async function deleteCardAction(slug: string, _formData: FormData) {
  await prisma.card.delete({ where: { slug } });
  revalidatePath("/admin");
  redirect("/admin");
}
