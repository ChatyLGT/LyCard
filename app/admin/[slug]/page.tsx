import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import EditorForm from "@/components/EditorForm";
import { parseEscala } from "@/lib/escalas";
import { currentAdminScope } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminCardEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { slug } = await params;
  const { saved } = await searchParams;
  const scope = await currentAdminScope();
  if (!scope) redirect("/admin/login");
  const card = await prisma.card.findUnique({
    where: { slug },
    include: { program: { include: { puestos: { orderBy: { order: "asc" } } } } },
  });
  if (!card) notFound();

  // Assigning a card to a Program is a MasterN0 call (scope.programId ===
  // null) — a scoped N0's cards already arrive linked via the interview/
  // membership flow (Fase 4), so they never see this selector.
  const programs = scope.programId ? [] : await prisma.program.findMany({ orderBy: { name: "asc" } });

  return (
    <EditorForm
      card={card}
      isMasterN0={!scope.programId}
      programs={programs}
      puestos={card.program?.puestos ?? []}
      medalScale={parseEscala(card.program?.medalScale)}
      rankScale={parseEscala(card.program?.rankScale)}
      saved={saved === "1"}
    />
  );
}
