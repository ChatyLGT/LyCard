import { redirect } from "next/navigation";
import { currentMemberId } from "@/lib/memberAuth";
import { prisma } from "@/lib/prisma";
import MemberStoryEditor from "@/components/MemberStoryEditor";
import CardNotUnlocked from "@/components/CardNotUnlocked";

export const dynamic = "force-dynamic";

export default async function ProjectStoryPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const memberId = await currentMemberId();
  if (!memberId) redirect("/m/login");

  const { saved } = await searchParams;
  const card = await prisma.card.findFirst({ where: { memberId, kind: "project" } });
  if (!card) return <CardNotUnlocked label="Proyecto" />;

  return <MemberStoryEditor card={card} saved={saved === "1"} />;
}
