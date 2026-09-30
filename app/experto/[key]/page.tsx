import { notFound } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import type { CSSProperties } from "react";
import { prisma } from "@/lib/prisma";
import { currentMemberId } from "@/lib/memberAuth";
import { canPublishExperto, FREE_TRIAL_LIMIT, shouldRequireRegistration, EXPERTO_VISITOR_COOKIE } from "@/lib/expertos";
import { askExpertoAction } from "./actions";

export const dynamic = "force-dynamic";

const PANEL: CSSProperties = { padding: 14, borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(200,161,90,.18)" };
const INPUT: CSSProperties = { background: "#0D0D0D", border: "1px solid rgba(200,161,90,.25)", borderRadius: 8, padding: "10px 12px", color: "#F5F2EB", font: "400 13px 'Plus Jakarta Sans',sans-serif", outline: "none" };
const BTN: CSSProperties = { padding: 12, border: "none", borderRadius: 8, background: "#C8A15A", color: "#0D0D0D", font: "700 11px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".06em", textTransform: "uppercase", cursor: "pointer" };

const ERROR_COPY: Record<string, string> = {
  empty: "Escribí algo antes de mandar la pregunta.",
  notPublished: "Este Gemelo Digital no está publicado todavía.",
  needsRegistration: "Ya usaste tus 3 preguntas gratis -- registrate para seguir.",
};

// Página pública de consulta a un Experto (Fase 5, 2026-09-30) -- ver
// PLAN.md "Fase 4: DISEÑO -- Especialistas y Expertos". Regla dura 3:
// SIEMPRE se rotula "Gemelo digital de [nombre]", nunca se presenta
// como si fuera la persona misma respondiendo en vivo.
export default async function ExpertoPublicPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ error?: string; asked?: string }>;
}) {
  const { key } = await params;
  const { error, asked } = await searchParams;

  const experto = await prisma.experto.findUnique({ where: { key } });
  if (!experto) notFound();

  const published = canPublishExperto(experto);
  const memberId = await currentMemberId();
  const jar = await cookies();
  const visitorToken = jar.get(EXPERTO_VISITOR_COOKIE)?.value ?? null;

  const consultas = memberId
    ? await prisma.consulta.findMany({ where: { expertoId: experto.id, memberId }, orderBy: { createdAt: "desc" } })
    : visitorToken
      ? await prisma.consulta.findMany({ where: { expertoId: experto.id, visitorToken }, orderBy: { createdAt: "desc" } })
      : [];

  const freeCount = memberId ? 0 : consultas.length;
  const needsRegistration = !memberId && shouldRequireRegistration(freeCount);

  return (
    <div style={{ minHeight: "100vh", background: "#0B0B0A", color: "#F5F2EB", fontFamily: "'Plus Jakarta Sans',sans-serif", padding: "24px 20px 60px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 48, height: 48, borderRadius: 12, flexShrink: 0,
              background: `${experto.color}1F`, border: `1px solid ${experto.color}55`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 24, color: experto.color }}>psychology</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ font: "700 17px 'Playfair Display',serif" }}>Gemelo digital de {experto.nombrePublico}</span>
            <span style={{ font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8a8378" }}>{experto.profesion}</span>
          </div>
        </div>

        <p style={{ margin: 0, font: "400 13px/1.7 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>{experto.descripcion}</p>

        {experto.esProfesionRegulada && (
          <div style={{ ...PANEL, borderColor: "rgba(229,146,138,.35)" }}>
            <p style={{ margin: 0, font: "600 11.5px/1.6 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>
              Esto orienta, no diagnostica. Para algo puntual tuyo, la consulta real es con {experto.nombrePublico}, no con este Gemelo Digital.
            </p>
          </div>
        )}

        <div style={{ height: 1, background: "rgba(200,161,90,.14)" }} />

        <span style={{ font: "600 8.5px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".16em", textTransform: "uppercase", color: "#756c5e" }}>
          Consulta a mi gemelo digital
        </span>

        {!published && (
          <p style={{ margin: 0, font: "400 12px/1.6 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
            Este Gemelo Digital todavía no está publicado -- {experto.nombrePublico} no dio o revocó su consentimiento.
          </p>
        )}

        {published && (
          <>
            {consultas.map((c) => (
              <div key={c.id} style={PANEL}>
                <p style={{ margin: "0 0 6px", font: "700 12px/1.5 'Plus Jakarta Sans',sans-serif", color: "#F5F2EB" }}>{c.pregunta}</p>
                {c.respuesta ? (
                  <p style={{ margin: 0, font: "400 12.5px/1.6 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>{c.respuesta}</p>
                ) : (
                  <p style={{ margin: 0, font: "italic 400 12px/1.6 'Plus Jakarta Sans',sans-serif", color: "#7FB0C4" }}>
                    Tu Gemelo Digital todavía no supo responder esto -- {experto.nombrePublico} lo va a ver y te contesta directo.
                  </p>
                )}
              </div>
            ))}

            {error && ERROR_COPY[error] && (
              <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#e5928a" }}>{ERROR_COPY[error]}</p>
            )}
            {asked && !error && (
              <p style={{ margin: 0, font: "600 11px 'Plus Jakarta Sans',sans-serif", color: "#8fd19e" }}>✓ Pregunta enviada.</p>
            )}

            {needsRegistration ? (
              <Link href="/m/login" style={{ ...BTN, textAlign: "center", textDecoration: "none", display: "block" }}>
                Ya usaste tus 3 preguntas gratis -- registrate para seguir
              </Link>
            ) : (
              <form action={askExpertoAction.bind(null, key)} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <textarea name="pregunta" placeholder="Escribí tu pregunta" rows={3} required style={{ ...INPUT, resize: "vertical" }} />
                <button type="submit" style={BTN}>Preguntar</button>
                {!memberId && (
                  <span style={{ font: "400 10.5px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
                    Te quedan {Math.max(0, FREE_TRIAL_LIMIT - freeCount)} de {FREE_TRIAL_LIMIT} preguntas gratis sin registrarte.
                  </span>
                )}
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
