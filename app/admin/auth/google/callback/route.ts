import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeAdminGoogleCode, ADMIN_GOOGLE_STATE_COOKIE } from "@/lib/googleOAuth";
import { prisma } from "@/lib/prisma";
import { createAdminSession } from "@/lib/auth";

// Login con Google para /admin — NUNCA crea una fila de Admin. Solo es un
// método de autenticación alternativo para una cuenta que MasterN0 ya dio
// de alta a mano vía /admin/programs (ver docs/02-ARQUITECTURA.md#regla-dura).
// Si el email de Google no matchea ningún Admin existente, no entra.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const jar = await cookies();
  const raw = jar.get(ADMIN_GOOGLE_STATE_COOKIE)?.value;
  jar.delete(ADMIN_GOOGLE_STATE_COOKIE);

  let parsed: { state: string; next: string } | null = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }

  const fail = (reason: string) => {
    const url = new URL("/admin/login", request.url);
    url.searchParams.set("error", reason);
    return NextResponse.redirect(url);
  };

  if (!code || !state || !parsed || state !== parsed.state) {
    return fail("google_state_mismatch");
  }

  let profile;
  try {
    profile = await exchangeAdminGoogleCode(code);
  } catch (err) {
    console.error("Admin Google OAuth exchange failed", err);
    return fail("google_failed");
  }

  if (!profile.email) return fail("google_no_email");

  const email = profile.email.toLowerCase();
  const admin = await prisma.admin.findUnique({ where: { email } });
  await prisma.adminLoginEvent.create({
    data: { email, method: "google", success: Boolean(admin), reason: admin ? null : "google_not_admin" },
  });
  if (!admin) {
    return fail("google_not_admin");
  }

  await createAdminSession(admin.id);
  return NextResponse.redirect(new URL(parsed.next || "/admin", request.url));
}
