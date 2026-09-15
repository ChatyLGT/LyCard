import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { buildGoogleAuthUrl, isGoogleAuthConfigured } from "@/lib/googleOAuth";

import { GOOGLE_STATE_COOKIE } from "@/lib/googleOAuth";

export async function GET(request: NextRequest) {
  if (!isGoogleAuthConfigured()) {
    const url = new URL("/m/login", request.url);
    url.searchParams.set("error", "google_not_configured");
    return NextResponse.redirect(url);
  }

  const state = randomBytes(16).toString("hex");
  const jar = await cookies();
  jar.set(GOOGLE_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  return NextResponse.redirect(buildGoogleAuthUrl(state));
}
