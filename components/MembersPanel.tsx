import Link from "next/link";
import { ACCESS_DOORS, findAccessDoor } from "@/lib/accessDoors";
import { AccordionSection, AccordionRow, AccordionAddRow } from "@/components/Accordion";
import { addMemberToProgramAction, updateMemberAction, deleteMemberAction, messageMemberAction, markMembershipPaidAction, viewAsMemberAction } from "@/app/admin/programs/members-actions";
import { assignDoorAction } from "@/app/admin/interviews/actions";

const INPUT = {
  background: "#0D0D0D",
  border: "1px solid rgba(200,161,90,.25)",
  borderRadius: 8,
  padding: "8px 11px",
  color: "#F5F2EB",
  font: "400 12px 'Plus Jakarta Sans',sans-serif",
  outline: "none",
} as const;

const SAVE_BTN = {
  padding: 9,
  border: "none",
  borderRadius: 8,
  background: "#353534",
  color: "#F5F2EB",
  font: "700 10px 'Plus Jakarta Sans',sans-serif",
  letterSpacing: ".06em",
  textTransform: "uppercase",
  cursor: "pointer",
} as const;

const DELETE_ICON_BTN = {
  flex: "none",
  width: 28,
  height: 28,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "none",
  borderRadius: 8,
  background: "rgba(229,146,138,.12)",
  color: "#e5928a",
  cursor: "pointer",
} as const;

const PILL = {
  font: "700 10px 'Plus Jakarta Sans',sans-serif",
  color: "#8a8378",
  background: "rgba(255,255,255,.05)",
  borderRadius: 999,
  padding: "3px 9px",
} as const;

const DOOR_ERROR_COPY: Record<string, string> = {
  doorKey: "Elegí una puerta real del menú.",
  paymentModel: "Esa forma de pago no está permitida para la puerta elegida.",
  traidoPor: "Elegí quién trajo al cliente: empresa u oreja.",
  priceAgreedUsd: "El precio tiene que ser un número entero, cero o mayor.",
};

const MEMBER_ERROR_COPY: Record<string, string> = {
  addName: "El nombre es obligatorio.",
  hasCards: "No se puede borrar — ya tiene tarjetas activas con links circulando.",
  messageEmpty: "Completá asunto y mensaje.",
  messageNotConfigured: "Este miembro no tiene email cargado, o el envío de correos no está activado.",
  messageFailed: "No se pudo enviar el mensaje, probá de nuevo.",
  paidRequiresActive: "Solo se puede marcar como pagada una membresía ya activa.",
  viewAsRequiresOwnLogin: "Para entrar como un Miembro necesitás tu propia sesión de Admin (no la del puente Chido→Programa) -- vos ya tenés tu /m/dashboard a un click, sin este atajo.",
};

type Membership = {
  id: string;
  status: string;
  membershipPaidAt: Date | null;
  doorKey: string | null;
  priceAgreedUsd: number | null;
  paymentModel: string | null;
  traidoPor: string | null;
  referredBy: { member: { name: string } } | null;
  member: {
    id: string;
    name: string;
    whatsapp: string | null;
    email: string;
    cards: { kind: string; slug: string }[];
  };
};

// Agregar Miembro + lista de Miembros (2026-10-07) -- extraído de
// app/admin/programs/[id]/page.tsx para reusarse tal cual en el Panel
// de Empleados (app/empleados/page.tsx): mismas acciones de negocio,
// mismo JSX, cero pipeline duplicada. `minimal` (Panel de Empleados)
// oculta Borrar/Editar/Mensaje/"Entrar como" -- herramientas
// administrativas que no hacen falta para vender/gestionar el Viaje
// del Cliente, y que el colaborador no necesita ver.
export default function MembersPanel({
  programId,
  memberships,
  returnTo,
  minimal = false,
  defaultOpen = false,
  memberSaved,
  memberDeleted,
  memberMessaged,
  memberAdded,
  memberError,
  doorAssigned,
  doorError,
}: {
  programId: string;
  memberships: Membership[];
  returnTo: string;
  minimal?: boolean;
  defaultOpen?: boolean;
  memberSaved?: string;
  memberDeleted?: string;
  memberMessaged?: string;
  memberAdded?: string;
  memberError?: string;
  doorAssigned?: string;
  doorError?: string;
}) {
  return (
    <AccordionSection
      title="Miembros"
      meta={<span style={PILL}>{memberships.length}</span>}
      defaultOpen={defaultOpen || Boolean(memberSaved || memberDeleted || memberMessaged || memberError || memberAdded || doorAssigned || doorError)}
    >
      {memberSaved && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Miembro actualizado.</p>}
      {memberDeleted && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Miembro eliminado.</p>}
      {memberMessaged && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Mensaje enviado.</p>}
      {memberAdded && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Miembro agregado -- ya tiene sus 3 tarjetas.</p>}
      {doorAssigned && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Puerta asignada.</p>}
      {doorError && (
        <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>{DOOR_ERROR_COPY[doorError] || "No se pudo asignar la puerta."}</p>
      )}
      {memberError && (
        <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>
          {MEMBER_ERROR_COPY[memberError] || "Algo falló."}
        </p>
      )}

      <AccordionAddRow label="Agregar Miembro" defaultOpen={memberships.length === 0}>
        <form action={addMemberToProgramAction.bind(null, programId, returnTo)} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input name="name" placeholder="Nombre" required style={INPUT} />
          <input name="whatsapp" placeholder="WhatsApp (opcional -- si ya existe, lo suma en vez de duplicar)" style={INPUT} />
          <input name="email" type="email" placeholder="Email (opcional)" style={INPUT} />
          <button type="submit" style={SAVE_BTN}>
            Agregar Miembro
          </button>
        </form>
      </AccordionAddRow>

      {memberships.length === 0 && <p style={{ margin: 0, color: "#5A5A5A", font: "400 12.5px 'Plus Jakarta Sans',sans-serif" }}>Todavía no hay miembros.</p>}
      {memberships.map((m) => {
        const projectCard = m.member.cards.find((c) => c.kind === "project");
        return (
          <AccordionRow
            key={m.id}
            title={m.member.name || "(sin nombre)"}
            subtitle={[m.member.whatsapp, m.member.email].filter(Boolean).join(" · ") || undefined}
            leading={
              <span
                style={{
                  flex: "none",
                  font: "700 9px 'Plus Jakarta Sans',sans-serif",
                  letterSpacing: ".06em",
                  textTransform: "uppercase",
                  color: m.status === "active" ? "#7BC98E" : "#C8A15A",
                  background: m.status === "active" ? "rgba(123,201,142,.12)" : "rgba(200,161,90,.12)",
                  borderRadius: 6,
                  padding: "3px 6px",
                }}
              >
                {m.status === "active" ? "Activo" : "Invitado"}
              </span>
            }
            trailing={
              minimal ? undefined : (
                <form action={deleteMemberAction.bind(null, m.member.id, programId)}>
                  <button type="submit" aria-label="Borrar" style={DELETE_ICON_BTN}>
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>delete</span>
                  </button>
                </form>
              )
            }
          >
            {m.referredBy && (
              <p style={{ margin: 0, font: "400 11.5px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>Referido por: {m.referredBy.member.name}</p>
            )}
            {projectCard && (
              <Link href={`/c/${projectCard.slug}`} style={{ font: "400 11.5px 'Plus Jakarta Sans',sans-serif", color: "#C8A15A" }}>
                /c/{projectCard.slug}
              </Link>
            )}

            {!minimal && m.status === "active" && (
              <form action={viewAsMemberAction.bind(null, m.member.id, programId)}>
                <button
                  type="submit"
                  style={{ background: "none", border: "1px solid rgba(200,161,90,.3)", borderRadius: 999, padding: "6px 12px", color: "#C8A15A", font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".06em", textTransform: "uppercase", cursor: "pointer", width: "fit-content" }}
                >
                  Entrar como este Miembro →
                </button>
              </form>
            )}

            {m.status === "active" && (
              <form action={markMembershipPaidAction.bind(null, m.member.id, programId, returnTo)}>
                <button
                  type="submit"
                  style={{
                    background: m.membershipPaidAt ? "rgba(123,201,142,.12)" : "none",
                    border: `1px solid ${m.membershipPaidAt ? "rgba(123,201,142,.4)" : "rgba(200,161,90,.3)"}`,
                    borderRadius: 999,
                    padding: "6px 12px",
                    color: m.membershipPaidAt ? "#7BC98E" : "#C2BEB5",
                    font: "700 10px 'Plus Jakarta Sans',sans-serif",
                    letterSpacing: ".06em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    width: "fit-content",
                  }}
                >
                  {m.membershipPaidAt ? "✓ Pagada -- marcar como no pagada" : "Marcar como pagada"}
                </button>
              </form>
            )}

            {m.status === "active" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 6, borderTop: "1px solid rgba(255,255,255,.06)" }}>
                <span style={{ font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".06em", textTransform: "uppercase", color: "#5A5A5A" }}>Puerta de acceso</span>
                {m.doorKey ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", color: "#7BC98E" }}>
                      ✓ {findAccessDoor(m.doorKey)?.nombre || m.doorKey}
                    </span>
                    <span style={{ font: "400 11.5px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>
                      ${m.priceAgreedUsd} -- {m.paymentModel} -- traído por {m.traidoPor}
                    </span>
                  </div>
                ) : (
                  <form action={assignDoorAction.bind(null, m.id, programId, returnTo)} style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
                    <select name="doorKey" defaultValue="" required style={{ ...INPUT, flex: "1 1 220px" }}>
                      <option value="" disabled>
                        Elegí la puerta...
                      </option>
                      {ACCESS_DOORS.map((d) => (
                        <option key={d.key} value={d.key}>
                          {d.nombre} -- {d.tiempo}
                        </option>
                      ))}
                    </select>
                    <input name="priceAgreedUsd" type="number" min={0} step={1} placeholder="Precio USD" required style={{ ...INPUT, width: 110 }} />
                    <select name="paymentModel" defaultValue="unico" style={INPUT}>
                      <option value="unico">Pago único</option>
                      <option value="cuotas">Cuotas</option>
                      <option value="suscripcion">Suscripción</option>
                      <option value="bolsa_horas">Bolsa de horas</option>
                      <option value="abono_ascenso">Abono de ascenso</option>
                      <option value="retainer">Retainer</option>
                      <option value="participacion">Participación en resultados</option>
                    </select>
                    <select name="traidoPor" defaultValue="empresa" style={INPUT}>
                      <option value="empresa">Traído por la empresa</option>
                      <option value="oreja">Traído por la oreja</option>
                    </select>
                    <button type="submit" style={SAVE_BTN}>
                      Asignar puerta
                    </button>
                  </form>
                )}
              </div>
            )}

            {!minimal && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".06em", textTransform: "uppercase", color: "#5A5A5A" }}>Editar</span>
                <form action={updateMemberAction.bind(null, m.member.id, programId)} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <input name="name" defaultValue={m.member.name} placeholder="Nombre" style={INPUT} />
                  <input name="whatsapp" defaultValue={m.member.whatsapp || ""} placeholder="WhatsApp" style={INPUT} />
                  <input name="email" type="email" defaultValue={m.member.email} placeholder="Email" style={INPUT} />
                  <button type="submit" style={SAVE_BTN}>
                    Guardar
                  </button>
                </form>
              </div>
            )}

            {!minimal && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 6, borderTop: "1px solid rgba(255,255,255,.06)" }}>
                <span style={{ font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".06em", textTransform: "uppercase", color: "#5A5A5A" }}>Mensaje</span>
                <form action={messageMemberAction.bind(null, m.member.id, programId)} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <input name="subject" placeholder="Asunto" style={INPUT} />
                  <textarea name="message" placeholder="Mensaje" rows={3} style={{ ...INPUT, resize: "vertical" }} />
                  <button type="submit" style={SAVE_BTN}>
                    Enviar
                  </button>
                </form>
              </div>
            )}
          </AccordionRow>
        );
      })}
    </AccordionSection>
  );
}
