"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentAdminScope, isMasterN0Scope } from "@/lib/auth";
import { simulateNashMeshRun, normalizePsiTier, type NashMeshParticipant } from "@/lib/nashMesh";

async function assertMasterN0() {
  const scope = await currentAdminScope();
  if (!scope || !isMasterN0Scope(scope)) throw new Error("forbidden");
}

// El formulario manda `participants` como un JSON armado en el cliente
// (mismo patrón que EscalaEditor.tsx) — se re-valida acá igual, nunca se
// confía en lo que llegó del navegador.
function parseParticipants(raw: unknown): NashMeshParticipant[] {
  if (typeof raw !== "string") return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((v): v is Record<string, unknown> => typeof v === "object" && v !== null)
    .map((v) => ({
      cardId: typeof v.cardId === "string" && v.cardId ? v.cardId : null,
      name: typeof v.name === "string" ? v.name.trim() : "",
      declaredContributionPct: typeof v.declaredContributionPct === "number" ? v.declaredContributionPct : Number(v.declaredContributionPct) || 0,
      psiTier: normalizePsiTier(v.psiTier),
    }))
    .filter((p) => p.name);
}

export async function createNashMeshRunAction(formData: FormData) {
  await assertMasterN0();

  const label = String(formData.get("label") || "").trim() || "Simulación sin nombre";
  const totalValueUsd = Math.max(0, Number(formData.get("totalValueUsd")) || 0);
  const epsilon = Math.min(1, Math.max(0, Number(formData.get("epsilon")) || 0));
  const participants = parseParticipants(formData.get("participants"));

  if (participants.length > 0) {
    const outputs = simulateNashMeshRun(totalValueUsd, epsilon, participants);
    await prisma.nashMeshRun.create({
      data: { label, totalValueUsd, epsilon, participants, outputs },
    });
  }

  redirect("/admin/nashmesh");
}
