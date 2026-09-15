import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeGoogleCode, GOOGLE_STATE_COOKIE } from "@/lib/googleOAuth";
import { prisma } from "@/lib/prisma";
import { createMemberSession } from "@/lib/memberAuth";

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
  return NextResponse.redirect(new URL("/m/dashboard", request.url));
}
