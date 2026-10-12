import { AccordionSection } from "@/components/Accordion";
import { claimLeadAction, completeInterviewAction, markMasterclassAttendedAction } from "@/app/admin/interviews/actions";
import { masterclassStatus, parseMasterclassLog, MASTERCLASS_STATUS_LABEL, type MasterclassStatus } from "@/lib/masterclassStatus";

const PILL = {
  font: "700 10px 'Plus Jakarta Sans',sans-serif",
  color: "#8a8378",
  background: "rgba(255,255,255,.05)",
  borderRadius: 999,
  padding: "3px 9px",
} as const;

const STATUS_COLOR: Record<MasterclassStatus, { fg: string; bg: string }> = {
  verde: { fg: "#7BC98E", bg: "rgba(123,201,142,.12)" },
  amarillo: { fg: "#C8A15A", bg: "rgba(200,161,90,.12)" },
  rojo: { fg: "#e5928a", bg: "rgba(229,146,138,.12)" },
  asistio: { fg: "#7fb3d5", bg: "rgba(127,179,213,.12)" },
};

const TAKE_BTN = {
  background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)",
  border: "none",
  borderRadius: 999,
  padding: "7px 14px",
  color: "#0D0D0D",
  font: "700 10px 'Plus Jakarta Sans',sans-serif",
  letterSpacing: ".06em",
  textTransform: "uppercase" as const,
  cursor: "pointer",
};

const INTERVIEW_BTN = {
  background: "none",
  border: "1px solid rgba(200,161,90,.3)",
  borderRadius: 999,
  padding: "7px 14px",
  color: "#C8A15A",
  font: "700 10px 'Plus Jakarta Sans',sans-serif",
  letterSpacing: ".06em",
  textTransform: "uppercase" as const,
  cursor: "pointer",
};

type Lead = {
  id: string;
  name: string;
  whatsapp: string;
  email: string;
  slotLabel: string;
  attendedAt: Date | null;
  masterclassLog: unknown;
  interviewSlot: { date: Date } | null;
  claimedByAdminId: string | null;
  membership: { status: string } | null;
};

// Bolsa de Leads (2026-10-12) -- punto "gettable" del mockup "Óculo de
// la Oreja": cualquier Oreja del Programa puede tomar un Registration
// sin dueño (lib/masterclassStatus.ts calcula el color real, por
// asistencia a la Masterclass -- nada de un score de IA inventado).
// Una vez tomado, pasa a "Mis Leads" de quien lo tomó y sale de la
// bolsa compartida. Solo leads que todavía no se convirtieron en
// Miembro activo -- esos ya viven en MembersPanel.
export default function LeadsPanel({
  programId,
  leads,
  myAdminId,
  returnTo,
  leadClaimed,
  masterclassAttended,
}: {
  programId: string;
  leads: Lead[];
  myAdminId: string;
  returnTo: string;
  leadClaimed?: string;
  masterclassAttended?: string;
}) {
  const bolsa = leads.filter((l) => !l.claimedByAdminId);
  const mios = leads.filter((l) => l.claimedByAdminId === myAdminId);
  const now = new Date();

  const leadRow = (l: Lead) => {
    const status = masterclassStatus(
      { attendedAt: l.attendedAt, masterclassLog: parseMasterclassLog(l.masterclassLog), slotDate: l.interviewSlot?.date ?? null },
      now
    );
    const color = STATUS_COLOR[status];
    return (
      <div key={l.id} style={{ background: "#151414", borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <span style={{ font: "700 13px 'Plus Jakarta Sans',sans-serif", color: "#F5F2EB" }}>{l.name}</span>
          <span
            style={{
              font: "700 9px 'Plus Jakarta Sans',sans-serif",
              letterSpacing: ".06em",
              textTransform: "uppercase",
              color: color.fg,
              background: color.bg,
              borderRadius: 6,
              padding: "3px 6px",
            }}
          >
            {MASTERCLASS_STATUS_LABEL[status]}
          </span>
        </div>
        <span style={{ font: "400 11.5px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>
          {l.whatsapp} -- {l.slotLabel}
        </span>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {!l.claimedByAdminId && (
            <form action={claimLeadAction.bind(null, l.id, programId, returnTo)}>
              <button type="submit" style={TAKE_BTN}>
                Tomar lead
              </button>
            </form>
          )}
          {status !== "asistio" && (
            <form action={markMasterclassAttendedAction.bind(null, l.id, programId, returnTo)}>
              <button type="submit" style={INTERVIEW_BTN}>
                Marcar asistió
              </button>
            </form>
          )}
          {status === "asistio" && l.membership && l.membership.status !== "active" && (
            <form action={completeInterviewAction.bind(null, l.id, returnTo)}>
              <button type="submit" style={INTERVIEW_BTN}>
                Marcar entrevista hecha
              </button>
            </form>
          )}
        </div>
      </div>
    );
  };

  return (
    <AccordionSection title="Bolsa de Leads" meta={<span style={PILL}>{bolsa.length + mios.length}</span>} defaultOpen>
      {leadClaimed && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Lead tomado -- ya es tuyo.</p>}
      {masterclassAttended && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Asistencia marcada.</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".06em", textTransform: "uppercase", color: "#5A5A5A" }}>
          Sin reclamar ({bolsa.length})
        </span>
        {bolsa.length === 0 && <p style={{ margin: 0, color: "#5A5A5A", font: "400 12.5px 'Plus Jakarta Sans',sans-serif" }}>No hay leads sueltos ahora.</p>}
        {bolsa.map(leadRow)}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".06em", textTransform: "uppercase", color: "#C8A15A" }}>
          Mis leads ({mios.length})
        </span>
        {mios.length === 0 && <p style={{ margin: 0, color: "#5A5A5A", font: "400 12.5px 'Plus Jakarta Sans',sans-serif" }}>Todavía no tomaste ningún lead.</p>}
        {mios.map(leadRow)}
      </div>
    </AccordionSection>
  );
}
