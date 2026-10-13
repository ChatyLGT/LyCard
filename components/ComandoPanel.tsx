import { AccordionSection } from "@/components/Accordion";
import type { ComandoSummary } from "@/lib/orejaComando";

// Pestaña "Comando" del Óculo de la Oreja (2026-10-13). Solo lectura: cuenta
// filas reales de esta Oreja. No es una billetera ni hay cobro real -- las
// comisiones son el acumulado calculado por lib/commissions.ts.
export default function ComandoPanel({ summary }: { summary: ComandoSummary }) {
  const tiles: { testId: string; label: string; value: string }[] = [
    { testId: "comando-comisiones", label: "Comisiones acumuladas", value: `$${summary.comisionesUsd} USD` },
    { testId: "comando-libres", label: "Leads libres en la bolsa", value: String(summary.leadsLibres) },
    { testId: "comando-mis-leads", label: "Mis leads", value: String(summary.misLeads) },
    { testId: "comando-entrevistas", label: "Entrevistas agendadas", value: String(summary.entrevistasAgendadas) },
    { testId: "comando-cerrados", label: "Clientes cerrados", value: String(summary.clientesCerrados) },
    { testId: "comando-pagados", label: "Clientes pagados", value: String(summary.clientesPagados) },
  ];
  return (
    <AccordionSection title="Comando" defaultOpen>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {tiles.map((t) => (
          <div key={t.testId} data-testid={t.testId} style={{ background: "#201f1f", borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ font: "500 20px 'Playfair Display',serif", color: "#F5F2EB" }}>{t.value}</span>
            <span style={{ font: "600 9.5px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "#9a8f80" }}>{t.label}</span>
          </div>
        ))}
      </div>
      <p style={{ margin: "8px 0 0", font: "400 11px 'Plus Jakarta Sans',sans-serif", color: "#8a8378" }}>
        Datos reales de tu actividad. Las comisiones son un acumulado calculado, no un pago.
      </p>
    </AccordionSection>
  );
}
