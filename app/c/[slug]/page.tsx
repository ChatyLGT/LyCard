import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { isAdminAuthed } from "@/lib/auth";
import LyCardView from "@/components/LyCardView";

export const dynamic = "force-dynamic";

export default async function CardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const card = await prisma.card.findUnique({ where: { slug } });
  if (!card) notFound();

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const cardUrl = `${baseUrl}/c/${card.slug}`;
  const [qrSvg, isAdmin] = await Promise.all([
    QRCode.toString(cardUrl, {
      type: "svg",
      margin: 1,
      color: { dark: "#141414", light: "#FFFFFF" },
    }),
    isAdminAuthed(),
  ]);

  return <LyCardView card={card} cardUrl={cardUrl} qrSvg={qrSvg} isAdmin={isAdmin} />;
}
