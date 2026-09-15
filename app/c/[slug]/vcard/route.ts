import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// The "Guardar Contacto" cube on personal cards — a real .vcf download
// rather than anything client-side, so it works as a plain link tap on any
// phone's contacts app.
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const card = await prisma.card.findUnique({ where: { slug } });
  if (!card) return new NextResponse("Not found", { status: 404 });

  const escape = (value: string) => value.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
  const website = card.web ? (card.web.startsWith("http") ? card.web : `https://${card.web}`) : null;

  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escape(card.name)}`,
    card.title ? `TITLE:${escape(card.title)}` : null,
    card.wa ? `TEL;TYPE=CELL:${escape(card.wa)}` : null,
    website ? `URL:${website}` : null,
    card.quote ? `NOTE:${escape(card.quote)}` : null,
    "END:VCARD",
  ].filter((line): line is string => Boolean(line));

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${card.slug}.vcf"`,
    },
  });
}
