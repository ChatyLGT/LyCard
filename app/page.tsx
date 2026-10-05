import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import MironLanding, { type MironProgramOption } from "@/components/MironLanding";

export const dynamic = "force-dynamic";

// Tarjeta visitante NA (2026-10-05, pedido de Gunnar: "Son quienes
// llegaron a la tarjeta por algún motivo sin tener un host"). Antes esta
// ruta redirigía ciego a la Card más vieja de toda la DB -- un parche de
// bootstrap, no una experiencia real para quien cae acá sin ningún
// contexto. Ahora: plataforma vacía (0 Cards) sigue yendo a /admin/login
// (primer arranque, sin cambios); con Cards reales, muestra la pantalla
// genérica de Legacy en vez de redirigir a cualquiera.
export default async function Home() {
  const cardCount = await prisma.card.count();
  if (cardCount === 0) redirect("/admin/login");

  const activePrograms = await prisma.program.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, cards: { select: { slug: true, kind: true }, orderBy: { createdAt: "asc" } } },
  });

  // Solo Programas con al menos una Card real para mostrar -- nunca un
  // link muerto. Prioriza company/project sobre personal como "cara
  // pública" del Programa (mismo criterio que isHost en app/c/[slug]).
  const programs: MironProgramOption[] = activePrograms
    .map((p) => {
      const card = p.cards.find((c) => c.kind === "project") || p.cards.find((c) => c.kind === "company") || p.cards[0];
      return card ? { id: p.id, name: p.name, cardSlug: card.slug } : null;
    })
    .filter((p): p is MironProgramOption => p !== null);

  return <MironLanding programs={programs} />;
}
