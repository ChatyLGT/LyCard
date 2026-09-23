// Embudo de Conversión (pedido de Gunnar, 2026-09-23) — "CRM" redefinido:
// no es el pipeline de calidad Sherpa documentado en el roadmap, es
// seguimiento de cuánta gente recibió el QR de una tarjeta, cuántos se
// registraron, cuántos fueron entrevistados, cuántos activaron su
// Oficina Virtual y (marcado a mano, no hay pasarela de pago real) cuántos
// pagaron. Une 3 modelos que ya existían sueltos: CardLead, Registration
// y ProgramMembership.
export type FunnelStageKey =
  | "shared"
  | "registered"
  | "interviewed"
  | "active"
  | "paid";

export const FUNNEL_STAGE_ORDER: FunnelStageKey[] = [
  "shared",
  "registered",
  "interviewed",
  "active",
  "paid",
];

export const FUNNEL_STAGE_LABEL: Record<FunnelStageKey, string> = {
  shared: "QR compartido",
  registered: "Se registró",
  interviewed: "Entrevistado",
  active: "Oficina activa",
  paid: "Membresía pagada",
};

export type FunnelCounts = Record<FunnelStageKey, number>;

export type FunnelStage = {
  key: FunnelStageKey;
  label: string;
  count: number;
  conversionFromPrevious: number | null;
};

export function buildFunnelStages(counts: FunnelCounts): FunnelStage[] {
  let previousCount: number | null = null;
  return FUNNEL_STAGE_ORDER.map((key) => {
    const count = counts[key];
    const conversionFromPrevious =
      previousCount === null || previousCount === 0
        ? null
        : count / previousCount;
    previousCount = count;
    return {
      key,
      label: FUNNEL_STAGE_LABEL[key],
      count,
      conversionFromPrevious,
    };
  });
}
