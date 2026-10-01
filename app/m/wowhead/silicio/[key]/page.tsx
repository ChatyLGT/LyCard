import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCardHost } from "@/lib/cardHost";
import { simulatedRating, simulatedReviewCount } from "@/lib/wowApps";
import { labelForToolKey } from "@/lib/especialistas";
import { contratarSilicioAction } from "../../actions";

export const dynamic = "force-dynamic";

const PANEL = { padding: 14, borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(200,161,90,.18)" };
const KICKER = { font: "600 8.5px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".16em", textTransform: "uppercase", color: "#756c5e" };

// Perfil de un Agente Silicio en WowHead (Fase 6) -- CV (trabajo,
// herramientas, habilidades), reputación simulada, y "Contratar" real
// (self-service, ver ../../actions.ts#contratarSilicioAction).
export default async function SilicioProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ cardId?: string; contratado?: string }>;
}) {
  const { key } = await params;
  const { cardId, contratado } = await searchParams;
  if (!cardId) return null;
  await requireCardHost(cardId);

  const especialista = await prisma.especialista.findUnique({ where: { key }, include: { installs: { where: { cardId } } } });
  if (!especialista) notFound();

  const wowAppRows = await prisma.wowApp.findMany({ select: { key: true, nombre: true } });
  const wowAppNames: Record<string, string> = Object.fromEntries(wowAppRows.map((a) => [a.key, a.nombre]));
  const yaContratado = especialista.installs.length > 0;

  return (
    <div style={{ minHeight: "100vh", background: "#0B0B0A", color: "#F5F2EB", fontFamily: "'Plus Jakarta Sans',sans-serif", padding: "24px 20px 60px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
        <Link href={`/m/wowhead?cardId=${cardId}`} style={{ font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "#C8A15A", textDecoration: "none" }}>
          ← WowHead
        </Link>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
          <div style={{ width: 84, height: 84, borderRadius: 22, background: `${especialista.color}29`, border: `2px solid ${especialista.color}`, display: "flex", alignItems: "center", justifyContent: "center", font: "700 32px 'Playfair Display',serif", color: especialista.color }}>
            {especialista.nombre.charAt(0).toUpperCase()}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <h1 style={{ margin: 0, font: "700 22px 'Playfair Display',serif" }}>{especialista.nombre}</h1>
            <span style={{ font: "700 9px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "#7FB0C4", background: "rgba(127,176,196,.14)", borderRadius: 999, padding: "5px 12px", alignSelf: "center" }}>
              Agente Silicio
            </span>
            <span style={{ font: "400 13px 'Plus Jakarta Sans',sans-serif", color: "#8a8378", marginTop: 4 }}>{especialista.trabajo}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ font: "700 14px 'Plus Jakarta Sans',sans-serif", color: "#E5C378" }}>★★★★★</span>
            <span style={{ font: "600 12px 'Plus Jakarta Sans',sans-serif" }}>{simulatedRating(key).toFixed(1)}</span>
            <span style={{ font: "400 11px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>· {simulatedReviewCount(key)} reseñas (simulado)</span>
          </div>
        </div>

        {contratado === "1" && (
          <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e", textAlign: "center" }}>✓ Contratado -- ya aparece en tu Oficina.</p>
        )}

        <form action={contratarSilicioAction.bind(null, cardId, key)}>
          <button type="submit" disabled={yaContratado} style={{ display: "block", width: "100%", textAlign: "center", padding: 14, borderRadius: 12, background: yaContratado ? "rgba(255,255,255,.06)" : "#C8A15A", color: yaContratado ? "#5A5A5A" : "#0D0D0D", font: "700 12px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".04em", textTransform: "uppercase", border: "none", cursor: yaContratado ? "default" : "pointer" }}>
            {yaContratado ? "Ya está en tu equipo" : "Contratar"}
          </button>
        </form>

        <div style={{ height: 1, background: "rgba(200,161,90,.14)" }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span style={KICKER}>Sobre este Agente</span>
          <p style={{ margin: 0, font: "400 12.5px/1.7 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>{especialista.descripcion}</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span style={KICKER}>Herramientas</span>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {(especialista.toolKeys as string[]).map((tk) => (
              <span key={tk} style={{ font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 8, padding: "6px 11px" }}>
                {labelForToolKey(tk, wowAppNames)}
              </span>
            ))}
          </div>
        </div>

        {(especialista.habilidades as string[]).length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <span style={KICKER}>Habilidades</span>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {(especialista.habilidades as string[]).map((h) => (
                <span key={h} style={{ font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 8, padding: "6px 11px" }}>
                  {h}
                </span>
              ))}
            </div>
          </div>
        )}

        {especialista.suggestion && (
          <div style={{ ...PANEL, borderColor: "rgba(127,176,196,.3)", background: "rgba(127,176,196,.06)" }}>
            <p style={{ margin: 0, font: "italic 400 12.5px/1.6 'Plus Jakarta Sans',sans-serif", color: "#7FB0C4" }}>&ldquo;{especialista.suggestion}&rdquo;</p>
            <span style={{ display: "block", marginTop: 6, font: "700 9px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".06em", textTransform: "uppercase", color: "#5A5A5A" }}>
              Sugerencia de ejemplo (simulada)
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
