import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import EditorForm from "@/components/EditorForm";

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
  const card = await prisma.card.findUnique({ where: { slug } });
  if (!card) notFound();

  return <EditorForm card={card} saved={saved === "1"} />;
}
