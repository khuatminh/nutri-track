// Integration tests: need a real Postgres. Run with DATABASE_URL set (see README "Kiểm thử").
import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { changePassword, deleteAccount, login, logout, register, requestPasswordReset, resetPassword } from "./service";
import { hashToken } from "./tokens";

const run = process.env.DATABASE_URL ? describe : describe.skip;
const email = `it-${Date.now()}@example.test`;
const pw = "matkhau123";

run("auth service (db)", () => {
  afterAll(async () => {
    await db.user.deleteMany({ where: { email: { startsWith: "it-" } } });
    await db.loginAttempt.deleteMany({ where: { email: { startsWith: "it-" } } });
    await db.$disconnect();
  });

  it("registers, rejects duplicates, stores only hashes", async () => {
    const r = await register({ email, password: pw, timezone: "Asia/Ho_Chi_Minh" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const user = await db.user.findUniqueOrThrow({ where: { id: r.userId } });
    expect(user.passwordHash).toMatch(/^\$argon2id\$/);
    expect(user.consentAt).not.toBeNull();
    expect(await db.session.findUnique({ where: { id: r.token } })).toBeNull(); // raw token is not stored
    expect(await db.session.findUnique({ where: { id: hashToken(r.token) } })).not.toBeNull();
    expect((await register({ email, password: pw, timezone: "UTC" })).ok).toBe(false);
  });

  it("logs in, logs out", async () => {
    const r = await login({ email, password: pw });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    await logout(r.token);
    expect(await db.session.findUnique({ where: { id: hashToken(r.token) } })).toBeNull();
  });

  it("change password revokes other sessions but keeps current", async () => {
    const a = await login({ email, password: pw });
    const b = await login({ email, password: pw });
    if (!a.ok || !b.ok) throw new Error("login failed");
    const res = await changePassword({ userId: a.userId, currentSessionToken: a.token, currentPassword: pw, newPassword: "moi12345" });
    expect(res.ok).toBe(true);
    expect(await db.session.findUnique({ where: { id: hashToken(a.token) } })).not.toBeNull();
    expect(await db.session.findUnique({ where: { id: hashToken(b.token) } })).toBeNull();
    expect((await changePassword({ userId: a.userId, currentSessionToken: a.token, currentPassword: "sai", newPassword: "khac12345" })).ok).toBe(false);
  });

  it("locks out after 5 wrong passwords, even for the right one", async () => {
    for (let i = 0; i < 5; i++) expect((await login({ email, password: "sai-mat-khau" })).ok).toBe(false);
    const r = await login({ email, password: "moi12345" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.lockedForMs).toBeGreaterThan(0);
    await db.loginAttempt.deleteMany({ where: { email } });
  });

  it("reset token is single-use, expires, and revokes all sessions", async () => {
    const s = await login({ email, password: "moi12345" });
    if (!s.ok) throw new Error("login failed");
    const user = await db.user.findUniqueOrThrow({ where: { email } });
    await requestPasswordReset(email, "http://localhost:3000").catch(() => undefined); // mail may be down in CI
    const token = "tok-" + "x".repeat(40);
    await db.passwordResetToken.create({ data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 60000) } });
    expect((await resetPassword(token, "lai123456")).ok).toBe(true);
    expect((await resetPassword(token, "lai654321")).ok).toBe(false);
    expect(await db.session.count({ where: { userId: user.id } })).toBe(0);
    const old = "old-" + "y".repeat(40);
    await db.passwordResetToken.create({ data: { userId: user.id, tokenHash: hashToken(old), expiresAt: new Date(Date.now() - 1) } });
    expect((await resetPassword(old, "lai123456")).ok).toBe(false);
    expect((await login({ email, password: "lai123456" })).ok).toBe(true);
  });

  it("deletes the account with its data", async () => {
    const user = await db.user.findUniqueOrThrow({ where: { email } });
    expect((await deleteAccount(user.id, "sai")).ok).toBe(false);
    expect((await deleteAccount(user.id, "lai123456")).ok).toBe(true);
    expect(await db.user.findUnique({ where: { email } })).toBeNull();
  });
});
