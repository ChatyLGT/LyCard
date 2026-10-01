import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { currentAdminScope } from "@/lib/auth";
import { currentMemberId } from "@/lib/memberAuth";
import { parseRango, RANGO_LABEL } from "@/lib/expertos";
import { buildMemberFractalGraph } from "@/lib/mallaReal";
import MallaGraph from "@/components/MallaGraph";
import { enviarInvitacionEquipoAction, responderInvitacionEquipoAction } from "./actions";

export const dynamic = "force-dynamic";

const PANEL = { padding: 14, borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(200,161,90,.18)" };
const KICKER = { font: "600 8.5px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".16em", textTransform: "uppercase", color: "#756c5e" };
const INPUT = { background: "#0D0D0D", border: "1px solid rgba(200,161,90,.25)", borderRadius: 8, padding: "10px 12px", color: "#F5F2EB", font: "400 13px 'Plus Jakarta Sans',sans-serif", outline: "none" };
const BTN = { padding: 12, border: "none", borderRadius: 8, background: "#C8A15A", color: "#0D0D0D", font: "700 11px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".06em", textTransform: "uppercase", cursor: "pointer" };

const ERROR_COPY: Record<string, string> = {
  noExperto: "Todavía no sos Experto -- MasterN0 tiene que aprobarte primero.",
  empty: "Escribí la clave del especialista que querés invitar.",
  notFound: "No existe ningún Legacy publicado con esa clave.",
  self: "No podés reclutarte a vos mismo.",
  yaReclutado: "Ese Legacy ya es parte de otro equipo.",
};

// mi-equipo (Fase 6, WowHead, 2026-10-01) -- el panel del propio
// Experto: organigrama real (Cerebro Malla aplicado a reclutamiento,
// mismo componente que ya usa el resto de la Malla), invitar
// especialistas, y responder las invitaciones que este Legacy recibió
// de OTROS Expertos. Visible para cualquier Legacy publicado (no solo
// Expertos) porque cualquiera puede recibir una invitación.
export default async function MiEquipoPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string; invitacionEnviada?: string; invitacionRespondida?: string }>;
}) {
  const { slug } = await params;
  const { error, invitacionEnviada, invitacionRespondida } = await searchParams;
  const card = await prisma.card.findUnique({ where: { slug } });
  if (!card) notFound();

  const [adminScope, memberId] = await Promise.all([currentAdminScope(), currentMemberId()]);
  const isAdmin = adminScope !== null;
  const isHost = isAdmin || card.isOrigin || (memberId !== null && memberId === card.memberId);
  if (!isHost) redirect(`/c/${slug}/oficina`);

  if (!card.memberId) redirect(`/c/${slug}/oficina`);
  const experto = await prisma.experto.findUnique({
    where: { memberId: card.memberId },
    include: {
      equipo: { orderBy: { createdAt: "asc" } },
      invitacionesEnviadas: { include: { especialista: true }, orderBy: { createdAt: "desc" } },
      invitacionesRecibidas: { where: { estado: "pendiente" }, include: { experto: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!experto) redirect(`/c/${slug}/oficina`);

  const rango = parseRango(experto.rango);
  const mallaGraph =
    rango === "experto"
      ? buildMemberFractalGraph(
          `experto-${experto.id}`,
          experto.nombrePublico,
          experto.equipo.map((e) => ({ membershipId: e.id, name: e.nombrePublico, status: "active", referredByMembershipId: null }))
        )
      : null;

  return (
    <div style={{ minHeight: "100vh", background: "#0B0B0A", color: "#F5F2EB", fontFamily: "'Plus Jakarta Sans',sans-serif", padding: "24px 20px 60px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
        <Link href={`/c/${slug}/oficina`} style={{ font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "#C8A15A", textDecoration: "none" }}>
          ← Volver a tu Oficina
        </Link>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <h1 style={{ margin: 0, font: "700 24px 'Playfair Display',serif" }}>Mi Equipo</h1>
          <span style={{ font: "700 9px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "#C8A15A" }}>
            {experto.nombrePublico} · {RANGO_LABEL[rango]}
          </span>
        </div>

        {error && ERROR_COPY[error] && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>{ERROR_COPY[error]}</p>}
        {invitacionEnviada === "1" && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Invitación enviada -- queda pendiente hasta que la acepte.</p>}
        {invitacionRespondida === "1" && <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Respondida.</p>}

        {/* Invitaciones recibidas -- cualquier Legacy publicado puede recibir una, sea Experto o no */}
        {experto.invitacionesRecibidas.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <span style={KICKER}>Invitaciones recibidas</span>
            {experto.invitacionesRecibidas.map((inv) => (
              <div key={inv.id} style={PANEL}>
                <p style={{ margin: "0 0 10px", font: "400 12.5px/1.6 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>
                  <strong style={{ color: "#F5F2EB" }}>{inv.experto.nombrePublico}</strong> te invitó a sumarte a su equipo.
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <form action={responderInvitacionEquipoAction.bind(null, inv.id)}>
                    <input type="hidden" name="respuesta" value="aceptar" />
                    <button type="submit" style={BTN}>Aceptar</button>
                  </form>
                  <form action={responderInvitacionEquipoAction.bind(null, inv.id)}>
                    <input type="hidden" name="respuesta" value="rechazar" />
                    <button type="submit" style={{ ...BTN, background: "rgba(255,255,255,.06)", color: "#C2BEB5" }}>Rechazar</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}

        {rango === "experto" ? (
          <>
            <div style={{ height: 1, background: "rgba(200,161,90,.14)" }} />

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span style={KICKER}>Tu organigrama ({experto.equipo.length})</span>
              {experto.equipo.length === 0 ? (
                <p style={{ margin: 0, font: "400 12px/1.6 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>Todavía no reclutaste a nadie.</p>
              ) : (
                mallaGraph && <MallaGraph nodes={mallaGraph.nodes} edges={mallaGraph.edges} ghosts={mallaGraph.ghosts} height={230} camRadius={140} maxRadius={340} repel={160} linkRest={32} fog={0.01} />
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span style={KICKER}>Invitar a un especialista</span>
              <form action={enviarInvitacionEquipoAction.bind(null, experto.id)} style={{ display: "flex", gap: 8 }}>
                <input name="especialistaKey" placeholder="Clave del Legacy a invitar" style={{ ...INPUT, flex: 1, minWidth: 0 }} />
                <button type="submit" style={BTN}>Invitar</button>
              </form>
            </div>

            {experto.invitacionesEnviadas.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <span style={KICKER}>Invitaciones enviadas</span>
                {experto.invitacionesEnviadas.map((inv) => (
                  <div key={inv.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)" }}>
                    <span style={{ font: "600 12px 'Plus Jakarta Sans',sans-serif", color: "#F5F2EB" }}>{inv.especialista.nombrePublico}</span>
                    <span
                      style={{
                        font: "700 9px 'Plus Jakarta Sans',sans-serif",
                        letterSpacing: ".06em",
                        textTransform: "uppercase",
                        color: inv.estado === "aceptada" ? "#8fd19e" : inv.estado === "rechazada" ? "#e5928a" : "#E5C378",
                      }}
                    >
                      {inv.estado}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <p style={{ margin: 0, font: "400 12px/1.6 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
            Todavía sos Especialista -- cuando MasterN0 te ascienda a Experto, vas a poder armar tu propio equipo acá.
          </p>
        )}
      </div>
    </div>
  );
}
