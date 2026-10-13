import GoogleOnlyLogin from "@/components/GoogleOnlyLogin";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; back?: string }>;
}) {
  const { error, back } = await searchParams;
  // `back`: el ícono "login" de LyCardView manda su propio slug para que
  // esta pantalla tenga salida (fix 2026-10-06); sin él cae a la raíz.
  return <GoogleOnlyLogin eyebrow="Acceso Admin" title="Panel de administración" error={error} backHref={back ? `/c/${back}` : "/"} />;
}
