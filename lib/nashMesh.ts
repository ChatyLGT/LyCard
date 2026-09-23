// NashMesh (pedido de Gunnar, 2026-09-23) — el motor de reparto de pago:
// Payment_i = φ_i × ψ_i × (1-ε). Primera versión, simulación pura, sin
// dinero real ni blockchain (confirmado con Gunnar, fuera de alcance de
// este MVP). Se dispara típicamente al confirmar un cruce real de Janus
// (lib/janus.ts) — dos o más Cards que se emparejaron de verdad.
//
// φ_i acá es una versión simplificada a propósito ("contribución
// declarada a mano" en vez del cálculo combinatorio real de Shapley
// Value) — mismo criterio honesto que el resto del proyecto: nunca
// fingir precisión que no existe todavía. ψ_i son tres niveles fijos ya
// definidos en el WHITEPAPER (0.15/0.35/1.0).

export type PsiTier = 1 | 2 | 3;

export const PSI_TIERS: PsiTier[] = [1, 2, 3];

export const PSI_BY_TIER: Record<PsiTier, number> = { 1: 0.15, 2: 0.35, 3: 1.0 };

export const PSI_TIER_LABEL: Record<PsiTier, string> = {
  1: "Autónomo (15%)",
  2: "Con supervisión (35%)",
  3: "Directo (100%)",
};

export function normalizePsiTier(value: unknown): PsiTier {
  const n = Number(value);
  return n === 2 || n === 3 ? (n as PsiTier) : 1;
}

export type NashMeshParticipant = {
  cardId: string | null;
  name: string;
  declaredContributionPct: number; // 0-100, tal cual lo escribió el N0
  psiTier: PsiTier;
};

export type NashMeshOutput = {
  cardId: string | null;
  name: string;
  phi: number; // 0-1, ya normalizado
  psi: number;
  payment: number;
};

export function computePayment(totalValueUsd: number, phi: number, psi: number, epsilon: number): number {
  return totalValueUsd * phi * psi * (1 - epsilon);
}

// Los % declarados no necesitan sumar 100 exacto — se normalizan solos.
// Si todos declararon 0 (o no declararon nada), se reparte parejo en vez
// de dividir por cero.
function normalizeContributions(participants: NashMeshParticipant[]): number[] {
  const total = participants.reduce((sum, p) => sum + Math.max(0, p.declaredContributionPct), 0);
  if (total === 0) {
    return participants.map(() => 1 / participants.length);
  }
  return participants.map((p) => Math.max(0, p.declaredContributionPct) / total);
}

export function simulateNashMeshRun(totalValueUsd: number, epsilon: number, participants: NashMeshParticipant[]): NashMeshOutput[] {
  if (participants.length === 0) return [];
  const phis = normalizeContributions(participants);
  return participants.map((p, i) => {
    const phi = phis[i];
    const psi = PSI_BY_TIER[p.psiTier];
    return { cardId: p.cardId, name: p.name, phi, psi, payment: computePayment(totalValueUsd, phi, psi, epsilon) };
  });
}
