// Viaje del Cliente, Fase 4 (2026-10-13) -- comisiones reales sobre
// ProgramMembership.traidoPor ("define el costo humano real", comentario
// que llevaba semanas sin cablearse). Montos que dio Gunnar de memoria:
// $15 USD por sesión de 45min si la Oreja fue asignada al Lead, $35 si
// ella misma lo trajo; $5 o $12 USD mensuales (misma distinción) por la
// vida de una suscripción de $100/mes, a cambio de las 15min de revisión
// de indicadores de estrés. Puro -- sin DB, 100% testeable. El llamador
// (logSessionAction) es quien decide CUÁNDO corresponde cobrar esto;
// esta función solo calcula el monto, nunca mueve plata real -- cálculo,
// no pasarela de pago.
export const COMMISSION_RATES_USD = {
  oreja: { session: 35, suscripcion: 12 },
  empresa: { session: 15, suscripcion: 5 },
} as const;

export function calculateCommissionUsd(traidoPor: string | null, paymentModel: string | null): number {
  if (traidoPor !== "oreja" && traidoPor !== "empresa") return 0; // todavía no se asignó puerta -- nada que calcular
  const rates = COMMISSION_RATES_USD[traidoPor];
  return paymentModel === "suscripcion" ? rates.suscripcion : rates.session;
}
