import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentAdminScope } from "@/lib/auth";
import { currentMemberId } from "@/lib/memberAuth";
import { parseOfficeSkills, DEFAULT_OFFICE_SKILLS } from "@/lib/officeSkills";
import { parseRealityCheckKpis, DEFAULT_REALITY_CHECK_KPIS } from "@/lib/oficinaExtras";
import OfficeDemoChat from "@/components/OfficeDemoChat";
import type { GemeloContext } from "@/lib/gemeloDigitalScript";

export const dynamic = "force-dynamic";

// Demo guiada del "Gemelo Digital" para el dueño de la Oficina — Bot
// Warren (pedido de Gunnar, 2026-09-23): la puerta simulada a tu Gemelo
// Digital, el "CEO" de tu Oficina. Privada del dueño (mismo criterio que
// Check de Realidad/Notas de Voz): las respuestas simuladas usan
// oficinaObjetivo/realityCheckKpis, que son datos privados — nunca deben
// quedar expuestos a un visitante que entre directo a esta URL.
export default async function OfficeDemoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const card = await prisma.card.findUnique({ where: { slug }, include: { program: true, puesto: true } });
  if (!card) notFound();

  const [adminScope, memberId] = await Promise.all([currentAdminScope(), currentMemberId()]);
  const isAdmin = adminScope !== null;
  const isHost = isAdmin || card.isOrigin || (memberId !== null && memberId === card.memberId);
  if (!isHost) redirect(`/c/${slug}/oficina`);

  const skillsParsed = parseOfficeSkills(card.program?.officeSkills);
  const skills = skillsParsed.length > 0 ? skillsParsed : DEFAULT_OFFICE_SKILLS;

  const kpisParsed = parseRealityCheckKpis(card.realityCheckKpis);
  const kpisAreDefault = kpisParsed.length === 0;
  const kpis = kpisAreDefault ? DEFAULT_REALITY_CHECK_KPIS : kpisParsed;

  const context: GemeloContext = {
    ownerName: card.name,
    roleLabel: card.puesto?.denominacion || card.title || "el dueño",
    programName: card.program?.name || "tu Legacy",
    quote: card.quote,
    objetivo: card.oficinaObjetivo,
    enabledSkillNames: skills.filter((s) => s.enabled).map((s) => s.nombre),
    kpis,
    kpisAreDefault,
  };

  return <OfficeDemoChat backHref={`/c/${slug}/oficina`} context={context} />;
}
