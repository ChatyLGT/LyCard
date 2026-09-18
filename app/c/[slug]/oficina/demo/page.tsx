import OfficeDemoChat from "@/components/OfficeDemoChat";

export const dynamic = "force-dynamic";

// Demo guiada del "Gemelo Digital" para el dueño de la Oficina — no el
// flujo real de alta de miembro (/m/onboarding, que ya existe y sigue
// siendo lo que ve un visitante). Cero server actions, cero datos reales.
export default async function OfficeDemoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <OfficeDemoChat backHref={`/c/${slug}/oficina`} />;
}
