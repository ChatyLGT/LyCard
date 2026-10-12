import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentEmployeeScope } from "@/lib/auth";
import { BIZTOCARD_TOTAL_PREGUNTAS, preguntaPorPaso } from "@/lib/bizToCardScript";
import { guardarBizToCardAction } from "@/app/empleados/biztocard-actions";

export const dynamic = "force-dynamic";

const CARD_STYLE = {
  background: "#1a1919",
  border: "1px solid rgba(200,161,90,.18)",
  borderRadius: 16,
  padding: 20,
} as const;

const TEXT_INPUT = {
  width: "100%",
  background: "#0D0D0D",
  border: "1px solid rgba(200,161,90,.3)",
  borderRadius: 10,
  padding: "11px 14px",
  color: "#F5F2EB",
  font: "400 14px 'Plus Jakarta Sans',sans-serif",
  outline: "none",
  boxSizing: "border-box" as const,
};

const GOLD_BTN = {
  padding: "13px 16px",
  border: "none",
  borderRadius: 12,
  background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)",
  color: "#0D0D0D",
  font: "700 12px 'Plus Jakarta Sans',sans-serif",
  letterSpacing: ".06em",
  textTransform: "uppercase" as const,
  cursor: "pointer",
};

// BizToCard -- Pista Personal, Niveles 1 y 2 (2026-10-12, pedido de
// Gunnar: "arrancá con la pista personal nivel 1 y 2 nomás, pero quiero
// que se desarrolle el dashboard para la oreja"). Un campo por vez,
// la Oreja sentada en vivo con el Miembro -- ver nota de diseño en
// lib/bizToCardScript.ts sobre por qué escribe directo a la Card.
export default async function BizToCardPage({
  params,
  searchParams,
}: {
  params: Promise<{ cardId: string }>;
  searchParams: Promise<{ paso?: string }>;
}) {
  const { cardId } = await params;
  const { paso: pasoRaw } = await searchParams;
  const paso = Math.max(0, parseInt(pasoRaw || "0", 10) || 0);

  const scope = await currentEmployeeScope();
  if (!scope) redirect("/empleados/login");

  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: {
      id: true,
      slug: true,
      name: true,
      title: true,
      quote: true,
      wa: true,
      storyQuote: true,
      storyBody: true,
      kind: true,
      member: {
        select: {
          name: true,
          memberships: { select: { programId: true } },
        },
      },
    },
  });
  const perteneceAlPrograma = card?.member?.memberships.some((m) => m.programId === scope.programId);
  if (!card || card.kind !== "personal" || !perteneceAlPrograma) notFound();

  const pregunta = preguntaPorPaso(paso);

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
        <Link href="/empleados" style={{ color: "#C8A15A", font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".18em", textTransform: "uppercase", textDecoration: "none" }}>
          ← Volver
        </Link>
        <h1 style={{ margin: 0, font: "500 18px 'Playfair Display',serif", color: "#F5F2EB" }}>BizToCard</h1>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ textAlign: "center" }}>
          <span style={{ font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".18em", textTransform: "uppercase", color: "#C8A15A" }}>
            Tarjeta personal de {card.member?.name || "este Miembro"}
          </span>
        </div>

        {pregunta ? (
          <>
            <div style={{ display: "flex", gap: 4 }}>
              {Array.from({ length: BIZTOCARD_TOTAL_PREGUNTAS }, (_, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: 4,
                    borderRadius: 999,
                    background: i <= paso ? "linear-gradient(90deg,#E5C378,#C8A15A)" : "rgba(255,255,255,.08)",
                  }}
                />
              ))}
            </div>
            <span style={{ font: "400 11px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A", textAlign: "center" }}>
              Nivel {pregunta.nivel} · Pregunta {paso + 1} de {BIZTOCARD_TOTAL_PREGUNTAS}
            </span>

            <div style={{ ...CARD_STYLE, display: "flex", flexDirection: "column", gap: 14 }}>
              <h2 style={{ margin: 0, font: "500 19px 'Playfair Display',serif", color: "#F5F2EB", lineHeight: 1.35 }}>{pregunta.texto}</h2>
              <p style={{ margin: 0, font: "400 12px 'Plus Jakarta Sans',sans-serif", color: "#8A8378" }}>{pregunta.ayuda}</p>

              <form action={guardarBizToCardAction.bind(null, cardId, paso)} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {pregunta.tipo === "texto_largo" ? (
                  <textarea name="respuesta" rows={5} defaultValue={card[pregunta.campo] || ""} style={{ ...TEXT_INPUT, resize: "vertical" }} autoFocus />
                ) : (
                  <input name="respuesta" defaultValue={card[pregunta.campo] || ""} style={TEXT_INPUT} autoFocus />
                )}
                <button type="submit" style={GOLD_BTN}>
                  Guardar y seguir
                </button>
              </form>

              <form action={guardarBizToCardAction.bind(null, cardId, paso)}>
                <input type="hidden" name="skip" value="1" />
                <button
                  type="submit"
                  style={{ width: "100%", background: "none", border: "none", color: "#5A5A5A", font: "400 11.5px 'Plus Jakarta Sans',sans-serif", cursor: "pointer", padding: 6 }}
                >
                  Prefiero no responder ahora
                </button>
              </form>
            </div>
          </>
        ) : (
          <div style={{ ...CARD_STYLE, textAlign: "center", display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 32 }}>✓</span>
            <h2 style={{ margin: 0, font: "500 18px 'Playfair Display',serif", color: "#F5F2EB" }}>Nivel 1 y 2 completos</h2>
            <p style={{ margin: 0, font: "400 12.5px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>
              La tarjeta personal de {card.member?.name || "este Miembro"} ya tiene su identidad básica y su camino.
            </p>
            <Link
              href={`/c/${card.slug}`}
              style={{ color: "#C8A15A", font: "700 11px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".06em", textTransform: "uppercase", textDecoration: "none" }}
            >
              Ver tarjeta →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
