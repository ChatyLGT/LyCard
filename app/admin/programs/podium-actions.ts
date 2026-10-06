"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentAdminScope, canAccessProgram } from "@/lib/auth";
import { parsePodiumButtons, upsertPodiumButton, PODIUM_BUTTON_KINDS, type PodiumButtonKind } from "@/lib/podiumButtons";
import { parseModalBlocks, parseModalBlocksMap } from "@/lib/modalBlocks";
import { MODAL_EDITOR_ENTRIES, parseModalIcons, parseTierIntros } from "@/lib/modalEditor";

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

// Bóveda Legacy (2026-10-04) -- título, palabra secreta (dormant, ver
// PLAN.md) y el contenido libre armado con el Editor de Modales
// (lib/modalBlocks.ts), a nivel Programa. Mismo contenido conceptual
// que ya existía por CardRecipient pero sin necesitar un link de
// destinatario (?para=) para verlo. Sus bloques viven en
// Program.modalBlocks.vault desde la unificación (2026-10-06) -- título
// y palabra secreta siguen en sus propias columnas porque son solo de
// este modal, no un patrón compartido con los otros 13.
export async function updateVaultAction(programId: string, formData: FormData) {
  await requireProgramAccess(programId);

  const vaultTitle = String(formData.get("vaultTitle") || "").trim() || "Bóveda Legacy";
  const vaultPalabraSecreta = String(formData.get("vaultPalabraSecreta") || "").trim();

  let blocksRaw: unknown = [];
  try {
    blocksRaw = JSON.parse(String(formData.get("blocks") || "[]"));
  } catch {
    blocksRaw = [];
  }
  const blocks = parseModalBlocks(blocksRaw);

  const program = await prisma.program.findUnique({ where: { id: programId }, select: { modalBlocks: true } });
  const modalBlocksMap = parseModalBlocksMap(program?.modalBlocks);
  if (blocks.length > 0) modalBlocksMap.vault = blocks;
  else delete modalBlocksMap.vault;

  await prisma.program.update({
    where: { id: programId },
    data: { vaultTitle, vaultPalabraSecreta, modalBlocks: modalBlocksMap },
  });

  revalidatePath(`/admin/programs/${programId}`);
  redirect(`/admin/programs/${programId}?modalSaved=vault`);
}

// Editor de Modales -- Unificación completa (2026-10-06, pedido de
// Gunnar: "no se que has echo.. en ningun lado puedo leer ni se donde
// esta el texto del título o del contenido del modal de cardinfo" ->
// "dale con todos los 14, hacelo bien completo"). Reemplaza
// updateCardInfoAction + updateModalEditorAction (y cualquier acción
// futura de un modal nuevo): UNA acción genérica, parametrizada por
// `key`, que guarda exactamente los campos que ese modal declara en
// lib/modalEditor.ts (MODAL_EDITOR_ENTRIES) -- ícono si iconEditable,
// el texto del botón/kicker si kickerFieldKey, y el cuerpo según
// bodyKind ("bloques" -> Program.modalBlocks[key], "niveles" ->
// Program.tierIntros[key], "fijo" -> nada que guardar). Vacío en
// cualquier campo vuelve al default de siempre (nunca persiste
// strings vacíos ni arrays vacíos).
export async function updateModalContentAction(programId: string, key: string, formData: FormData) {
  await requireProgramAccess(programId);

  const entry = MODAL_EDITOR_ENTRIES.find((e) => e.key === key);
  if (!entry) redirect(`/admin/programs/${programId}`);

  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: { modalIcons: true, cardLabels: true, modalBlocks: true, tierIntros: true },
  });
  if (!program) redirect(`/admin/programs/${programId}`);

  const modalIcons = parseModalIcons(program.modalIcons);
  const cardLabels: Record<string, string> =
    program.cardLabels && typeof program.cardLabels === "object" && !Array.isArray(program.cardLabels)
      ? { ...(program.cardLabels as Record<string, string>) }
      : {};
  const modalBlocksMap = parseModalBlocksMap(program.modalBlocks);
  const tierIntros = parseTierIntros(program.tierIntros);

  if (entry.iconEditable) {
    const icon = String(formData.get("icon") || "").trim();
    if (icon) modalIcons[key] = icon;
    else delete modalIcons[key];
  }

  if (entry.kickerFieldKey) {
    const kicker = String(formData.get("kicker") || "").trim();
    if (kicker) cardLabels[entry.kickerFieldKey] = kicker;
    else delete cardLabels[entry.kickerFieldKey];
  }

  if (entry.bodyKind === "bloques") {
    let blocksRaw: unknown = [];
    try {
      blocksRaw = JSON.parse(String(formData.get("blocks") || "[]"));
    } catch {
      blocksRaw = [];
    }
    const blocks = parseModalBlocks(blocksRaw);
    if (blocks.length > 0) modalBlocksMap[key] = blocks;
    else delete modalBlocksMap[key];
  } else if (entry.bodyKind === "niveles") {
    const intro = String(formData.get("intro") || "").trim();
    if (intro) tierIntros[key] = intro;
    else delete tierIntros[key];
  }

  await prisma.program.update({
    where: { id: programId },
    data: { modalIcons, cardLabels, modalBlocks: modalBlocksMap, tierIntros },
  });

  revalidatePath(`/admin/programs/${programId}`);
  redirect(`/admin/programs/${programId}?modalSaved=${key}`);
}
