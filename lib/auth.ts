import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { currentMemberId } from "@/lib/memberAuth";

const COOKIE_NAME = "lycard_admin";
// Panel de Empleados (2026-10-07) -- cookie propia, nunca la misma que
// COOKIE_NAME: así un MasterN0 puede estar logueado en /admin Y tener
// una cuenta de empleado logueada en /empleados al mismo tiempo, en el
// mismo navegador, sin que una sesión pise a la otra.
const EMPLOYEE_COOKIE_NAME = "lycard_empleado";
// Era "12h" (2026-10-07, reportado por Gunnar: "cada vez que cierro la
// app me vuelve a pedir que me conecte") -- 30 días, mismo criterio que
// ya usa la cookie de Member (lib/memberAuth.ts). Esto es un MVP sin
// datos reales todavía; la ventana de riesgo de una cookie robada vive
// bien con el resto de las prioridades de seguridad pendientes (ver
// PLAN.md), no vale la pena forzar reconexión diaria por esto.
const SESSION_TTL = "30d";

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function verifyAdminCredentials(email: string, password: string) {
  const admin = await prisma.admin.findUnique({ where: { email: email.trim().toLowerCase() } });
  // passwordHash null == una fila de Admin nacida de la promoción
  // automática Chido→Programa (Admin.memberId) -- nunca tuvo password
  // propio, nunca puede loguearse por acá. bcrypt.compare no acepta
  // null, así que se corta antes en vez de dejarlo reventar.
  if (!admin || !admin.passwordHash) return null;
  // Panel de Empleados (2026-10-07): un Admin "empleado" nunca entra por
  // /admin/login, solo por /empleados/login -- separación real en los
  // dos sentidos, no solo cookies distintas.
  if (admin.role === "empleado") return null;
  const ok = await bcrypt.compare(password, admin.passwordHash);
  return ok ? admin : null;
}

// Panel de Empleados (2026-10-07) -- mismo patrón que verifyAdminCredentials,
// espejado: solo deja pasar filas role==="empleado".
export async function verifyEmployeeCredentials(email: string, password: string) {
  const admin = await prisma.admin.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!admin || !admin.passwordHash) return null;
  if (admin.role !== "empleado") return null;
  const ok = await bcrypt.compare(password, admin.passwordHash);
  return ok ? admin : null;
}

export async function createAdminSession(adminId: string) {
  const token = await new SignJWT({ sub: adminId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(secretKey());

  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroyAdminSession() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function currentAdminId(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function isAdminAuthed() {
  return (await currentAdminId()) !== null;
}

// Panel de Empleados (2026-10-07) -- mismo mecanismo JWT que
// createAdminSession/destroyAdminSession/currentAdminId, pero bajo su
// propia cookie (EMPLOYEE_COOKIE_NAME), para que nunca se confunda ni
// se pise con una sesión de Admin.
export async function createEmployeeSession(adminId: string) {
  const token = await new SignJWT({ sub: adminId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(secretKey());

  const jar = await cookies();
  jar.set(EMPLOYEE_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroyEmployeeSession() {
  const jar = await cookies();
  jar.delete(EMPLOYEE_COOKIE_NAME);
}

export async function currentEmployeeId(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(EMPLOYEE_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

// Resuelve el scope de un empleado -- SOLO vía la cookie de empleado,
// nunca vía la de Admin ni el puente Member→Admin (esas son
// currentAdminScope, a propósito un camino separado). Exige
// role==="empleado" y programId no nulo: un empleado siempre trabaja
// sobre un Programa concreto, nunca es MasterN0-global.
export async function currentEmployeeScope(): Promise<{ id: string; programId: string } | null> {
  const id = await currentEmployeeId();
  if (!id) return null;
  const admin = await prisma.admin.findUnique({ where: { id }, select: { id: true, programId: true, role: true } });
  if (!admin || admin.role !== "empleado" || !admin.programId) return null;
  return { id: admin.id, programId: admin.programId };
}

// Las acciones de negocio que el Panel de Empleados reutiliza
// (addMemberToProgramAction, completeInterviewAction, assignDoorAction,
// markMembershipPaidAction vía requireProgramAccess) llaman a esta en
// vez de currentAdminScope directo -- así un owner y un empleado
// ejecutan literalmente la misma función/guard de canAccessProgram, sin
// pipeline de negocio duplicada. Las páginas de /admin/* y /empleados/*
// en cambio siguen llamando cada una a su propio resolver exclusivo
// (currentAdminScope / currentEmployeeScope), nunca a esta -- esa es la
// separación real de acceso entre los dos sistemas.
export async function resolveActingScope(): Promise<{ id: string; programId: string | null } | null> {
  const adminScope = await currentAdminScope();
  if (adminScope) return adminScope;
  return currentEmployeeScope();
}

// Resolves the current admin's Program scope (PLAN.md Fase 6): null means
// MasterN0 (global access), a Program id means a scoped Program N0. Looked
// up fresh from the DB each call — cheap, and means an account's scope can
// change without needing to re-issue its session token.
export async function currentAdminScope(): Promise<{ id: string; programId: string | null } | null> {
  const id = await currentAdminId();
  if (id) {
    const admin = await prisma.admin.findUnique({ where: { id }, select: { id: true, programId: true } });
    if (admin) return admin;
  }
  // Puente Member→Admin (2026-09-24, promoción automática Chido→Programa,
  // ver PLAN.md "Modelo de monetización cerrado"): un Chido promovido a
  // N0 de su propio Programa nunca tuvo login de Admin separado -- su
  // fila de Admin nace linkeada a su Member (Admin.memberId), sin cookie
  // propia. Si hay sesión de Member activa y ese Member tiene un Admin
  // linkeado, esa es su sesión de Admin también: una sola cuenta, dos
  // capacidades, sin login aparte que recordar.
  const memberId = await currentMemberId();
  if (!memberId) return null;
  return prisma.admin.findUnique({ where: { memberId }, select: { id: true, programId: true } });
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;

// isMasterN0Scope/canAccessProgram viven en lib/authScope.ts — un
// módulo puro, sin tocar cookies/DB, para poder cubrirlo al 100% con
// unit tests reales (ver vitest.config.ts + lib/__tests__/authScope.test.ts).
// Re-exportado acá para no tener que tocar los ~14 archivos que ya las
// importan de "@/lib/auth".
export { isMasterN0Scope, canAccessProgram, type AdminScope } from "@/lib/authScope";

export async function isRequestAuthed(token: string | undefined) {
  if (!token) return false;
  try {
    await jwtVerify(token, secretKey());
    return true;
  } catch {
    return false;
  }
}
