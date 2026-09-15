import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

// Separate cookie/session from lib/auth.ts's Admin (MasterN0) session —
// a Member is a real person who owns their own cards, never the platform
// superuser. Never let these two overlap.
const COOKIE_NAME = "lycard_member";
const SESSION_TTL = "30d";

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function createMemberSession(memberId: string) {
  const token = await new SignJWT({ sub: memberId, scope: "member" })
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
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroyMemberSession() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function currentMemberId(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (payload.scope !== "member") return null;
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function currentMember() {
  const id = await currentMemberId();
  if (!id) return null;
  return prisma.member.findUnique({ where: { id } });
}

export async function isMemberAuthed() {
  return (await currentMemberId()) !== null;
}

export const MEMBER_COOKIE_NAME = COOKIE_NAME;

export async function isMemberRequestAuthed(token: string | undefined) {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload.scope === "member";
  } catch {
    return false;
  }
}
