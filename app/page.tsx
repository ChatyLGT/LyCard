import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Home() {
  const card = await prisma.card.findFirst({ orderBy: { createdAt: "asc" } });
  redirect(card ? `/c/${card.slug}` : "/admin/login");
}
