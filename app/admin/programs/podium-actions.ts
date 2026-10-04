"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentAdminScope, canAccessProgram } from "@/lib/auth";
import { parsePodiumButtons, upsertPodiumButton, parseVaultSources, PODIUM_BUTTON_KINDS, type PodiumButtonKind } from "@/lib/podiumButtons";

// Mismo guard que puestos-actions.ts -- MasterN0 maneja cualquier
// Programa, un N0 escopado solo el suyo.
async function requireProgramAccess(programId: string) {
  const scope = await currentAdminScope();
  if (!scope) redirect("/admin/login");
  if (!canAccessProgram(scope, programId)) redirect(`/admin/programs/${scope.programId}`);
  return scope;
}

// Botones del podio (2026-10-04) -- el N0 elige, por slot, cuál de las 5
// opciones mostrar en la tarjeta ("Info", el modal simple de "Mi
// camino", "Enviar Invitación Especial", "Bóveda Legacy", o un botón a
// medida armado con el agente de IA). Elegir un kind distinto de
// "ai_agent" borra cualquier spec de IA que hubiera quedado de antes en
// ese slot -- evita que un spec viejo "reaparezca" si vuelven a elegir
// ai_agent más tarde sin querer reusar el anterior.
export async function setPodiumButtonAction(programId: string, slot: "left" | "right", formData: FormData) {
  await requireProgramAccess(programId);

  const kindRaw = String(formData.get("kind") || "info");
  const kind: PodiumButtonKind = PODIUM_BUTTON_KINDS.includes(kindRaw as PodiumButtonKind) ? (kindRaw as PodiumButtonKind) : "info";

  const program = await prisma.program.findUnique({ where: { id: programId }, select: { podiumButtons: true } });
  const items = parsePodiumButtons(program?.podiumButtons);
  const next = upsertPodiumButton(items, { slot, kind, aiTitle: "", aiIcon: "", aiBody: "", aiPrompt: "" });

  await prisma.program.update({ where: { id: programId }, data: { podiumButtons: next } });

  revalidatePath(`/admin/programs/${programId}`);
  redirect(`/admin/programs/${programId}?podiumSaved=${slot}`);
}

// Bóveda Legacy (2026-10-04) -- título, palabra secreta, link de
// NotebookLM ("cuaderno") y fuentes, a nivel Programa. Mismo contenido
// que ya existía por CardRecipient pero sin necesitar un link de
// destinatario (?para=) para verlo.
export async function updateVaultAction(programId: string, formData: FormData) {
  await requireProgramAccess(programId);

  const vaultTitle = String(formData.get("vaultTitle") || "").trim() || "Bóveda Legacy";
  const vaultPalabraSecreta = String(formData.get("vaultPalabraSecreta") || "").trim();
  const vaultCuadernoUrl = String(formData.get("vaultCuadernoUrl") || "").trim();

  let sourcesRaw: unknown = [];
  try {
    sourcesRaw = JSON.parse(String(formData.get("vaultSources") || "[]"));
  } catch {
    sourcesRaw = [];
  }
  const vaultSources = parseVaultSources(sourcesRaw);

  await prisma.program.update({
    where: { id: programId },
    data: { vaultTitle, vaultPalabraSecreta, vaultCuadernoUrl, vaultSources },
  });

  revalidatePath(`/admin/programs/${programId}`);
  redirect(`/admin/programs/${programId}?vaultSaved=1`);
}
