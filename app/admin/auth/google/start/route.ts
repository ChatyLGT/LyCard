import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { buildAdminGoogleAuthUrl, isGoogleAuthConfigured, ADMIN_GOOGLE_STATE_COOKIE } from "@/lib/googleOAuth";

export async function GET(request: NextRequest) {
  const next = request.nextUrl.searchParams.get("next") || "/admin";

  if (!isGoogleAuthConfigured()) {
    const url = new URL("/admin/login", request.url);
    url.searchParams.set("error", "google_not_configured");
    return NextResponse.redirect(url);
  }

  const state = randomBytes(16).toString("hex");
  const jar = await cookies();
  jar.set(ADMIN_GOOGLE_STATE_COOKIE, JSON.stringify({ state, next }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  return NextResponse.redirect(buildAdminGoogleAuthUrl(state));
}
