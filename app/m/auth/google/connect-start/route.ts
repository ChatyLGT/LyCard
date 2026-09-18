import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { buildGoogleConnectUrl, GOOGLE_CONNECT_COOKIE } from "@/lib/googleOAuth";
import { isGoogleAuthConfigured } from "@/lib/googleOAuth";
import { prisma } from "@/lib/prisma";
import { currentAdminScope } from "@/lib/auth";
import { currentMemberId } from "@/lib/memberAuth";

// "Conectar Google" (Fase F) — arranca desde el tile Agenda de una Card
// específica (?cardId=...), no desde un login: el dueño de esa Card ya
// puede o no tener sesión de Member; se resuelve igual que isHost en
// toda la app (Admin, Origin, o Member dueño) y el token termina en
// card.memberId, no en quien haya iniciado el flujo.
export async function GET(request: NextRequest) {
  const cardId = request.nextUrl.searchParams.get("cardId");
  const returnTo = request.nextUrl.searchParams.get("returnTo") || "/";

  if (!isGoogleAuthConfigured() || !cardId) {
    const url = new URL(returnTo, request.url);
    url.searchParams.set("error", "google_connect_failed");
    return NextResponse.redirect(url);
  }

  const card = await prisma.card.findUnique({ where: { id: cardId } });
  if (!card) {
    const url = new URL(returnTo, request.url);
    url.searchParams.set("error", "google_connect_no_card");
    return NextResponse.redirect(url);
  }

  const [adminScope, memberId] = await Promise.all([currentAdminScope(), currentMemberId()]);
  const isOwner = adminScope !== null || card.isOrigin || (memberId !== null && memberId === card.memberId);
  if (!isOwner || !card.memberId) {
    const url = new URL(returnTo, request.url);
    url.searchParams.set("error", "google_connect_forbidden");
    return NextResponse.redirect(url);
  }

  const state = randomBytes(16).toString("hex");
  const jar = await cookies();
  jar.set(
    GOOGLE_CONNECT_COOKIE,
    JSON.stringify({ state, memberId: card.memberId, returnTo }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 10,
    }
  );

  return NextResponse.redirect(buildGoogleConnectUrl(state));
}
