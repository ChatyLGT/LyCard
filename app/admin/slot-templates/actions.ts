"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentAdminScope, isMasterN0Scope } from "@/lib/auth";
import { parseImportedEscala } from "@/lib/escalas";
import { parseModalBlocks } from "@/lib/modalBlocks";
import { parseOfficeSkills } from "@/lib/officeSkills";
import { parsePuestoTemplatePayload } from "@/lib/puestos";

// Librería "elegir o armar" (2026-10-07) -- catálogo global de
// SlotTemplate, MasterN0-only, no scoped a ningún Programa. Mismo
// criterio que WowApp (ver app/admin/wowstore/actions.ts): cualquier N0
// ve la librería entera, sin importar de qué Programa sea.
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

async function requireSlotTemplate(id: string) {
  const template = await prisma.slotTemplate.findUnique({ where: { id } });
  if (!template) redirect("/admin/slot-templates");
  return template;
}

// El payload se valida según slotType antes de persistir -- reusa el
// mismo validador que ya usa cada editor real (EscalaEditor/
// ModalBlocksEditor/OfficeSkillsEditor/Puestos), no uno nuevo: si el N0
// arma un template mal armado, mejor que falle acá, no cuando otro N0
// lo elija para su tarjeta.
function parsePayload(slotType: string, raw: FormDataEntryValue | null): unknown {
  const text = String(raw || "");
  if (slotType === "escala") return parseImportedEscala(text);
  if (slotType === "modal") return parseModalBlocks(safeJsonParse(text));
  if (slotType === "officeSkill") return parseOfficeSkills(safeJsonParse(text));
  if (slotType === "puesto") return parsePuestoTemplatePayload(safeJsonParse(text));
  return safeJsonParse(text);
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function createSlotTemplateAction(formData: FormData) {
  await requireMasterN0();

  const slotType = String(formData.get("slotType") || "").trim() || "escala";
  const nombre = String(formData.get("nombre") || "").trim();
  if (!nombre) redirect("/admin/slot-templates?slotTemplateError=required");

  const payload = parsePayload(slotType, formData.get("payload"));
  if (payload === null || (Array.isArray(payload) && payload.length === 0)) {
    redirect("/admin/slot-templates?slotTemplateError=badPayload");
  }

  await prisma.slotTemplate.create({
    data: {
      slotType,
      nombre,
      descripcion: String(formData.get("descripcion") || "").trim(),
      industryTags: parseTagsInput(formData.get("industryTags")),
      painPointTags: parseTagsInput(formData.get("painPointTags")),
      payload: payload as object,
    },
  });

  revalidatePath("/admin/slot-templates");
  redirect("/admin/slot-templates?slotTemplateCreated=1");
}

export async function updateSlotTemplateAction(id: string, formData: FormData) {
  await requireMasterN0();
  await requireSlotTemplate(id);

  const slotType = String(formData.get("slotType") || "").trim() || "escala";
  const nombre = String(formData.get("nombre") || "").trim();
  if (!nombre) redirect("/admin/slot-templates?slotTemplateError=required");

  const payload = parsePayload(slotType, formData.get("payload"));
  if (payload === null || (Array.isArray(payload) && payload.length === 0)) {
    redirect("/admin/slot-templates?slotTemplateError=badPayload");
  }

  await prisma.slotTemplate.update({
    where: { id },
    data: {
      slotType,
      nombre,
      descripcion: String(formData.get("descripcion") || "").trim(),
      industryTags: parseTagsInput(formData.get("industryTags")),
      painPointTags: parseTagsInput(formData.get("painPointTags")),
      payload: payload as object,
    },
  });

  revalidatePath("/admin/slot-templates");
  redirect("/admin/slot-templates?slotTemplateSaved=1");
}

export async function deleteSlotTemplateAction(id: string) {
  await requireMasterN0();
  await requireSlotTemplate(id);

  await prisma.slotTemplate.delete({ where: { id } });

  revalidatePath("/admin/slot-templates");
  redirect("/admin/slot-templates?slotTemplateDeleted=1");
}
