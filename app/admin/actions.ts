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
import { slugify } from "@/lib/slug";
import { parseShareScope } from "@/lib/shareScope";

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
    "islandLabel",
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

  // Picking a Puesto from the Program's ladder (PLAN.md Fase 9.2) snapshots
  // its siglas/denominación into the Card too — so if the Puesto later
  // gets deleted, the card keeps showing its last-known values instead of
  // going blank. Leaving the select on "mantener texto actual" (empty
  // value) skips this entirely, same as a Card with no Program.
  let puestoId: string | null | undefined;
  const puestoIdRaw = formData.get("puestoId");
  if (typeof puestoIdRaw === "string" && puestoIdRaw) {
    const puesto = await prisma.puesto.findUnique({ where: { id: puestoIdRaw } });
    if (puesto) {
      puestoId = puesto.id;
      data.siglas = puesto.siglas;
      data.tooltip = puesto.denominacion;
    }
  }

  // Program assignment + "Es el Origen" (2026-09-16) both live in the
  // MasterN0-only section of the form — gated by its own hidden marker
  // rather than programId's presence, since that select doesn't render at
  // all when no Program exists yet (which is exactly when marking a Card
  // as Origin right after a reset matters most). Without programId, a
  // Card never picks up its Program's card labels/puestos/escalas no
  // matter what the N0 configures, since every lookup in LyCardView falls
  // back to fixed defaults when card.program is null. Switching Program
  // invalidates any Puesto picked above, since it belonged to the
  // previous Program's ladder.
  let isOrigin: boolean | undefined;
  let programId: string | null | undefined;
  if (formData.get("masterN0Section") === "1") {
    isOrigin = formData.get("isOrigin") === "1";
    const programIdRaw = formData.get("programId");
    if (typeof programIdRaw === "string") {
      const current = await prisma.card.findUnique({ where: { slug }, select: { programId: true } });
      programId = programIdRaw || null;
      if (current && current.programId !== programId) puestoId = null;
    }
  }

  // Privacidad entre las 3 tarjetas (2026-09-19) — qué otras sumar al
  // carrusel cuando alguien abre esta. Siempre presente en el form (un
  // fieldset de checkboxes), así que getAll() vacío = las destildaron
  // todas, no "no se tocó el campo".
  const shareScope = parseShareScope(formData.getAll("shareScope"));

  await prisma.card.update({
    where: { slug },
    data: {
      ...data,
      shareScope,
      ...(portraitUrl ? { portraitUrl } : {}),
      ...(videoThumbnailUrl ? { videoThumbnailUrl } : {}),
      ...(puestoId !== undefined ? { puestoId } : {}),
      ...(programId !== undefined ? { programId } : {}),
      ...(isOrigin !== undefined ? { isOrigin } : {}),
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
