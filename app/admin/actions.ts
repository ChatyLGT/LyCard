"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  verifyAdminCredentials,
  createAdminSession,
  destroyAdminSession,
  currentAdminId,
} from "@/lib/auth";
import { saveUpload } from "@/lib/storage";
import { MEDALS, RANKS } from "@/lib/data";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/admin");

  const admin = await verifyAdminCredentials(email, password);
  if (!admin) {
    redirect(`/admin/login?error=1&next=${encodeURIComponent(next)}`);
  }

  await createAdminSession(admin.id);
  redirect(next);
}

export async function logoutAction() {
  await destroyAdminSession();
  redirect("/admin/login");
}

export async function changePasswordAction(formData: FormData) {
  const adminId = await currentAdminId();
  if (!adminId) redirect("/admin/login");

  const currentPassword = String(formData.get("currentPassword") || "");
  const newPassword = String(formData.get("newPassword") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  const admin = await prisma.admin.findUnique({ where: { id: adminId } });
  if (!admin) redirect("/admin/login");

  const currentOk = await bcrypt.compare(currentPassword, admin.passwordHash);
  if (!currentOk) {
    redirect("/admin/account?error=current");
  }
  if (newPassword.length < 8) {
    redirect("/admin/account?error=short");
  }
  if (newPassword !== confirmPassword) {
    redirect("/admin/account?error=mismatch");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.admin.update({ where: { id: adminId }, data: { passwordHash } });

  redirect("/admin/account?saved=1");
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
