import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentAdminScope, isMasterN0Scope } from "@/lib/auth";
import NashMeshSimulator from "@/components/NashMeshSimulator";
import { createNashMeshRunAction } from "./actions";
import type { NashMeshOutput, NashMeshParticipant } from "@/lib/nashMesh";

export const dynamic = "force-dynamic";

// NashMesh (pedido de Gunnar, 2026-09-23) — simulador de reparto,
// MasterN0-only, mismo patrón de acceso que /admin/demo-data y
// /admin/janus. Se llega acá típicamente desde un cruce confirmado de
// Janus (?fromCardId=&fromName=&toCardId=&toName=), pero también se
// puede arrancar en blanco y sumar participantes a mano.
export default async function NashMeshPage({
  searchParams,
}: {
  searchParams: Promise<{ fromCardId?: string; fromName?: string; toCardId?: string; toName?: string }>;
}) {
  const scope = await currentAdminScope();
  if (!scope) redirect("/admin/login");
  if (!isMasterN0Scope(scope)) redirect("/admin");

  const { fromCardId, fromName, toCardId, toName } = await searchParams;
  const prefill: { cardId: string; name: string }[] = [];
  if (fromCardId && fromName) prefill.push({ cardId: fromCardId, name: fromName });
  if (toCardId && toName) prefill.push({ cardId: toCardId, name: toName });

  const [cards, runs] = await Promise.all([
    prisma.card.findMany({ where: { isDemo: false }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.nashMeshRun.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  return (
    <div style={{ minHeight: "100vh", background: "#131313", color: "#e5e2e1", fontFamily: "'Plus Jakarta Sans',sans-serif", padding: "0 0 60px" }}>
      <div
        style={{
          position: "sticky", top: 0, zIndex: 10, background: "rgba(20,20,20,.96)", borderBottom: "1px solid rgba(200,161,90,.22)",
          // Fix (2026-10-05, reportado por Gunnar): notch/isla dinámica.
          padding: "calc(env(safe-area-inset-top,0px) + 16px) 20px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        }}
      >
        <Link href="/admin/janus" style={{ color: "#C8A15A", font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".18em", textTransform: "uppercase" }}>
          ← Janus
        </Link>
        <h1 style={{ margin: 0, font: "500 18px 'Playfair Display',serif", color: "#F5F2EB" }}>NashMesh</h1>
        <span />
      </div>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
        <p style={{ margin: 0, font: "400 12.5px/1.7 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>
          El motor de reparto: <code>Payment = φ × ψ × (1-ε)</code>. Cargás un valor total, quién participó, cuánto
          declaró cada uno haber aportado y su nivel ψ — simula cómo se repartiría. <strong>100% simulación</strong>{" "}
          — cero movimiento de dinero real.
        </p>

        <section style={{ background: "#201f1f", borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <h2 style={{ margin: 0, font: "700 15px 'Plus Jakarta Sans',sans-serif", color: "#F5F2EB" }}>Nueva simulación</h2>
          <NashMeshSimulator cards={cards} prefill={prefill} action={createNashMeshRunAction} />
        </section>

        {runs.length > 0 && (
          <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h2 style={{ margin: 0, font: "700 13px 'Plus Jakarta Sans',sans-serif", color: "#8a8378" }}>Simulaciones anteriores</h2>
            {runs.map((run) => {
              const outputs = run.outputs as unknown as NashMeshOutput[];
              const participants = run.participants as unknown as NashMeshParticipant[];
              return (
                <div key={run.id} style={{ background: "#201f1f", borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ font: "700 12.5px 'Plus Jakarta Sans',sans-serif", color: "#F5F2EB" }}>{run.label}</span>
                    <span style={{ font: "700 8.5px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".12em", textTransform: "uppercase", color: "#E5C378", flex: "none" }}>
                      SIMULACIÓN
                    </span>
                  </div>
                  <span style={{ font: "400 10.5px 'Plus Jakarta Sans',sans-serif", color: "#8a8378" }}>
                    ${run.totalValueUsd.toLocaleString()} · ε {Math.round(run.epsilon * 100)}% · {participants.length} participante{participants.length === 1 ? "" : "s"}
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {outputs.map((o) => (
                      <div key={`${run.id}-${o.name}`} style={{ display: "flex", justifyContent: "space-between", font: "400 11px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>
                        <span>
                          {o.name} <span style={{ color: "#5A5A5A" }}>({Math.round(o.phi * 100)}% × ψ {o.psi})</span>
                        </span>
                        <span style={{ color: "#E5C378", fontWeight: 700 }}>${o.payment.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </div>
    </div>
  );
}
