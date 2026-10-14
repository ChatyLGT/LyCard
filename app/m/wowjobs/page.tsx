import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCardHost } from "@/lib/cardHost";
import { currentMemberId } from "@/lib/memberAuth";
import { wowJobsFor } from "@/lib/wowJobs";

export const dynamic = "force-dynamic";

// WowJobs (2026-10-13): los puestos que ejercés dentro del Programa. Vive en la
// Oficina Virtual, igual que WowHead, y se llega desde ahí. Hoy el único es
// Oreja; cada WowJob lo asigna el N0 del Programa o el MasterN0.
export default async function WowJobsPage({ searchParams }: { searchParams: Promise<{ cardId?: string }> }) {
  const { cardId } = await searchParams;
  if (!cardId) return null;
  const card = await requireCardHost(cardId);

  const memberId = card.memberId ?? (await currentMemberId());
  const staff = memberId ? await prisma.admin.findUnique({ where: { memberId }, select: { role: true, programId: true } }) : null;
  const jobs = wowJobsFor(staff);

  return (
    <div style={{ minHeight: "100vh", background: "#0B0B0A", color: "#F5F2EB", fontFamily: "'Plus Jakarta Sans',sans-serif", padding: "28px 20px 60px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
        <Link href={`/c/${card.slug}/oficina`} style={{ font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#C8A15A", textDecoration: "none" }}>
          ← Volver a tu Oficina
        </Link>
        <div>
          <span style={{ font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".24em", textTransform: "uppercase", color: "#C8A15A" }}>Oficina Virtual</span>
          <h1 style={{ margin: 0, font: "500 24px 'Playfair Display',serif" }}>WowJobs</h1>
          <p style={{ margin: "6px 0 0", font: "400 13px/1.5 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>
            Los puestos que ejercés dentro del Programa. Un WowHead trabaja para vos; un WowJob lo hacés vos para el Programa.
          </p>
        </div>

        {jobs.length === 0 ? (
          <div data-testid="wowjobs-vacio" style={{ background: "#201f1f", borderRadius: 14, padding: 16, font: "400 13px/1.5 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>
            Todavía no tenés ningún WowJob. Lo asigna el N0 de tu Programa o el MasterN0. Cuando te asignen uno, aparece acá.
          </div>
        ) : (
          jobs.map((j) => (
            <Link
              key={j.key}
              href={j.href}
              data-testid={`wowjob-${j.key}`}
              style={{ display: "flex", flexDirection: "column", gap: 4, padding: "14px 16px", borderRadius: 14, border: "1px solid rgba(200,161,90,.35)", background: "rgba(200,161,90,.06)", textDecoration: "none" }}
            >
              <span style={{ font: "700 14px 'Plus Jakarta Sans',sans-serif", color: "#E5C378" }}>{j.nombre} →</span>
              <span style={{ font: "400 12px/1.5 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>{j.resumen}</span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
