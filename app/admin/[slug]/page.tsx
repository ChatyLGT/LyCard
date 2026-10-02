import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import EditorForm from "@/components/EditorForm";
import { parseEscala } from "@/lib/escalas";
import { currentAdminScope, isMasterN0Scope } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminCardEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    saved?: string;
    siblingsCreated?: string;
    siblingError?: string;
    recipientCreated?: string;
    recipientDeleted?: string;
    recipientError?: string;
  }>;
}) {
  const { slug } = await params;
  const { saved, siblingsCreated, siblingError, recipientCreated, recipientDeleted, recipientError } = await searchParams;
  const scope = await currentAdminScope();
  if (!scope) redirect("/admin/login");
  const card = await prisma.card.findUnique({
    where: { slug },
    include: {
      program: { include: { puestos: { orderBy: { order: "asc" } } } },
      recipients: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!card) notFound();

  // Assigning a card to a Program is a MasterN0 call (scope.programId ===
  // null) — a scoped N0's cards already arrive linked via the interview/
  // membership flow (Fase 4), so they never see this selector.
  const programs = isMasterN0Scope(scope) ? await prisma.program.findMany({ orderBy: { name: "asc" } }) : [];

  return (
    <EditorForm
      card={card}
      isMasterN0={isMasterN0Scope(scope)}
      programs={programs}
      puestos={card.program?.puestos ?? []}
      medalScale={parseEscala(card.program?.medalScale)}
      rankScale={parseEscala(card.program?.rankScale)}
      contactsScale={parseEscala(card.program?.contactsScale)}
      saved={saved === "1"}
      siblingsCreated={siblingsCreated}
      siblingError={siblingError}
      recipients={card.recipients}
      recipientCreated={recipientCreated === "1"}
      recipientDeleted={recipientDeleted === "1"}
      recipientError={recipientError}
    />
  );
}
