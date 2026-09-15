import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import EditorForm from "@/components/EditorForm";
import { parseEscala } from "@/lib/escalas";

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
  const card = await prisma.card.findUnique({
    where: { slug },
    include: { program: { include: { puestos: { orderBy: { order: "asc" } } } } },
  });
  if (!card) notFound();

  return (
    <EditorForm
      card={card}
      puestos={card.program?.puestos ?? []}
      medalScale={parseEscala(card.program?.medalScale)}
      rankScale={parseEscala(card.program?.rankScale)}
      saved={saved === "1"}
    />
  );
}
