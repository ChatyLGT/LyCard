import { redirect } from "next/navigation";
import { currentMemberId } from "@/lib/memberAuth";
import { prisma } from "@/lib/prisma";
import MemberCardEditor from "@/components/MemberCardEditor";
import CardNotUnlocked from "@/components/CardNotUnlocked";

export const dynamic = "force-dynamic";

export default async function PersonalCardPage({ searchParams }: { searchParams: Promise<{ saved?: string; focus?: string }> }) {
  const memberId = await currentMemberId();
  if (!memberId) redirect("/m/login");

  const { saved, focus } = await searchParams;
  const card = await prisma.card.findFirst({ where: { memberId, kind: "personal" } });
  if (!card) return <CardNotUnlocked label="Personal" />;

  return <MemberCardEditor card={card} kind="personal" saved={saved === "1"} focusOffice={focus === "oficina"} />;
}
