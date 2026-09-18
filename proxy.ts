import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, isRequestAuthed } from "@/lib/auth";
import { MEMBER_COOKIE_NAME, isMemberRequestAuthed } from "@/lib/memberAuth";

const MEMBER_PUBLIC_PATHS = [
  "/m/login",
  "/m/auth/google/start",
  "/m/auth/google/callback",
  // The onboarding chat has to be reachable by someone with no session yet —
  // that's the whole point, it's how a stranger becomes a Member mid-flow.
  "/m/onboarding",
];

// Same reasoning as MEMBER_PUBLIC_PATHS: the Google login round trip for
// Admin has to be reachable by someone who doesn't have an Admin session
// yet — that IS the login. Missing this (2026-09-19 bug, caught before
// shipping) meant the proxy bounced /admin/auth/google/start straight
// back to /admin/login before the route's own code ever ran.
const ADMIN_PUBLIC_PATHS = ["/admin/login", "/admin/auth/google/start", "/admin/auth/google/callback"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (ADMIN_PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    const authed = await isRequestAuthed(token);
    if (!authed) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (pathname.startsWith("/m/") && !MEMBER_PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    const token = request.cookies.get(MEMBER_COOKIE_NAME)?.value;
    const authed = await isMemberRequestAuthed(token);
    if (!authed) {
      return NextResponse.redirect(new URL("/m/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/m/:path*"],
};
