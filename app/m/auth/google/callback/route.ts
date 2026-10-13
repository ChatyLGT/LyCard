import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeGoogleCode, GOOGLE_STATE_COOKIE } from "@/lib/googleOAuth";
import { prisma } from "@/lib/prisma";
import { createMemberSession } from "@/lib/memberAuth";
import { ensureLegacyMembershipAndCards } from "@/lib/legacyMembership";
import { linkLegacyAdminByEmail } from "@/lib/linkLegacyAdmin";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const jar = await cookies();
  const expectedState = jar.get(GOOGLE_STATE_COOKIE)?.value;
  jar.delete(GOOGLE_STATE_COOKIE);

  const fail = (reason: string) => {
    const url = new URL("/m/login", request.url);
    url.searchParams.set("error", reason);
    return NextResponse.redirect(url);
  };

  if (!code || !state || !expectedState || state !== expectedState) {
    return fail("google_state_mismatch");
  }

  let profile;
  try {
    profile = await exchangeGoogleCode(code);
  } catch (err) {
    console.error("Google OAuth exchange failed", err);
    return fail("google_failed");
  }

  if (!profile.email) {
    return fail("google_no_email");
  }

  let member = await prisma.member.findUnique({ where: { googleId: profile.sub } });
  if (!member) {
    // Not linked by googleId yet — if a Member already exists with this
    // email (e.g. created via WhatsApp OTP earlier), link this Google
    // account to it instead of creating a duplicate person.
    member = await prisma.member.findFirst({ where: { email: profile.email } });
  }

  if (member) {
    member = await prisma.member.update({
      where: { id: member.id },
      data: {
        googleId: profile.sub,
        email: profile.email,
        name: member.name || profile.name || "",
      },
    });
  } else {
    member = await prisma.member.create({
      data: { googleId: profile.sub, email: profile.email, name: profile.name || "" },
    });
  }

  await createMemberSession(member.id);
  // Mismo alta Freemium self-service que el login por WhatsApp OTP
  // (app/m/actions.ts#verifyOtpAction) -- sin referido acá todavía (el
  // link ?ref= no viaja por el round-trip de OAuth en esta ronda).
  await ensureLegacyMembershipAndCards(member.id, null);
  // Fusión de identidad: el rol decide el destino. Owner (MasterN0 / N0 de
  // Programa) -> /admin; Oreja -> /empleados; el resto -> su dashboard.
  await linkLegacyAdminByEmail(member.id, profile.email);
  const bridge = await prisma.admin.findUnique({ where: { memberId: member.id }, select: { role: true } });
  const dest = bridge ? (bridge.role === "owner" ? "/admin" : "/empleados") : "/m/dashboard";
  return NextResponse.redirect(new URL(dest, request.url));
}
