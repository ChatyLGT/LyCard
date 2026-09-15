import OnboardingChat from "@/components/OnboardingChat";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  return <OnboardingChat referredByCardSlug={ref || null} />;
}
