"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { currentAdminScope } from "@/lib/auth";
import { slugify, uniqueSlug } from "@/lib/slug";
import { CARD_LABEL_FIELDS } from "@/lib/cardLabels";
import { parseEscala } from "@/lib/escalas";
import { saveUpload } from "@/lib/storage";

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

export async function toggleProgramActiveAction(programId: string) {
  await requireMasterN0();
  const program = await prisma.program.findUnique({ where: { id: programId }, select: { active: true } });
  if (!program) redirect("/admin/programs");
  await prisma.program.update({ where: { id: programId }, data: { active: !program.active } });
  revalidatePath("/admin/programs");
  redirect("/admin/programs");
}

export async function deleteProgramAction(programId: string) {
  await requireMasterN0();

  const program = await prisma.program.findUnique({
    where: { id: programId },
    include: { _count: { select: { cards: true, admins: true, memberships: true } } },
  });
  if (!program) redirect("/admin/programs");

  // Refuse rather than cascade-orphan real cards/admins/members — this is
  // meant for cleaning up empty/test Programs, not a way to nuke a live one.
  const { cards, admins, memberships } = program._count;
  if (cards > 0 || admins > 0 || memberships > 0) {
    redirect(`/admin/programs?deleteError=${programId}`);
  }

  await prisma.program.delete({ where: { id: programId } });
  revalidatePath("/admin/programs");
  redirect("/admin/programs?deleted=1");
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

  // Program logo — rendered as the Virtual Office trigger on every project
  // card under this Program instead of the fixed gem SVG (2026-09-16).
  const logo = formData.get("logo");
  let logoUrl: string | undefined;
  if (logo instanceof File && logo.size > 0) {
    logoUrl = await saveUpload(logo, `${programId}-logo`);
  }

  await prisma.program.update({ where: { id: programId }, data: { ...data, ...(logoUrl ? { logoUrl } : {}) } });

  revalidatePath(`/admin/programs/${programId}`);
  redirect(`/admin/programs/${programId}?saved=1`);
}

// Title-only override of the fixed set of button/modal labels a project
// card renders (lib/cardLabels.ts) — atajo version of the full per-Program
// identity system in PLAN.md Fase 9. Blank field = revert to the i18n
// default, so we only persist keys the N0 actually typed something into.
export async function updateCardLabelsAction(programId: string, formData: FormData) {
  const scope = await currentAdminScope();
  if (!scope) redirect("/admin/login");
  if (scope.programId && scope.programId !== programId) redirect("/admin");

  const labels: Record<string, string> = {};
  for (const { key } of CARD_LABEL_FIELDS) {
    const v = String(formData.get(key) || "").trim();
    if (v) labels[key] = v;
  }

  await prisma.program.update({ where: { id: programId }, data: { cardLabels: labels } });

  revalidatePath(`/admin/programs/${programId}`);
  redirect(`/admin/programs/${programId}?labelsSaved=1`);
}

// Saves the whole ordered list of tiers for one scale (medal or rank) in one
// shot — the client-side EscalaEditor sends it as a single JSON blob, same
// pattern as officeItems in MemberCardEditor. Empty list = fall back to the
// fixed scale in lib/data.ts (PLAN.md Fase 9.4/9.5).
export async function updateEscalaAction(programId: string, type: "medal" | "rank", formData: FormData) {
  const scope = await currentAdminScope();
  if (!scope) redirect("/admin/login");
  if (scope.programId && scope.programId !== programId) redirect("/admin");

  const raw = formData.get("items");
  let items: ReturnType<typeof parseEscala> = [];
  if (typeof raw === "string") {
    try {
      items = parseEscala(JSON.parse(raw));
    } catch {
      // malformed JSON from the client — ignore rather than fail the save
    }
  }

  await prisma.program.update({
    where: { id: programId },
    data: type === "medal" ? { medalScale: items } : { rankScale: items },
  });

  revalidatePath(`/admin/programs/${programId}`);
  redirect(`/admin/programs/${programId}?escalaSaved=${type}`);
}
