import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { SESSION_COOKIE, SESSION_RENEW_BELOW_MS, SESSION_TTL_MS, hashToken } from "./tokens";

export interface SessionUser {
  userId: string;
  email: string;
  timezone: string;
  themePref: "system" | "light" | "dark";
  /** Raw cookie token of the current session (needed to keep it when revoking others). */
  token: string;
}

/** Resolve the current user from the httpOnly cookie. Never trust a userId from request input. */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { id: hashToken(token) },
    include: { user: { select: { id: true, email: true, timezone: true, themePref: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  if (session.expiresAt.getTime() - Date.now() < SESSION_RENEW_BELOW_MS) {
    await db.session.update({ where: { id: session.id }, data: { expiresAt: new Date(Date.now() + SESSION_TTL_MS) } });
  }
  const u = session.user;
  return { userId: u.id, email: u.email, timezone: u.timezone, themePref: u.themePref, token };
});

/** For Server Components / actions that need a signed-in user; redirects to login otherwise. */
export async function requireUser(): Promise<SessionUser> {
  const s = await getSession();
  if (!s) redirect("/dang-nhap");
  return s;
}

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
