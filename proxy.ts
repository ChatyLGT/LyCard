import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, isRequestAuthed } from "@/lib/auth";
import { MEMBER_COOKIE_NAME, isMemberRequestAuthed } from "@/lib/memberAuth";

const MEMBER_PUBLIC_PATHS = ["/m/login", "/m/auth/google/start", "/m/auth/google/callback"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login") {
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
