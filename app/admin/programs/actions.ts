"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { currentAdminScope } from "@/lib/auth";
import { slugify, uniqueSlug } from "@/lib/slug";

// Only MasterN0 (programId === null) can create Programs or their scoped N0
// admins — PLAN.md Fase 6 is explicit that this is the one thing a Program
// N0 can never do, even for their own Program.
async function requireMasterN0() {
  const scope = await currentAdminScope();
  if (!scope) redirect("/admin/login");
  if (scope.programId) redirect(`/admin/programs/${scope.programId}`);
  return scope;
}

export async function createProgramAction(formData: FormData) {
  await requireMasterN0();

  const name = String(formData.get("name") || "").trim();
  if (!name) redirect("/admin/programs?error=name");

  const slug = await uniqueSlug(slugify(String(formData.get("slug") || "") || name), (slug) =>
    prisma.program.findUnique({ where: { slug }, select: { id: true } }).then(Boolean)
  );

  const program = await prisma.program.create({ data: { slug, name } });

  revalidatePath("/admin/programs");
  redirect(`/admin/programs/${program.id}`);
}

export async function createProgramAdminAction(formData: FormData) {
  await requireMasterN0();

  const programId = String(formData.get("programId") || "");
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const errBase = `/admin/programs/${programId}`;

  if (!programId) redirect("/admin/programs");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect(`${errBase}?adminError=email`);
  if (password.length < 8) redirect(`${errBase}?adminError=password`);

  const program = await prisma.program.findUnique({ where: { id: programId } });
  if (!program) redirect("/admin/programs");

  const existing = await prisma.admin.findUnique({ where: { email } });
  if (existing) redirect(`${errBase}?adminError=exists`);

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.admin.create({ data: { email, passwordHash, programId } });

  revalidatePath(`/admin/programs/${programId}`);
  redirect(`/admin/programs/${programId}?adminCreated=1`);
}

export async function updateProgramAction(programId: string, formData: FormData) {
  const scope = await currentAdminScope();
  if (!scope) redirect("/admin/login");
  // MasterN0 can edit any Program; a scoped N0 only their own.
  if (scope.programId && scope.programId !== programId) redirect("/admin");

  const data: Record<string, string> = {};
  for (const key of ["name", "primaryColor", "wa", "ig", "li", "x", "fb", "tiktok", "yt", "web"]) {
    const v = formData.get(key);
    if (typeof v === "string") data[key] = v;
  }

  await prisma.program.update({ where: { id: programId }, data });

  revalidatePath(`/admin/programs/${programId}`);
  redirect(`/admin/programs/${programId}?saved=1`);
}
