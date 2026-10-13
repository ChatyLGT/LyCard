import Link from "next/link";
import { redirect } from "next/navigation";
import { currentMember } from "@/lib/memberAuth";
import { prisma } from "@/lib/prisma";
import { sendDirectMessageAction, markMessageReadAction, sendMessageToAdminAction } from "../messages-actions";

export const dynamic = "force-dynamic";

// Mensajería Interna (2026-09-24) -- bandeja + directo 1:1 member-facing.
// Simplificación honesta de M1 (documentada en PLAN.md): se opera sobre
// la PRIMERA membresía del Member, no sobre todas -- la mayoría hoy solo
// tiene una (Legacy, salvo que haya sido referido a más de un Programa).
// Multi-Programa queda para una fase aparte si hace falta.
//
// Viaje del Cliente, Fase 3 (2026-10-13): antes exigía status "active"
// para entrar -- pero el chat real con la Oreja (ver LeadsPanel.tsx)
// pasa justo ANTES de activarse, mientras el Lead sigue "invited". Si
// tiene más de una membresía, prioriza la activa (si la tiene) por
// orden alfabético real de sus 3 valores -- "active" < "interviewed" <
// "invited" -- sin inventar un campo nuevo para esto.
export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; directError?: string; to?: string }>;
}) {
  const member = await currentMember();
  if (!member) redirect("/m/login");

  const { sent, directError } = await searchParams;

  const membership = await prisma.programMembership.findFirst({
    where: { memberId: member.id },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    include: { program: true },
  });
  if (!membership) redirect("/m/dashboard");

  const [teammates, deliveries] = await Promise.all([
    prisma.programMembership.findMany({
      where: { programId: membership.programId, status: "active", memberId: { not: member.id } },
      include: { member: true },
      orderBy: { createdAt: "asc" },
    }),
    // Solo canal "lycard" -- los otros (email/telegram/whatsapp) son
    // intentos de entrega por FUERA de la app, no representan un
    // mensaje "en tu bandeja" acá. Bug real encontrado en el primer
    // E2E: sin este filtro, un mismo mensaje aparecía una vez por cada
    // canal elegido (hasta 4 filas idénticas para un solo mensaje).
    prisma.messageDelivery.findMany({
      where: { recipientMemberId: member.id, channel: "lycard" },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { message: { include: { senderMember: true, senderAdmin: true, program: true } } },
    }),
  ]);

  return (
    <div style={{ minHeight: "100vh", background: "#131313", color: "#e5e2e1", fontFamily: "'Plus Jakarta Sans',sans-serif", padding: "calc(env(safe-area-inset-top,0px) + 40px) 20px 40px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <Link href="/m/dashboard" style={{ color: "#8a8378", font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase" }}>
            ← Mi cuenta
          </Link>
          <h1 style={{ margin: "6px 0 0", font: "500 22px 'Playfair Display',serif", color: "#F5F2EB" }}>Mensajes</h1>
          <span style={{ font: "400 12px 'Plus Jakarta Sans',sans-serif", color: "#8a8378" }}>{membership.program.name}</span>
        </div>

        <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "#9a8f80" }}>
            Tu bandeja
          </span>
          {deliveries.length === 0 && (
            <p style={{ margin: 0, font: "400 12.5px/1.6 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>Sin mensajes todavía.</p>
          )}
          {deliveries.map((d) => {
            const senderAdmin = d.message.senderAdmin;
            // Viaje del Cliente, Fase 3 -- distinguir a la Oreja (role
            // "empleado") de un N0 clásico, en vez del "N0" genérico de
            // siempre -- es a ella a quien le vas a contestar.
            const senderName = d.message.senderMember?.name || (senderAdmin ? (senderAdmin.role === "empleado" ? "Tu Oreja" : "N0") : "Alguien");
            return (
              <div
                key={d.id}
                style={{
                  background: d.readAt ? "#201f1f" : "#26201a",
                  border: d.readAt ? "1px solid transparent" : "1px solid rgba(200,161,90,.35)",
                  borderRadius: 12,
                  padding: 13,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <form action={d.readAt ? undefined : markMessageReadAction.bind(null, d.id)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ font: "700 11px 'Plus Jakarta Sans',sans-serif", color: "#C8A15A" }}>
                    {senderName} {d.message.scope === "masivo" && "· masivo"}
                  </span>
                  {!d.readAt && (
                    <button
                      type="submit"
                      style={{ font: "700 8.5px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", color: "#E5C378", background: "none", border: "none", cursor: "pointer" }}
                    >
                      Marcar leído
                    </button>
                  )}
                </form>
                <p style={{ margin: 0, font: "400 12.5px/1.6 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5", whiteSpace: "pre-wrap" }}>{d.message.body}</p>
                <span style={{ font: "400 9.5px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
                  {new Date(d.createdAt).toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
                {senderAdmin && d.message.scope === "directo" && (
                  <form action={sendMessageToAdminAction.bind(null, membership.programId, senderAdmin.id)} style={{ display: "flex", gap: 6, marginTop: 4 }}>
                    <textarea
                      name="body"
                      placeholder={`Contestarle a ${senderName}...`}
                      rows={1}
                      style={{ flex: 1, background: "#0D0D0D", border: "1px solid rgba(200,161,90,.25)", borderRadius: 8, padding: "7px 10px", color: "#F5F2EB", font: "400 12px 'Plus Jakarta Sans',sans-serif", outline: "none", resize: "vertical" }}
                    />
                    <button type="submit" style={{ alignSelf: "flex-start", padding: "7px 12px", border: "none", borderRadius: 8, background: "#353534", color: "#F5F2EB", font: "700 10px 'Plus Jakarta Sans',sans-serif", cursor: "pointer" }}>
                      Enviar
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </section>

        <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ font: "500 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "#9a8f80" }}>
            Escribirle a alguien de tu equipo
          </span>
          {sent === "1" && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Mensaje enviado.</p>}
          {directError === "empty" && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>Escribí algo antes de mandar.</p>}
          {teammates.length === 0 && (
            <p style={{ margin: 0, font: "400 12.5px/1.6 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
              Todavía no hay nadie más activo en tu Programa.
            </p>
          )}
          {teammates.map((t) => (
            <details key={t.memberId} style={{ background: "#201f1f", borderRadius: 12, padding: 12 }}>
              <summary style={{ cursor: "pointer", font: "700 12px 'Plus Jakarta Sans',sans-serif", color: "#F5F2EB" }}>
                {t.member.name || t.member.whatsapp || "Miembro"}
              </summary>
              <form action={sendDirectMessageAction.bind(null, membership.programId, t.memberId)} style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                <textarea
                  name="body"
                  placeholder="Escribí tu mensaje..."
                  rows={2}
                  style={{ background: "#0D0D0D", border: "1px solid rgba(200,161,90,.25)", borderRadius: 8, padding: "8px 11px", color: "#F5F2EB", font: "400 12px 'Plus Jakarta Sans',sans-serif", outline: "none", resize: "vertical" }}
                />
                <button
                  type="submit"
                  style={{ alignSelf: "flex-start", padding: "7px 14px", border: "none", borderRadius: 8, background: "#353534", color: "#F5F2EB", font: "700 10px 'Plus Jakarta Sans',sans-serif", cursor: "pointer" }}
                >
                  Enviar
                </button>
              </form>
            </details>
          ))}
        </section>
      </div>
    </div>
  );
}
