import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCardHost } from "@/lib/cardHost";
import { simulatedRating, simulatedReviewCount } from "@/lib/wowApps";
import { canPublishExperto, parseRango, RANGO_LABEL } from "@/lib/expertos";

export const dynamic = "force-dynamic";

const PANEL = { padding: 14, borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(200,161,90,.18)" };
const KICKER = { font: "600 8.5px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".16em", textTransform: "uppercase", color: "#756c5e" };

// Perfil de un Agente Legacy en WowHead (Fase 6) -- CV (experiencia,
// especialidades), reputación simulada, y -- solo si es Experto -- su
// equipo reclutado. Contratar/consultar de verdad sigue pasando por
// /experto/[key] (Fase 5, sin cambios) -- esta pantalla es el
// escaparate de WowHead, no reemplaza el flujo de consulta.
export default async function LegacyProfilePage({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: Promise<{ cardId?: string }> }) {
  const { key } = await params;
  const { cardId } = await searchParams;
  if (!cardId) return null;
  await requireCardHost(cardId);

  const experto = await prisma.experto.findUnique({
    where: { key },
    include: { equipo: { orderBy: { createdAt: "asc" } } },
  });
  if (!experto || !canPublishExperto(experto)) notFound();

  const rango = parseRango(experto.rango);
  const experiencia = experto.experiencia as { rol: string; periodo: string; descripcion: string }[];
  const especialidades = experto.especialidades as string[];

  return (
    <div style={{ minHeight: "100vh", background: "#0B0B0A", color: "#F5F2EB", fontFamily: "'Plus Jakarta Sans',sans-serif", padding: "24px 20px 60px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
        <Link href={`/m/wowhead?cardId=${cardId}`} style={{ font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "#C8A15A", textDecoration: "none" }}>
          ← WowHead
        </Link>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
          <div style={{ width: 84, height: 84, borderRadius: 22, background: "rgba(200,161,90,.16)", border: "2px solid #C8A15A", display: "flex", alignItems: "center", justifyContent: "center", font: "700 32px 'Playfair Display',serif", color: "#C8A15A" }}>
            {experto.nombrePublico.charAt(0).toUpperCase()}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <h1 style={{ margin: 0, font: "700 22px 'Playfair Display',serif" }}>Gemelo digital de {experto.nombrePublico}</h1>
            <span style={{ font: "700 9px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "#0D0D0D", background: "#C8A15A", borderRadius: 999, padding: "5px 12px", alignSelf: "center" }}>
              Legacy · {RANGO_LABEL[rango]}
            </span>
            <span style={{ font: "400 13px 'Plus Jakarta Sans',sans-serif", color: "#8a8378", marginTop: 4 }}>{experto.profesion}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ font: "700 14px 'Plus Jakarta Sans',sans-serif", color: "#E5C378" }}>★★★★★</span>
            <span style={{ font: "600 12px 'Plus Jakarta Sans',sans-serif" }}>{simulatedRating(key).toFixed(1)}</span>
            <span style={{ font: "400 11px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>· {simulatedReviewCount(key)} reseñas (simulado)</span>
          </div>
        </div>

        {experto.esProfesionRegulada && (
          <div style={{ ...PANEL, borderColor: "rgba(229,146,138,.3)", background: "rgba(229,146,138,.07)" }}>
            <p style={{ margin: 0, font: "600 11.5px/1.6 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>
              Esto orienta, no diagnostica. Para algo puntual tuyo, la consulta real es con {experto.nombrePublico}, no con este Gemelo Digital.
            </p>
          </div>
        )}

        <Link href={`/experto/${experto.key}`} style={{ display: "block", textAlign: "center", padding: 14, borderRadius: 12, background: "#C8A15A", color: "#0D0D0D", font: "700 12px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".04em", textTransform: "uppercase", textDecoration: "none" }}>
          Consultar a su Gemelo Digital
        </Link>

        <div style={{ height: 1, background: "rgba(200,161,90,.14)" }} />

        <p style={{ margin: 0, font: "400 12.5px/1.7 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>{experto.descripcion}</p>

        {experiencia.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <span style={KICKER}>Experiencia</span>
            {experiencia.map((e, i) => (
              <div key={i} style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: "none", width: 2, background: "rgba(200,161,90,.3)", borderRadius: 2 }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingBottom: 4 }}>
                  <span style={{ font: "700 13px 'Plus Jakarta Sans',sans-serif", color: "#F5F2EB" }}>{e.rol}</span>
                  {e.periodo && <span style={{ font: "400 11px 'Plus Jakarta Sans',sans-serif", color: "#8a8378" }}>{e.periodo}</span>}
                  {e.descripcion && <span style={{ font: "400 12px/1.6 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5", marginTop: 4 }}>{e.descripcion}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {especialidades.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <span style={KICKER}>Especialidades</span>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {especialidades.map((e) => (
                <span key={e} style={{ font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 8, padding: "6px 11px" }}>
                  {e}
                </span>
              ))}
            </div>
          </div>
        )}

        {rango === "experto" && (
          <>
            <div style={{ height: 1, background: "rgba(200,161,90,.14)" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <span style={KICKER}>Su equipo ({experto.equipo.length} especialista{experto.equipo.length === 1 ? "" : "s"})</span>
              <p style={{ margin: 0, font: "400 11.5px/1.6 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
                Especialistas que {experto.nombrePublico} reclutó a su propio equipo -- no vienen incluidos al contratarlo, se contratan aparte si querés.
              </p>
              {experto.equipo.length > 0 && (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {experto.equipo.map((esp) => (
                    <Link key={esp.id} href={`/m/wowhead/legacy/${esp.key}?cardId=${cardId}`} style={{ flex: "0 0 72px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, textDecoration: "none" }}>
                      <div style={{ width: 40, height: 40, borderRadius: 11, background: "rgba(200,161,90,.14)", border: "1.5px solid rgba(200,161,90,.5)", display: "flex", alignItems: "center", justifyContent: "center", font: "700 14px 'Playfair Display',serif", color: "#C8A15A" }}>
                        {esp.nombrePublico.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ font: "700 10px 'Plus Jakarta Sans',sans-serif", color: "#F5F2EB", textAlign: "center" }}>{esp.nombrePublico}</span>
                      <span style={{ font: "400 9px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A", textAlign: "center" }}>Especialista</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
