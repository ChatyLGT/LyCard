import { redirect } from "next/navigation";
import GoogleOnlyLogin from "@/components/GoogleOnlyLogin";
import { currentEmployeeScope } from "@/lib/auth";

// Panel de Empleados: misma entrada única con Google (fusión de identidad,
// 2026-10-13). Se mantiene la ruta para no romper links ni accesos del Centro
// de Mando.
export default async function EmployeeLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  // Si ya hay una sesión con acceso a las herramientas, no se vuelve a pedir login.
  if (await currentEmployeeScope()) redirect("/empleados");
  return <GoogleOnlyLogin eyebrow="Empleado" title="Panel de Empleados" error={error} />;
}
