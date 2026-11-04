import { describe, expect, it } from "vitest";
import { LOCKOUT_WINDOW_MS, hashToken, lockoutRemainingMs, newToken } from "./tokens";

describe("tokens", () => {
  it("generates unique 32-byte tokens and stable SHA-256 hashes", () => {
    const a = newToken();
    expect(a).not.toBe(newToken());
    expect(Buffer.from(a, "base64url")).toHaveLength(32);
    expect(hashToken(a)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(a)).toBe(hashToken(a));
    expect(hashToken(a)).not.toBe(a);
  });
});

describe("lockout", () => {
  const now = new Date("2026-11-04T12:00:00Z");
  const ago = (ms: number) => new Date(now.getTime() - ms);
  it("is not locked under 5 failures", () => {
    expect(lockoutRemainingMs([ago(1000), ago(2000), ago(3000), ago(4000)], now)).toBe(0);
  });
  it("locks at 5 failures until the oldest leaves the window", () => {
    const f = [ago(60_000), ago(50_000), ago(40_000), ago(30_000), ago(20_000)];
    expect(lockoutRemainingMs(f, now)).toBe(LOCKOUT_WINDOW_MS - 60_000);
  });
  it("ignores failures outside the window", () => {
    const f = [ago(LOCKOUT_WINDOW_MS + 1), ago(1), ago(2), ago(3), ago(4)];
    expect(lockoutRemainingMs(f, now)).toBe(0);
  });
});
