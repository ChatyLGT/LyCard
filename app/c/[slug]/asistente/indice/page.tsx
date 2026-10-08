import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentAdminScope, isMasterN0Scope } from "@/lib/auth";
import { PISTAS, espaciosDePista, estadoEspacio, primeraPreguntaSinResponder, type Espacio, type EstadoEspacio } from "@/lib/assistantScript";

export const dynamic = "force-dynamic";

const CARD = {
  background: "#1a1919",
  border: "1px solid rgba(200,161,90,.18)",
  borderRadius: 16,
  padding: 16,
  display: "flex",
  flexDirection: "column" as const,
  gap: 10,
};

const CHIP_COLORS: Record<EstadoEspacio, { bg: string; color: string }> = {
  pendiente: { bg: "rgba(255,255,255,.06)", color: "#8A8A8A" },
  propuesto: { bg: "rgba(200,161,90,.16)", color: "#C8A15A" },
  abierto: { bg: "rgba(217,140,74,.18)", color: "#D98C4A" },
};

const CHIP_LABELS: Record<EstadoEspacio, string> = {
  pendiente: "Pendiente",
  propuesto: "Propuesto",
  abierto: "Decisión abierta",
};

function Chip({ estado }: { estado: EstadoEspacio }) {
  const c = CHIP_COLORS[estado];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 9px",
        borderRadius: 999,
        background: c.bg,
        color: c.color,
        font: "700 9.5px 'Plus Jakarta Sans',sans-serif",
        letterSpacing: ".06em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {CHIP_LABELS[estado]}
    </span>
  );
}

// S1 -- Índice de espacios (Paso 3 del plan, doc sección 5.2): el mapa
// completo, agrupado por pista, con el estado real de cada espacio.
// Los espacios sin guion todavía (la mayoría de los 13 modales y los
// campos del programa, a propósito -- ver lib/assistantScript.ts)
// aparecen igual, como "Pendiente · Sin guion aún" (criterio de
// aceptación #8 del doc).
//
// Edición (pedido de N0, 2026-10-08): cada pregunta -- ya respondida o
// no -- es un link directo a S2 con `?pregunta=<id>&volver=indice`,
// así que volver acá a cambiar una respuesta ya guardada no hace falta
// re-recorrer toda la pista de nuevo.
export default async function AsistenteS1Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const scope = await currentAdminScope();
  if (!scope || !isMasterN0Scope(scope)) redirect(`/c/${slug}`);

  const card = await prisma.card.findUnique({ where: { slug } });
  if (!card) notFound();
  if (!card.isOrigin) redirect(`/c/${slug}`);

  const session = await prisma.assistantSession.findFirst({
    where: { adminId: scope.id, cardId: card.id },
    orderBy: { updatedAt: "desc" },
  });
  if (!session) redirect(`/c/${slug}/asistente`);

  const respuestas = await prisma.assistantAnswer.findMany({
    where: { sessionId: session.id },
    select: { preguntaId: true, estado: true },
  });
  const estadosRespuestas = new Map(respuestas.map((r) => [r.preguntaId, r.estado]));
  const respondidasIds = new Set(estadosRespuestas.keys());

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
        <Link href={`/c/${slug}/asistente`} style={{ color: "#C8A15A", font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".18em", textTransform: "uppercase", textDecoration: "none" }}>
          ← Volver
        </Link>
        <h1 style={{ margin: 0, font: "500 18px 'Playfair Display',serif", color: "#F5F2EB" }}>Índice</h1>
      </div>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 28 }}>
        <Link
          href={`/c/${slug}/asistente/decisiones-abiertas`}
          style={{
            textAlign: "center",
            padding: 13,
            borderRadius: 10,
            border: "1px solid rgba(217,140,74,.35)",
            color: "#D98C4A",
            font: "700 11px 'Plus Jakarta Sans',sans-serif",
            letterSpacing: ".1em",
            textTransform: "uppercase",
            textDecoration: "none",
          }}
        >
          Decisiones abiertas
        </Link>

        {PISTAS.map((pista) => {
          // Pedido de Gunnar (2026-10-08, vía MAMEN): "Continuar" --
          // el modo que avanza solo (sin `?pregunta=`, ver S2) sigue
          // existiendo, pero antes de este botón no tenía ningún link
          // real que lo abriera. Uno por pista, solo si de verdad hay
          // una pregunta sin responder a la que avanzar; el camino de
          // una pregunta por vez (tocar cada fila) sigue igual, sin
          // tocarlo.
          const siguientePendiente = primeraPreguntaSinResponder(pista.id, respondidasIds);
          return (
          <div key={pista.id} id={`pista-${pista.id}`} style={{ display: "flex", flexDirection: "column", gap: 10, scrollMarginTop: 90 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <h2 style={{ margin: 0, font: "600 13px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", color: "#C8A15A" }}>
                {pista.titulo}
              </h2>
              {siguientePendiente && (
                <Link
                  href={`/c/${slug}/asistente/pista/${pista.id}`}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 999,
                    background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)",
                    color: "#0D0D0D",
                    font: "700 9.5px 'Plus Jakarta Sans',sans-serif",
                    letterSpacing: ".06em",
                    textTransform: "uppercase",
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  Continuar →
                </Link>
              )}
            </div>

            {pista.id === "negocio" ? (
              <div style={CARD}>
                <span style={{ font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", color: "#5A5A5A" }}>
                  Pendiente, sin tarjeta todavía
                </span>
              </div>
            ) : (
              espaciosDePista(pista.id).map((espacio) => (
                <EspacioCard key={espacio.id} slug={slug} espacio={espacio} estadosRespuestas={estadosRespuestas} />
              ))
            )}
          </div>
          );
        })}

        {/* Pedido de Gunnar (2026-10-08, vía MAMEN): toda pantalla del
            asistente necesita un camino de vuelta al Dashboard. */}
        <Link
          href="/admin"
          style={{ textAlign: "center", font: "400 11.5px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A", textDecoration: "none" }}
        >
          Volver al Dashboard
        </Link>
      </div>
    </div>
  );
}

function EspacioCard({
  slug,
  espacio,
  estadosRespuestas,
}: {
  slug: string;
  espacio: Espacio;
  estadosRespuestas: Map<string, string>;
}) {
  const estado = estadoEspacio(espacio, estadosRespuestas);

  if (espacio.preguntas.length === 0) {
    return (
      <div style={CARD}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <span style={{ font: "600 14px 'Playfair Display',serif", color: "#F5F2EB" }}>{espacio.titulo}</span>
          <Chip estado="pendiente" />
        </div>
        <span style={{ font: "400 11.5px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>Sin guion aún</span>
      </div>
    );
  }

  return (
    <div style={CARD}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <span style={{ font: "600 14px 'Playfair Display',serif", color: "#F5F2EB" }}>{espacio.titulo}</span>
        <Chip estado={estado} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {espacio.preguntas.map((pregunta) => {
          const estadoPregunta = (estadosRespuestas.get(pregunta.id) as EstadoEspacio | undefined) ?? "pendiente";
          return (
            <Link
              key={pregunta.id}
              href={`/c/${slug}/asistente/pista/${espacio.pista}?pregunta=${pregunta.id}&volver=indice`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: "8px 10px",
                borderRadius: 8,
                background: "rgba(255,255,255,.04)",
                textDecoration: "none",
              }}
            >
              <span style={{ font: "400 12.5px 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>{pregunta.texto}</span>
              <Chip estado={estadoPregunta} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
