import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentAdminScope, isMasterN0Scope } from "@/lib/auth";
import { espacioDePregunta, findPregunta } from "@/lib/assistantScript";

export const dynamic = "force-dynamic";

const FECHA_FMT = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", year: "numeric" });

// S5 -- Decisiones abiertas (Paso 3 del plan, doc sección 5.6): todo lo
// marcado "Todavía no sé" en esta sesión, más antiguo primero -- es el
// insumo directo de la Ficha de Programa. Tocar una fila abre esa
// pregunta en S2 (`?pregunta=<id>&volver=abiertas`), precargada; al
// guardar vuelve acá, no sigue avanzando por la pista.
export default async function AsistenteS5Page({ params }: { params: Promise<{ slug: string }> }) {
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

  const abiertas = await prisma.assistantAnswer.findMany({
    where: { sessionId: session.id, estado: "abierto" },
    orderBy: { createdAt: "asc" },
    select: { preguntaId: true, createdAt: true },
  });

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
        <Link href={`/c/${slug}/asistente/indice`} style={{ color: "#C8A15A", font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".18em", textTransform: "uppercase", textDecoration: "none" }}>
          ← Volver
        </Link>
        <h1 style={{ margin: 0, font: "500 18px 'Playfair Display',serif", color: "#F5F2EB" }}>Decisiones abiertas</h1>
      </div>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
        {abiertas.length === 0 ? (
          <p style={{ margin: 0, textAlign: "center", font: "400 13px/1.6 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
            Todavía no hay decisiones abiertas. Cuando marques &quot;Todavía no sé&quot; en una pregunta, aparece acá.
          </p>
        ) : (
          abiertas.map((respuesta) => {
            const pregunta = findPregunta(respuesta.preguntaId);
            const espacio = espacioDePregunta(respuesta.preguntaId);
            if (!pregunta || !espacio) return null;
            return (
              <Link
                key={respuesta.preguntaId}
                href={`/c/${slug}/asistente/pista/${espacio.pista}?pregunta=${pregunta.id}&volver=abiertas`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  padding: 16,
                  borderRadius: 12,
                  background: "#1a1919",
                  border: "1px solid rgba(217,140,74,.22)",
                  textDecoration: "none",
                }}
              >
                <span style={{ font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", color: "#D98C4A" }}>
                  {espacio.titulo}
                </span>
                <span style={{ font: "500 14px 'Plus Jakarta Sans',sans-serif", color: "#F5F2EB" }}>{pregunta.texto}</span>
                <span style={{ font: "400 11px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
                  Marcada el {FECHA_FMT.format(respuesta.createdAt)}
                </span>
              </Link>
            );
          })
        )}

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
