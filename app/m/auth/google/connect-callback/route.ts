import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeGoogleConnectCode, GOOGLE_CONNECT_COOKIE } from "@/lib/googleOAuth";
import { ensureBridgeFolder } from "@/lib/googleServices";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const jar = await cookies();
  const raw = jar.get(GOOGLE_CONNECT_COOKIE)?.value;
  jar.delete(GOOGLE_CONNECT_COOKIE);

  let parsed: { state: string; memberId: string; returnTo: string } | null = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }

  const returnTo = parsed?.returnTo || "/";
  const fail = (reason: string) => {
    const url = new URL(returnTo, request.url);
    url.searchParams.set("error", reason);
    return NextResponse.redirect(url);
  };

  if (!code || !state || !parsed || state !== parsed.state) {
    return fail("google_connect_state_mismatch");
  }

  let tokens;
  try {
    tokens = await exchangeGoogleConnectCode(code);
  } catch (err) {
    console.error("Google connect exchange failed", err);
    return fail("google_connect_failed");
  }

  if (!tokens.refresh_token) {
    // Google no reemite refresh_token si la persona ya había dado
    // consentimiento antes sin que se le fuerce de nuevo — con
    // prompt=consent esto no debería pasar, pero si pasa, es mejor
    // avisar que guardar un estado a medias.
    return fail("google_connect_no_refresh_token");
  }

  let bridgeFolderId: string | null = null;
  try {
    bridgeFolderId = await ensureBridgeFolder(tokens.access_token);
  } catch (err) {
    console.error("No se pudo preparar la carpeta Bridge en Drive", err);
    // No es fatal: guardamos igual la conexión de Calendar/Tasks, la
    // carpeta Bridge se puede reintentar después (próxima Nota de Voz).
  }

  await prisma.member.update({
    where: { id: parsed.memberId },
    data: {
      googleRefreshToken: tokens.refresh_token,
      googleScopes: tokens.scope,
      googleConnectedAt: new Date(),
      ...(bridgeFolderId ? { googleBridgeFolderId: bridgeFolderId } : {}),
    },
  });

  const url = new URL(returnTo, request.url);
  url.searchParams.set("google_connected", "1");
  return NextResponse.redirect(url);
}
