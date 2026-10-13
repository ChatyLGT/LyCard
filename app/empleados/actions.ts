"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifyEmployeeCredentials, createEmployeeSession, destroyEmployeeSession, currentEmployeeScope } from "@/lib/auth";
import { activateMembershipAndSpawnCards } from "@/lib/activateMembership";

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

// Viaje del Cliente, Fase 5 (2026-10-13) -- la estrategia real de
// reclutamiento es que la Oreja misma sea Member, con su propia
// Card/Oficina/Gemelo Digital para conseguir sus propios clientes. A
// propósito un link de puro bookkeeping (Admin.ownMemberId): NO toca
// ninguna cookie ni resolución de auth existente -- el Admin sigue
// logueado como Admin, y si quiere entrar a su propio /m/dashboard se
// loguea aparte como Member, con el WhatsApp/email que use acá. Mismo
// patrón que addMemberToProgramAction (dedupe por whatsapp, activar +
// spawnear las 3 Cards vía activateMembershipAndSpawnCards) -- nunca
// duplica pipeline de negocio.
export async function createOwnMembershipAction(formData: FormData) {
  const scope = await currentEmployeeScope();
  if (!scope) redirect("/empleados/login");

  const admin = await prisma.admin.findUnique({ where: { id: scope.id }, select: { ownMemberId: true } });
  if (admin?.ownMemberId) redirect("/empleados"); // ya vinculado -- no-op idempotente

  const name = String(formData.get("name") || "").trim();
  const whatsapp = String(formData.get("whatsapp") || "").trim() || null;
  const email = String(formData.get("email") || "").trim();
  if (!name) redirect("/empleados?ownMemberError=addName");

  const existingMember = whatsapp ? await prisma.member.findUnique({ where: { whatsapp } }) : null;
  const member = existingMember ?? (await prisma.member.create({ data: { name, whatsapp, email } }));

  const membership = await prisma.programMembership.upsert({
    where: { memberId_programId: { memberId: member.id, programId: scope.programId } },
    update: {},
    create: { memberId: member.id, programId: scope.programId, status: "invited" },
  });

  await activateMembershipAndSpawnCards(membership.id, { markInterviewed: false });
  await prisma.admin.update({ where: { id: scope.id }, data: { ownMemberId: member.id } });

  revalidatePath("/empleados");
  redirect("/empleados?ownMemberLinked=1");
}
