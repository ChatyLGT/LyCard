import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentAdminScope, isMasterN0Scope } from "@/lib/auth";
import { normalizeTagPolarity } from "@/lib/tags";
import { computeAllMatches, type CardTagSet } from "@/lib/janus";

export const dynamic = "force-dynamic";

// Janus (pedido de Gunnar, 2026-09-23) — el motor de emparejamiento
// "todos contra todos" sobre TODA la red, no scopeado a un Programa. Lee
// los tags de cada Card real (nunca isDemo — mismo criterio que la Malla
// real) y muestra el ranking de cruces que produce lib/janus.ts. MasterN0
// -only, mismo patrón de acceso que /admin/demo-data y /admin/equipo.
export default async function JanusPage() {
  const scope = await currentAdminScope();
  if (!scope) redirect("/admin/login");
  if (!isMasterN0Scope(scope)) redirect("/admin");

  const cards = await prisma.card.findMany({
    where: { isDemo: false },
    select: { id: true, name: true, slug: true, tags: { select: { text: true, normalized: true, polarity: true } } },
  });

  const tagSets: CardTagSet[] = cards.map((c) => ({
    cardId: c.id,
    cardName: c.name,
    ofrezco: c.tags.filter((t) => normalizeTagPolarity(t.polarity) === "ofrezco").map((t) => t.normalized),
    busco: c.tags.filter((t) => normalizeTagPolarity(t.polarity) === "busco").map((t) => t.normalized),
  }));
  const slugByCardId = new Map(cards.map((c) => [c.id, c.slug]));
  const matches = computeAllMatches(tagSets);
  const cardsWithTags = tagSets.filter((c) => c.ofrezco.length > 0 || c.busco.length > 0).length;

  return (
    <div style={{ minHeight: "100vh", background: "#131313", color: "#e5e2e1", fontFamily: "'Plus Jakarta Sans',sans-serif", padding: "0 0 60px" }}>
      <div
        style={{
          position: "sticky", top: 0, zIndex: 10, background: "rgba(20,20,20,.96)", borderBottom: "1px solid rgba(200,161,90,.22)",
          // Fix (2026-10-05, reportado por Gunnar): notch/isla dinámica.
          padding: "calc(env(safe-area-inset-top,0px) + 16px) 20px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        }}
      >
        <Link href="/admin" style={{ color: "#C8A15A", font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".18em", textTransform: "uppercase" }}>
          ← Roster
        </Link>
        <h1 style={{ margin: 0, font: "500 18px 'Playfair Display',serif", color: "#F5F2EB" }}>Janus</h1>
        <span />
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
        <p style={{ margin: 0, font: "400 12.5px/1.7 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>
          El motor de emparejamiento <strong>&ldquo;todos contra todos&rdquo;</strong>: cruza lo que cada Card{" "}
          <strong>busca</strong> contra lo que cualquier otra <strong>ofrece</strong>, en toda la red — desde una
          certificación industrial real hasta un sandwich de miga. Cálculo simple por similitud de texto, sin IA
          todavía (ver <code>lib/janus.ts</code>).
        </p>

        <div style={{ display: "flex", gap: 16, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8a8378" }}>
          <span>
            <strong style={{ color: "#C8A15A" }}>{cardsWithTags}</strong> Card{cardsWithTags === 1 ? "" : "s"} con tags
          </span>
          <span>
            <strong style={{ color: "#C8A15A" }}>{matches.length}</strong> cruce{matches.length === 1 ? "" : "s"} encontrado
            {matches.length === 1 ? "" : "s"}
          </span>
        </div>

        {matches.length === 0 ? (
          <p style={{ margin: 0, font: "400 12.5px/1.7 'Plus Jakarta Sans',sans-serif", color: "#8a8378" }}>
            Todavía no hay cruces reales — cargá tags de &ldquo;Ofrezco&rdquo;/&ldquo;Busco&rdquo; desde la Oficina de
            alguna Card para ver algo acá.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {matches.map((m, i) => (
              <div key={`${m.fromCardId}-${m.toCardId}`} style={{ background: "#201f1f", borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ font: "700 13px 'Plus Jakarta Sans',sans-serif", color: "#F5F2EB" }}>
                    {m.fromCardName} <span style={{ color: "#5A5A5A" }}>busca lo que</span> {m.toCardName}{" "}
                    <span style={{ color: "#5A5A5A" }}>ofrece</span>
                  </span>
                  <span style={{ font: "700 13px 'Playfair Display',serif", color: "#E5C378", flex: "none" }}>{Math.round(m.score * 100)}%</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {m.pairs.map((p) => (
                    <span
                      key={`${p.buscoTag}-${p.ofrezcoTag}`}
                      style={{
                        font: "500 10px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5",
                        border: "1px solid rgba(200,161,90,.2)", borderRadius: 999, padding: "3px 9px",
                      }}
                    >
                      {p.buscoTag} → {p.ofrezcoTag} ({Math.round(p.score * 100)}%)
                    </span>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <Link href={`/c/${slugByCardId.get(m.fromCardId)}/oficina`} style={{ font: "600 10px 'Plus Jakarta Sans',sans-serif", color: "#8a8378" }}>
                    Ver {m.fromCardName} →
                  </Link>
                  <Link href={`/c/${slugByCardId.get(m.toCardId)}/oficina`} style={{ font: "600 10px 'Plus Jakarta Sans',sans-serif", color: "#8a8378" }}>
                    Ver {m.toCardName} →
                  </Link>
                  <Link
                    href={`/admin/nashmesh?fromCardId=${m.fromCardId}&fromName=${encodeURIComponent(m.fromCardName)}&toCardId=${m.toCardId}&toName=${encodeURIComponent(m.toCardName)}`}
                    style={{ font: "600 10px 'Plus Jakarta Sans',sans-serif", color: "#C8A15A" }}
                  >
                    Simular reparto →
                  </Link>
                </div>
                {i === 0 && matches.length > 1 && <span style={{ font: "600 8.5px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".14em", textTransform: "uppercase", color: "#6FCF7A" }}>Mejor cruce</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
