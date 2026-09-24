"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentAdminScope, isMasterN0Scope } from "@/lib/auth";
import { WOW_APP_TYPES, EXAMPLE_WOW_APPS, type WowAppAppType } from "@/lib/wowApps";

// Catálogo global de WowStore -- MasterN0-only, no está scoped a ningún
// Programa (a diferencia de Puesto/officeSkills): cualquier MiPyME lo ve,
// sin importar de qué Programa (o de ninguno) sea su Card.
async function requireMasterN0() {
  const scope = await currentAdminScope();
  if (!scope) redirect("/admin/login");
  if (!isMasterN0Scope(scope)) redirect("/admin");
}

function parseTagsInput(raw: FormDataEntryValue | null): string[] {
  return String(raw || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseAppType(raw: FormDataEntryValue | null): WowAppAppType {
  return WOW_APP_TYPES.includes(raw as WowAppAppType) ? (raw as WowAppAppType) : "custom";
}

async function requireWowApp(wowAppId: string) {
  const wowApp = await prisma.wowApp.findUnique({ where: { id: wowAppId } });
  if (!wowApp) redirect("/admin/wowstore");
  return wowApp;
}

export async function createWowAppAction(formData: FormData) {
  await requireMasterN0();

  const key = String(formData.get("key") || "").trim();
  const nombre = String(formData.get("nombre") || "").trim();
  const descripcion = String(formData.get("descripcion") || "").trim();
  if (!key || !nombre) redirect("/admin/wowstore?wowAppError=required");

  const existing = await prisma.wowApp.findUnique({ where: { key } });
  if (existing) redirect("/admin/wowstore?wowAppError=duplicateKey");

  await prisma.wowApp.create({
    data: {
      key,
      nombre,
      descripcion,
      iconUrl: String(formData.get("iconUrl") || "").trim(),
      color: String(formData.get("color") || "").trim() || "#C8A15A",
      appType: parseAppType(formData.get("appType")),
      industryTags: parseTagsInput(formData.get("industryTags")),
      painPointTags: parseTagsInput(formData.get("painPointTags")),
      basePriceUsd: Number(formData.get("basePriceUsd") || 0) || 0,
      status: String(formData.get("status") || "proximamente").trim() || "proximamente",
      demoVideoUrl: String(formData.get("demoVideoUrl") || "").trim(),
    },
  });

  revalidatePath("/admin/wowstore");
  redirect("/admin/wowstore?wowAppCreated=1");
}

export async function updateWowAppAction(wowAppId: string, formData: FormData) {
  await requireMasterN0();
  await requireWowApp(wowAppId);

  const key = String(formData.get("key") || "").trim();
  const nombre = String(formData.get("nombre") || "").trim();
  const descripcion = String(formData.get("descripcion") || "").trim();
  if (!key || !nombre) redirect("/admin/wowstore?wowAppError=required");

  const clashing = await prisma.wowApp.findUnique({ where: { key } });
  if (clashing && clashing.id !== wowAppId) redirect("/admin/wowstore?wowAppError=duplicateKey");

  await prisma.wowApp.update({
    where: { id: wowAppId },
    data: {
      key,
      nombre,
      descripcion,
      iconUrl: String(formData.get("iconUrl") || "").trim(),
      color: String(formData.get("color") || "").trim() || "#C8A15A",
      appType: parseAppType(formData.get("appType")),
      industryTags: parseTagsInput(formData.get("industryTags")),
      painPointTags: parseTagsInput(formData.get("painPointTags")),
      basePriceUsd: Number(formData.get("basePriceUsd") || 0) || 0,
      status: String(formData.get("status") || "proximamente").trim() || "proximamente",
      demoVideoUrl: String(formData.get("demoVideoUrl") || "").trim(),
    },
  });

  revalidatePath("/admin/wowstore");
  redirect("/admin/wowstore?wowAppSaved=1");
}

// "Sembrar catálogo de ejemplo" (2026-09-24, pedido de Gunnar: "solo
// para que se vea poblada") -- idempotente por key, nunca pisa una
// entrada que el N0 ya editó a mano. Ninguna tiene lógica real conectada
// (status "proximanente" fijo, mismo criterio de W1); son ejemplos
// reales sacados del catálogo de servicios de Mercosur Irpavi/HeroSuite
// (el resto de ese catálogo es infraestructura IT para empresas
// grandes, no calza con una MiPyME chica) más "Notas de Voz", la misma
// capacidad que ya corre como Superpoder interno de Legacy.
export async function seedExampleWowAppsAction() {
  await requireMasterN0();

  let created = 0;
  for (const example of EXAMPLE_WOW_APPS) {
    const existing = await prisma.wowApp.findUnique({ where: { key: example.key } });
    if (existing) continue;
    await prisma.wowApp.create({
      data: {
        key: example.key,
        nombre: example.nombre,
        descripcion: example.descripcion,
        color: example.color,
        appType: example.appType,
        industryTags: example.industryTags,
        painPointTags: example.painPointTags,
        basePriceUsd: example.basePriceUsd,
        status: example.status,
      },
    });
    created++;
  }

  revalidatePath("/admin/wowstore");
  redirect(`/admin/wowstore?wowAppsSeeded=${created}`);
}

export async function deleteWowAppAction(wowAppId: string) {
  await requireMasterN0();
  await requireWowApp(wowAppId);

  // Cascade en WowAppInstall (onDelete: Cascade) -- borrar del catálogo
  // se lleva puestas las instalaciones existentes, a propósito: sin la
  // entrada de catálogo no hay nada que mostrarle al dueño de esa Card.
  await prisma.wowApp.delete({ where: { id: wowAppId } });

  revalidatePath("/admin/wowstore");
  redirect("/admin/wowstore?wowAppDeleted=1");
}
