"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyEmployeeCredentials, createEmployeeSession, destroyEmployeeSession } from "@/lib/auth";

// Panel de Empleados (2026-10-07) -- login propio, cookie propia
// (lycard_empleado), nunca comparte sesión con /admin/login. Mismo
// patrón de bitácora que loginAction (app/admin/actions.ts), para no
// perder visibilidad de intentos fallidos.
export async function employeeLoginAction(formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");

  const admin = await verifyEmployeeCredentials(email, password);
  await prisma.adminLoginEvent.create({
    data: { email: email.trim().toLowerCase(), method: "password", success: Boolean(admin), reason: admin ? null : "bad_credentials" },
  });
  if (!admin) {
    redirect("/empleados/login?error=1");
  }

  await createEmployeeSession(admin.id);
  redirect("/empleados");
}

export async function employeeLogoutAction() {
  await destroyEmployeeSession();
  redirect("/empleados/login");
}
