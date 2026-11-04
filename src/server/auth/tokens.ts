import { createHash, randomBytes } from "node:crypto";

export const SESSION_COOKIE = "nt_session";
export const SESSION_TTL_MS = 30 * 24 * 3600 * 1000;
export const SESSION_RENEW_BELOW_MS = 15 * 24 * 3600 * 1000;
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
export const LOCKOUT_MAX_FAILURES = 5;
export const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;

/** 32 random bytes, base64url. Only its SHA-256 is persisted (ADR §2.2). */
export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Minutes until a lockout expires, or 0 when not locked. `failureTimes` are recent failures. */
export function lockoutRemainingMs(failureTimes: readonly Date[], now: Date = new Date()): number {
  const recent = failureTimes
    .filter((t) => now.getTime() - t.getTime() < LOCKOUT_WINDOW_MS)
    .sort((a, b) => a.getTime() - b.getTime());
  if (recent.length < LOCKOUT_MAX_FAILURES) return 0;
  // The lock lifts when the oldest counted failure leaves the window.
  const oldestCounted = recent[recent.length - LOCKOUT_MAX_FAILURES]!;
  return Math.max(0, oldestCounted.getTime() + LOCKOUT_WINDOW_MS - now.getTime());
}
