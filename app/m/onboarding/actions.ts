"use server";

import { currentMemberId } from "@/lib/memberAuth";
import { ensureLegacyMembershipAndCards } from "@/lib/legacyMembership";

// Puente del chat de demo Bot Warren (Simulá tu Gemelo Digital) hacia el
// mismo alta Freemium real que usa el login (lib/legacyMembership.ts) — no
// necesita su propia lógica, solo tomar el memberId de la sesión ya
// autenticada.
export async function joinLegacyProgramAction(input: { referredByCardSlug: string | null }) {
  const memberId = await currentMemberId();
  if (!memberId) return { ok: false as const, error: "unauthenticated" };

  const membershipId = await ensureLegacyMembershipAndCards(memberId, input.referredByCardSlug);
  return { ok: true as const, membershipId };
}
