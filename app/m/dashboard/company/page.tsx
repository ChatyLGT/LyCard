import { redirect } from "next/navigation";
import { currentMemberId } from "@/lib/memberAuth";
import { prisma } from "@/lib/prisma";
import MemberCardEditor from "@/components/MemberCardEditor";
import CardNotUnlocked from "@/components/CardNotUnlocked";

export const dynamic = "force-dynamic";

export default async function CompanyCardPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const memberId = await currentMemberId();
  if (!memberId) redirect("/m/login");

  const { saved } = await searchParams;
  const card = await prisma.card.findFirst({ where: { memberId, kind: "company" } });
  if (!card) return <CardNotUnlocked label="de Empresa" />;

  return <MemberCardEditor card={card} kind="company" saved={saved === "1"} />;
}
