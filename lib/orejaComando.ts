// Pestaña "Comando" del Óculo de la Oreja (2026-10-13): un resumen honesto
// de lo que YA existe -- leads, entrevistas, clientes y comisiones de esta
// Oreja. Todo se cuenta de filas reales; nada se proyecta ni se estima.
export type ComandoLead = {
  claimedByAdminId: string | null;
  membership: { nextInterviewAt: Date | null } | null;
};

export type ComandoMembership = {
  status: string;
  soldByAdminId: string | null;
  membershipPaidAt: Date | null;
  totalCommissionsUsd: number;
};

export type ComandoSummary = {
  leadsLibres: number;
  misLeads: number;
  entrevistasAgendadas: number;
  clientesCerrados: number;
  clientesPagados: number;
  comisionesUsd: number;
};

export function buildComando(myAdminId: string, leads: ComandoLead[], memberships: ComandoMembership[]): ComandoSummary {
  const mine = leads.filter((l) => l.claimedByAdminId === myAdminId);
  const sold = memberships.filter((m) => m.soldByAdminId === myAdminId);
  return {
    leadsLibres: leads.filter((l) => !l.claimedByAdminId).length,
    misLeads: mine.length,
    entrevistasAgendadas: mine.filter((l) => l.membership?.nextInterviewAt != null).length,
    clientesCerrados: sold.filter((m) => m.status === "active").length,
    clientesPagados: sold.filter((m) => m.membershipPaidAt != null).length,
    comisionesUsd: sold.reduce((sum, m) => sum + m.totalCommissionsUsd, 0),
  };
}
