import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentEmployeeScope } from "@/lib/auth";
import { employeeLogoutAction } from "@/app/empleados/actions";
import MembersPanel from "@/components/MembersPanel";
import LeadsPanel from "@/components/LeadsPanel";
import { groupThreadsByMemberId } from "@/lib/chatThreads";

export const dynamic = "force-dynamic";

// Panel de Empleados (2026-10-07) -- pantalla propia, mínima: un
// colaborador entrenado ve SOLO lo que necesita para vender/gestionar
// el Viaje del Cliente (Agregar Miembro, puerta de acceso, marcar
// pagada). Nada de Categorización/Modales/Superpoderes/Skins/
// Mensajería/Embudo/ajustes del Programa/otros Admins -- ese es el
// dashboard completo de /admin/programs/[id], un sistema aparte.
export default async function EmployeePanelPage({
  searchParams,
}: {
  searchParams: Promise<{
    memberAdded?: string;
    memberError?: string;
    doorAssigned?: string;
    doorError?: string;
    sessionLogged?: string;
    sessionError?: string;
    leadClaimed?: string;
    masterclassAttended?: string;
    interviewScheduled?: string;
    interviewError?: string;
    chatSent?: string;
    chatError?: string;
  }>;
}) {
  const {
    memberAdded,
    memberError,
    doorAssigned,
    doorError,
    sessionLogged,
    sessionError,
    leadClaimed,
    masterclassAttended,
    interviewScheduled,
    interviewError,
    chatSent,
    chatError,
  } = await searchParams;

  const scope = await currentEmployeeScope();
  if (!scope) redirect("/empleados/login");

  const program = await prisma.program.findUnique({
    where: { id: scope.programId },
    select: {
      id: true,
      name: true,
      memberships: {
        orderBy: { createdAt: "desc" },
        include: { member: { include: { cards: true } }, referredBy: { include: { member: true } } },
      },
    },
  });
  if (!program) redirect("/empleados/login");

  // Bolsa de Leads (2026-10-12) -- Registrations de este Programa que
  // todavía no se convirtieron en Miembro activo (los que ya activaron
  // viven en MembersPanel, no acá).
  const registrations = await prisma.registration.findMany({
    where: { card: { programId: program.id } },
    orderBy: { createdAt: "asc" },
    include: { membership: { select: { id: true, memberId: true, status: true, nextInterviewAt: true } }, interviewSlot: { select: { date: true } } },
  });
  const leads = registrations.filter((r) => r.membership?.status !== "active");

  // Viaje del Cliente, Fase 3 (2026-10-13) -- chat interno real con cada
  // Lead, uno por Member. Solo canal "lycard" y scope "directo" (nunca un
  // masivo que esta misma Oreja haya mandado a todo el Programa).
  const myMessageDeliveries = await prisma.messageDelivery.findMany({
    where: {
      channel: "lycard",
      message: { scope: "directo" },
      OR: [{ recipientAdminId: scope.id }, { message: { senderAdminId: scope.id } }],
    },
    select: {
      recipientMemberId: true,
      message: { select: { id: true, body: true, createdAt: true, senderMemberId: true, senderAdminId: true } },
    },
  });
  const chatThreadsByMemberId = groupThreadsByMemberId(myMessageDeliveries);

  const returnTo = "/empleados";

  return (
    <div style={{ minHeight: "100vh", background: "#131313", color: "#e5e2e1", fontFamily: "'Plus Jakarta Sans',sans-serif", padding: "0 0 60px" }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "rgba(20,20,20,.96)",
          borderBottom: "1px solid rgba(200,161,90,.22)",
          padding: "calc(env(safe-area-inset-top,0px) + 16px) 20px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <span style={{ color: "#C8A15A", font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".18em", textTransform: "uppercase" }}>
          Empleado · {program.name}
        </span>
        <h1 style={{ margin: 0, font: "500 18px 'Playfair Display',serif", color: "#F5F2EB" }}>Panel de Empleados</h1>
        <form action={employeeLogoutAction}>
          <button
            type="submit"
            style={{ background: "none", border: "1px solid rgba(200,161,90,.3)", borderRadius: 999, padding: "8px 14px", color: "#C2BEB5", font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", cursor: "pointer" }}
          >
            Cerrar sesión
          </button>
        </form>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        <LeadsPanel
          programId={program.id}
          leads={leads}
          myAdminId={scope.id}
          returnTo={returnTo}
          leadClaimed={leadClaimed}
          masterclassAttended={masterclassAttended}
          interviewScheduled={interviewScheduled}
          interviewError={interviewError}
          chatThreadsByMemberId={chatThreadsByMemberId}
          chatSent={chatSent}
          chatError={chatError}
        />
        <MembersPanel
          programId={program.id}
          memberships={program.memberships}
          returnTo={returnTo}
          minimal
          defaultOpen
          memberAdded={memberAdded}
          memberError={memberError}
          doorAssigned={doorAssigned}
          doorError={doorError}
          sessionLogged={sessionLogged}
          sessionError={sessionError}
        />
      </div>
    </div>
  );
}
