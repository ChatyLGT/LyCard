import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentAdminScope, isMasterN0Scope } from "@/lib/auth";
import { PISTAS, preguntasDePista, primeraPreguntaSinResponder, findPregunta, type PistaId } from "@/lib/assistantScript";
import { presetDePrograma } from "@/lib/assistantPresets";
import { responderPreguntaAction, type VolverDestino } from "../../actions";

export const dynamic = "force-dynamic";

const OPCION = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "14px 16px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,.1)",
  background: "#1a1919",
  cursor: "pointer",
};

const SAVE_BTN = {
  padding: 13,
  borderRadius: 10,
  border: "none",
  background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)",
  color: "#0D0D0D",
  font: "700 11px 'Plus Jakarta Sans',sans-serif",
  letterSpacing: ".1em",
  textTransform: "uppercase" as const,
  cursor: "pointer",
};

function isPistaId(value: string): value is PistaId {
  return PISTAS.some((p) => p.id === value);
}

function isVolverDestino(value: string | undefined): value is VolverDestino {
  return value === "indice" || value === "abiertas";
}

// S2 -- una pregunta por vez (Paso 2 del plan). Dos modos, misma
// pantalla:
// - Avance normal (sin `?pregunta=`): muestra "la pregunta de ahora"
//   de esta pista -- el lector del guion (primeraPreguntaSinResponder)
//   resuelve cuál es, y al guardar sigue a la próxima.
// - Edición (Paso 3, pedido de N0): `?pregunta=<id>&volver=indice|abiertas`
//   abre ESA pregunta puntual -- ya respondida o no -- precargada con
//   lo que ya se guardó, y al guardar vuelve a S1 o S5 en vez de seguir
//   avanzando por la pista.
// Mismas guardas que S0 (MasterN0 + card.isOrigin) más la verificación
// extra de que la sesión encontrada es realmente la de este Admin.
export default async function AsistenteS2Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; pistaId: string }>;
  searchParams: Promise<{ pregunta?: string; volver?: string }>;
}) {
  const { slug, pistaId: pistaIdParam } = await params;
  const { pregunta: preguntaIdParam, volver: volverParam } = await searchParams;
  if (!isPistaId(pistaIdParam)) notFound();
  const pistaId = pistaIdParam;
  const volver: VolverDestino = isVolverDestino(volverParam) ? volverParam : "siguiente";

  const scope = await currentAdminScope();
  if (!scope || !isMasterN0Scope(scope)) redirect(`/c/${slug}`);

  const card = await prisma.card.findUnique({ where: { slug } });
  if (!card) notFound();
  if (!card.isOrigin) redirect(`/c/${slug}`);

  const session = await prisma.assistantSession.findFirst({
    where: { adminId: scope.id, cardId: card.id },
    orderBy: { updatedAt: "desc" },
  });
  // S0 siempre crea una sesión antes de poder llegar acá -- si no hay
  // ninguna, no hay nada que continuar.
  if (!session) redirect(`/c/${slug}/asistente`);

  const respuestas = await prisma.assistantAnswer.findMany({
    where: { sessionId: session.id },
    select: { preguntaId: true, valor: true, porque: true },
  });
  const respondidasIds = new Set(respuestas.map((r) => r.preguntaId));

  const todas = preguntasDePista(pistaId);
  const pidiendoEspecifica = typeof preguntaIdParam === "string" && todas.some((p) => p.id === preguntaIdParam);
  const pregunta = pidiendoEspecifica ? findPregunta(preguntaIdParam!) : primeraPreguntaSinResponder(pistaId, respondidasIds);
  // Avance normal: ya está todo respondido en esta pista (o nunca tuvo
  // preguntas) -- nada que hacer acá, volvé al mapa. Edición: el id no
  // existe (no debería pasar desde nuestros propios links) -- mismo
  // destino honesto, sin reventar.
  if (!pregunta) redirect(`/c/${slug}/asistente`);

  const numero = todas.findIndex((p) => p.id === pregunta.id) + 1;

  const respuestaExistente = respuestas.find((r) => r.preguntaId === pregunta.id);
  const valorExistente = respuestaExistente?.valor as { opcionId?: string } | null | undefined;

  // Paso 2b -- prioridad: respuesta del usuario > preset del programa
  // (Program.slug de la Card que se está configurando) > propuesta del
  // guion. "" cuenta como "sin propuesta" (medal.fuente la deja vacía
  // a propósito, ver lib/assistantScript.ts).
  const programSlug = card.programId
    ? ((await prisma.program.findUnique({ where: { id: card.programId }, select: { slug: true } }))?.slug ?? null)
    : null;
  const opcionPreseleccionada = valorExistente?.opcionId || presetDePrograma(programSlug, pregunta.id) || pregunta.propuesta || null;

  const volverUrl =
    volver === "indice" ? `/c/${slug}/asistente/indice` : volver === "abiertas" ? `/c/${slug}/asistente/decisiones-abiertas` : `/c/${slug}/asistente`;

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
          ← Pausar
        </Link>
        <span style={{ font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "#5A5A5A" }}>
          Pregunta {numero} de {todas.length}
        </span>
      </div>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 22 }}>
        {respuestaExistente && (
          <span style={{ font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".12em", textTransform: "uppercase", color: "#C8A15A" }}>
            Editando una respuesta guardada
          </span>
        )}
        <h1 style={{ margin: 0, font: "500 21px/1.4 'Playfair Display',serif", color: "#F5F2EB" }}>{pregunta.texto}</h1>

        <form
          action={responderPreguntaAction.bind(null, session.id, slug, pistaId, pregunta.id, volver)}
          style={{ display: "flex", flexDirection: "column", gap: 18 }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {pregunta.opciones.map((opcion) => (
              <label key={opcion.id} style={OPCION}>
                <input
                  type="radio"
                  name="opcion"
                  value={opcion.id}
                  defaultChecked={opcionPreseleccionada === opcion.id}
                  style={{ accentColor: "#C8A15A", width: 18, height: 18 }}
                />
                <span style={{ font: "500 14px 'Plus Jakarta Sans',sans-serif", color: "#E5E2E1" }}>{opcion.texto}</span>
              </label>
            ))}
          </div>

          {pregunta.pidePorque && (
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "#5A5A5A" }}>
                ¿Por qué? (opcional)
              </span>
              <textarea
                name="porque"
                rows={2}
                defaultValue={respuestaExistente?.porque ?? ""}
                style={{ resize: "vertical", padding: 12, borderRadius: 10, border: "1px solid rgba(255,255,255,.14)", background: "#1a1919", color: "#E5E2E1", font: "400 14px/1.5 'Plus Jakarta Sans',sans-serif" }}
              />
            </label>
          )}

          <button type="submit" name="accion" value="responder" style={SAVE_BTN}>
            Guardar y seguir
          </button>

          {pregunta.permiteNoSe && (
            <button
              type="submit"
              name="accion"
              value="no_se"
              style={{ ...SAVE_BTN, background: "transparent", border: "1px solid rgba(200,161,90,.3)", color: "#C2BEB5" }}
            >
              Todavía no sé
            </button>
          )}
        </form>

        <Link href={volverUrl} style={{ textAlign: "center", font: "400 11.5px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A", textDecoration: "none" }}>
          {volver === "siguiente" ? "Salir al mapa" : "Volver sin guardar"}
        </Link>

        {/* Pedido de Gunnar (2026-10-08, vía MAMEN): al guardar, S2
            sigue volviendo a la pista/S1/S5 como ya estaba -- esto es
            SOLO para salir sin perder el lugar, un camino aparte al
            Dashboard. */}
        <Link href="/admin" style={{ textAlign: "center", font: "400 11.5px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A", textDecoration: "none" }}>
          Volver al Dashboard
        </Link>
      </div>
    </div>
  );
}
