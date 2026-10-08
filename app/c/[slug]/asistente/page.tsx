import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentAdminScope, isMasterN0Scope } from "@/lib/auth";
import { PISTAS, espaciosDePista, totalPreguntas, type PistaId } from "@/lib/assistantScript";

export const dynamic = "force-dynamic";

const CARD = {
  background: "#1a1919",
  border: "1px solid rgba(200,161,90,.18)",
  borderRadius: 16,
  padding: 18,
  display: "flex",
  flexDirection: "column" as const,
  gap: 8,
};

// Asistente "Configura tu LyCard" v2 -- S0 (Paso 1 del plan). Guarda
// cómo lo pide el doc de diseño: "usuario autenticado, dueño de esa
// tarjeta, y con rol MasterN0 en esta fase" -- acá "dueño de esa
// tarjeta" se resuelve igual que el botón que manda acá (card.isOrigin
// + MasterN0), ver components/LyCardView.tsx para el porqué.
export default async function AsistenteS0Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const scope = await currentAdminScope();
  if (!scope || !isMasterN0Scope(scope)) redirect(`/c/${slug}`);

  const card = await prisma.card.findUnique({ where: { slug } });
  if (!card) notFound();
  if (!card.isOrigin) redirect(`/c/${slug}`);

  // Escribe: crea la sesión si no existe (doc, sección 5.1) -- busca
  // primero, solo crea si de verdad no hay ninguna. Nunca pisa una
  // sesión existente (criterio de aceptación #4: "si cierra y vuelve,
  // retoma donde estaba").
  let session = await prisma.assistantSession.findFirst({
    where: { adminId: scope.id, cardId: card.id },
    orderBy: { updatedAt: "desc" },
  });
  if (!session) {
    session = await prisma.assistantSession.create({
      data: { adminId: scope.id, cardId: card.id, estado: "en_curso" },
    });
  }

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
        <Link href={`/c/${slug}`} style={{ color: "#C8A15A", font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".18em", textTransform: "uppercase", textDecoration: "none" }}>
          ← Pausar
        </Link>
        <h1 style={{ margin: 0, font: "500 18px 'Playfair Display',serif", color: "#F5F2EB" }}>Asistente</h1>
      </div>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ font: "700 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".14em", textTransform: "uppercase", color: "#C8A15A" }}>
            Configura tu LyCard
          </span>
          <p style={{ margin: 0, font: "400 14px/1.6 'Plus Jakarta Sans',sans-serif", color: "#C2BEB5" }}>
            Vamos a completar tu tarjeta y tu programa. Una pregunta por vez.
            <br />
            Puedes pausar cuando quieras y seguir luego.
          </p>
        </div>

        {/* Espectro de velocidad (doc, sección 1.1) -- en esta fase solo
            el modo Rápido tiene contenido real; Detallado queda
            marcado "Próximamente" y no hace nada al tocarlo. */}
        <div style={{ display: "flex", gap: 8 }}>
          <div
            style={{
              flex: 1,
              textAlign: "center",
              padding: "10px 14px",
              borderRadius: 10,
              background: "linear-gradient(90deg,#E5C378,#C8A15A 50%,#99732B)",
              color: "#0D0D0D",
              font: "700 11px 'Plus Jakarta Sans',sans-serif",
              letterSpacing: ".06em",
              textTransform: "uppercase",
            }}
          >
            Rápido
          </div>
          <div
            style={{
              flex: 1,
              textAlign: "center",
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,.1)",
              color: "#5A5A5A",
              font: "700 11px 'Plus Jakarta Sans',sans-serif",
              letterSpacing: ".06em",
              textTransform: "uppercase",
            }}
          >
            Detallado · Próximamente
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {PISTAS.map((pista) => (
            <PistaTile key={pista.id} pistaId={pista.id} titulo={pista.titulo} />
          ))}
        </div>

        {/* S1 (el índice completo) todavía no existe -- Paso 3 del
            plan. Honesto: ni "Ver todo" ni las pistas navegan a nada
            todavía, en vez de un link roto. */}
        <p style={{ margin: 0, textAlign: "center", font: "400 11.5px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
          El mapa completo de preguntas (S1) llega en el próximo paso.
        </p>

        <Link
          href={`/c/${slug}`}
          style={{
            textAlign: "center",
            padding: 13,
            borderRadius: 10,
            border: "1px solid rgba(200,161,90,.3)",
            color: "#C2BEB5",
            font: "700 11px 'Plus Jakarta Sans',sans-serif",
            letterSpacing: ".1em",
            textTransform: "uppercase",
            textDecoration: "none",
          }}
        >
          Salir
        </Link>
      </div>
    </div>
  );
}

function PistaTile({ pistaId, titulo }: { pistaId: PistaId; titulo: string }) {
  if (pistaId === "negocio") {
    return (
      <div style={CARD}>
        <span style={{ font: "600 15px 'Playfair Display',serif", color: "#F5F2EB" }}>{titulo}</span>
        <span style={{ font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", color: "#5A5A5A" }}>
          Pendiente, sin tarjeta todavía
        </span>
      </div>
    );
  }

  const total = totalPreguntas(pistaId);
  const espacios = espaciosDePista(pistaId);
  return (
    <div style={CARD}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <span style={{ font: "600 15px 'Playfair Display',serif", color: "#F5F2EB" }}>{titulo}</span>
        <span style={{ font: "600 10px 'Plus Jakarta Sans',sans-serif", letterSpacing: ".08em", textTransform: "uppercase", color: "#C8A15A" }}>
          0 de {total}
        </span>
      </div>
      <span style={{ font: "400 11.5px 'Plus Jakarta Sans',sans-serif", color: "#5A5A5A" }}>
        {espacios.length} espacio{espacios.length === 1 ? "" : "s"} · Próximamente
      </span>
    </div>
  );
}
