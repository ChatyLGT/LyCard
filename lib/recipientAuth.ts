import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

// Gate de tarjeta completa para "Invitado/Visitante Especial" (2026-10-05,
// pedido de Gunnar: la tarjeta personalizada por `?para=` se abre recién
// cuando confirma la palabra secreta entregada junto a la invitación --
// antes esto era un gate a nivel de MODAL (ya sacado, ver lib/legacy de
// Thread 2 de esta ronda); ahora es la Card ENTERA). Mismo patrón
// JWT-firmado-en-cookie que lib/memberAuth.ts, pero sin cuenta real detrás:
// el visitante puede no tener ningún Member todavía, así que esto no
// reusa esa sesión -- la cookie queda scoped al CardRecipient puntual
// (su id), no a una persona.
const COOKIE_NAME = "lycard_recipient_unlock";
const SESSION_TTL = "180d";

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function unlockRecipientSession(recipientId: string) {
  const token = await new SignJWT({ sub: recipientId, scope: "recipient" })
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
    maxAge: 60 * 60 * 24 * 180,
  });
}

export async function isRecipientUnlocked(recipientId: string): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload.scope === "recipient" && payload.sub === recipientId;
  } catch {
    return false;
  }
}
