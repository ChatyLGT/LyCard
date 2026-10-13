import { AccordionSection } from "@/components/Accordion";
import {
  claimLeadAction,
  completeInterviewAction,
  markMasterclassAttendedAction,
  scheduleInterviewAction,
  sendOrejaMessageAction,
} from "@/app/admin/interviews/actions";
import { masterclassStatus, parseMasterclassLog, MASTERCLASS_STATUS_LABEL, type MasterclassStatus } from "@/lib/masterclassStatus";
import type { ChatThreadMessage } from "@/lib/chatThreads";

// Viaje del Cliente, Fase 2 -- <input type="datetime-local"> necesita
// "YYYY-MM-DDTHH:mm" en hora local, sin librería nueva.
function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const interviewDateFmt = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

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

const DATETIME_INPUT = {
  background: "#1a1919",
  border: "1px solid rgba(255,255,255,.1)",
  borderRadius: 8,
  padding: "6px 8px",
  color: "#F5F2EB",
  font: "400 11px 'Plus Jakarta Sans',sans-serif",
};

const CHAT_TEXTAREA = {
  background: "#0D0D0D",
  border: "1px solid rgba(200,161,90,.25)",
  borderRadius: 8,
  padding: "8px 11px",
  color: "#F5F2EB",
  font: "400 12px 'Plus Jakarta Sans',sans-serif",
  outline: "none",
  resize: "vertical" as const,
};

const chatMsgFmt = new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

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
  membership: { id: string; memberId: string; status: string; nextInterviewAt: Date | null } | null;
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
  interviewScheduled,
  interviewError,
  chatThreadsByMemberId,
  chatSent,
  chatError,
}: {
  programId: string;
  leads: Lead[];
  myAdminId: string;
  returnTo: string;
  leadClaimed?: string;
  masterclassAttended?: string;
  interviewScheduled?: string;
  interviewError?: string;
  chatThreadsByMemberId: Map<string, ChatThreadMessage[]>;
  chatSent?: string;
  chatError?: string;
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

        {/* Viaje del Cliente, Fase 2 -- agendar la entrevista 1:1 de Legacy
            a mano, directo con el Lead ya asistido. Nunca en la tarjeta
            pública (ahí solo se agenda la Masterclass). Necesita una
            Membership real debajo (la crea registerInterviewAction si el
            Lead se registró logueado como Member). */}
        {status === "asistio" && l.membership && l.membership.status !== "active" && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
            {l.membership.nextInterviewAt && (
              <span style={{ font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#C8A15A" }}>
                📅 Entrevista: {interviewDateFmt.format(l.membership.nextInterviewAt)}
              </span>
            )}
            <form action={scheduleInterviewAction.bind(null, l.membership.id, programId, returnTo)} style={{ display: "flex", gap: 6 }}>
              <input
                type="datetime-local"
                name="nextInterviewAt"
                defaultValue={l.membership.nextInterviewAt ? toDatetimeLocalValue(l.membership.nextInterviewAt) : undefined}
                style={DATETIME_INPUT}
                required
              />
              <button type="submit" style={INTERVIEW_BTN}>
                {l.membership.nextInterviewAt ? "Reagendar" : "Agendar entrevista"}
              </button>
            </form>
          </div>
        )}

        {/* Viaje del Cliente, Fase 3 -- chat interno real, directo con
            ESTE Lead (canal "lycard", el mismo que ya existía para
            Member↔Member). Mismo gate que el resto de esta tarjeta --
            necesita la Membership real que crea registerInterviewAction
            cuando el Lead se registra logueado. */}
        {l.membership && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,.06)" }}>
            <span style={{ font: "700 9.5px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".06em", textTransform: "uppercase", color: "#5A5A5A" }}>
              Chat con {l.name}
            </span>
            {(chatThreadsByMemberId.get(l.membership.memberId) ?? []).map((m) => (
              <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: m.fromAdmin ? "flex-end" : "flex-start" }}>
                <div
                  style={{
                    maxWidth: "80%",
                    background: m.fromAdmin ? "rgba(200,161,90,.14)" : "#201f1f",
                    borderRadius: 10,
                    padding: "6px 10px",
                    font: "400 12px/1.4 'Plus Jakarta Sans',sans-serif",
                    color: "#F5F2EB",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {m.body}
                </div>
                <span style={{ font: "400 9px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>{chatMsgFmt.format(m.createdAt)}</span>
              </div>
            ))}
            <form action={sendOrejaMessageAction.bind(null, l.membership.id, programId, returnTo)} style={{ display: "flex", gap: 6 }}>
              <textarea name="body" placeholder="Escribile al Lead..." rows={1} style={{ ...CHAT_TEXTAREA, flex: 1 }} />
              <button type="submit" style={INTERVIEW_BTN}>
                Enviar
              </button>
            </form>
          </div>
        )}
      </div>
    );
  };

  return (
    <AccordionSection title="Bolsa de Leads" meta={<span style={PILL}>{bolsa.length + mios.length}</span>} defaultOpen>
      {leadClaimed && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Lead tomado -- ya es tuyo.</p>}
      {masterclassAttended && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Asistencia marcada.</p>}
      {interviewScheduled && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Entrevista agendada.</p>}
      {interviewError && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>Elegí una fecha y hora válidas.</p>}
      {chatSent && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Mensaje enviado.</p>}
      {chatError && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>Escribí algo antes de mandar.</p>}

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
