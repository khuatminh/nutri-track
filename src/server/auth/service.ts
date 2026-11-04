import { db } from "@/server/db";
import { sendPasswordResetEmail } from "./mail";
import { burnPasswordCheck, hashPassword, verifyPassword } from "./password";
import {
  LOCKOUT_WINDOW_MS,
  RESET_TOKEN_TTL_MS,
  SESSION_TTL_MS,
  hashToken,
  lockoutRemainingMs,
  newToken,
} from "./tokens";

export type AuthResult<T = object> =
  | ({ ok: true } & T)
  | { ok: false; error: string; fields?: Record<string, string>; lockedForMs?: number };

const GENERIC_LOGIN_ERROR = "Email hoặc mật khẩu không đúng";

async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.session.create({ data: { id: hashToken(token), userId, expiresAt } });
  return { token, expiresAt };
}

/** US-01: creates the account and a session. Email uniqueness is enforced by the DB. */
export async function register(input: {
  email: string;
  password: string;
  timezone: string;
}): Promise<AuthResult<{ userId: string; token: string; expiresAt: Date }>> {
  const exists = await db.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (exists) return { ok: false, error: "Email này đã được đăng ký", fields: { email: "Email này đã được đăng ký" } };
  const passwordHash = await hashPassword(input.password);
  try {
    const user = await db.user.create({
      data: { email: input.email, passwordHash, timezone: input.timezone, consentAt: new Date(), lastLoginAt: new Date() },
      select: { id: true },
    });
    return { ok: true, userId: user.id, ...(await createSession(user.id)) };
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") {
      return { ok: false, error: "Email này đã được đăng ký", fields: { email: "Email này đã được đăng ký" } };
    }
    throw e;
  }
}

/** US-02: login with lockout after 5 failures / 15 min (ADR §2.2). */
export async function login(input: {
  email: string;
  password: string;
  ip?: string | null;
}): Promise<AuthResult<{ userId: string; token: string; expiresAt: Date }>> {
  const since = new Date(Date.now() - LOCKOUT_WINDOW_MS);
  const failures = await db.loginAttempt.findMany({
    where: { email: input.email, success: false, createdAt: { gt: since } },
    select: { createdAt: true },
  });
  const locked = lockoutRemainingMs(failures.map((f) => f.createdAt));
  if (locked > 0) {
    const min = Math.ceil(locked / 60000);
    return { ok: false, error: `Tài khoản tạm khoá do đăng nhập sai nhiều lần. Thử lại sau ${min} phút.`, lockedForMs: locked };
  }

  const user = await db.user.findUnique({ where: { email: input.email } });
  const valid = user ? await verifyPassword(user.passwordHash, input.password) : (await burnPasswordCheck(input.password), false);
  await db.loginAttempt.create({ data: { email: input.email, ip: input.ip ?? null, success: valid } });
  if (!user || !valid) return { ok: false, error: GENERIC_LOGIN_ERROR };

  // A successful login clears the failure counter.
  await db.loginAttempt.deleteMany({ where: { email: input.email, success: false } });
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return { ok: true, userId: user.id, ...(await createSession(user.id)) };
}

export async function logout(token: string): Promise<void> {
  await db.session.deleteMany({ where: { id: hashToken(token) } });
}

/** US-02.5: always succeeds from the caller's perspective (no account enumeration). */
export async function requestPasswordReset(email: string, appUrl: string): Promise<void> {
  const user = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return;
  const token = newToken();
  await db.passwordResetToken.create({
    data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
  });
  await sendPasswordResetEmail(email, `${appUrl}/dat-lai-mat-khau?token=${encodeURIComponent(token)}`);
}

/** Single-use token; on success all sessions are revoked (US-04.1). */
export async function resetPassword(token: string, newPassword: string): Promise<AuthResult> {
  const row = await db.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!row || row.usedAt || row.expiresAt < new Date()) {
    return { ok: false, error: "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn" };
  }
  const owner = await db.user.findUnique({ where: { id: row.userId }, select: { email: true } });
  if (!owner) return { ok: false, error: "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn" };
  const passwordHash = await hashPassword(newPassword);
  const claimed = await db.passwordResetToken.updateMany({
    where: { id: row.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (claimed.count !== 1) return { ok: false, error: "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn" };
  await db.$transaction([
    db.user.update({ where: { id: row.userId }, data: { passwordHash } }),
    db.session.deleteMany({ where: { userId: row.userId } }),
    db.loginAttempt.deleteMany({ where: { email: owner.email } }),
  ]);
  return { ok: true };
}

/** US-04.1: verifies the current password, then revokes every other session. */
export async function changePassword(input: {
  userId: string;
  currentSessionToken: string;
  currentPassword: string;
  newPassword: string;
}): Promise<AuthResult> {
  const user = await db.user.findUnique({ where: { id: input.userId } });
  if (!user || !(await verifyPassword(user.passwordHash, input.currentPassword))) {
    return { ok: false, error: "Mật khẩu hiện tại không đúng", fields: { currentPassword: "Mật khẩu hiện tại không đúng" } };
  }
  const passwordHash = await hashPassword(input.newPassword);
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { passwordHash } }),
    db.session.deleteMany({ where: { userId: user.id, NOT: { id: hashToken(input.currentSessionToken) } } }),
  ]);
  return { ok: true };
}

/** US-04.3: hard-deletes the account and all dependent rows (cascade). */
export async function deleteAccount(userId: string, password: string): Promise<AuthResult> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || !(await verifyPassword(user.passwordHash, password))) {
    return { ok: false, error: "Mật khẩu không đúng", fields: { password: "Mật khẩu không đúng" } };
  }
  await db.user.delete({ where: { id: userId } });
  return { ok: true };
}
