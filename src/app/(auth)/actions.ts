"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { fieldErrors, loginSchema, registerSchema, emailSchema, resetPasswordSchema } from "@/lib/validation/auth";
import { clearSessionCookie, getSession, setSessionCookie } from "@/server/auth";
import { login, logout, register, requestPasswordReset, resetPassword } from "@/server/auth/service";
import { rateLimit } from "@/server/rate-limit";

export interface FormState {
  error?: string;
  fields?: Record<string, string>;
  message?: string;
}

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

const str = (fd: FormData, k: string) => (typeof fd.get(k) === "string" ? (fd.get(k) as string) : "");

export async function registerAction(_: FormState, fd: FormData): Promise<FormState> {
  if (!rateLimit(`register:${await clientIp()}`, 10, 3600_000)) return { error: "Bạn thao tác quá nhanh. Vui lòng thử lại sau." };
  const p = registerSchema.safeParse({ email: str(fd, "email"), password: str(fd, "password"), consent: fd.get("consent") === "on", timezone: str(fd, "timezone") || undefined });
  if (!p.success) return { error: "Vui lòng kiểm tra lại thông tin", fields: fieldErrors(p.error) };
  const r = await register({ email: p.data.email, password: p.data.password, timezone: p.data.timezone });
  if (!r.ok) return { error: r.error, fields: r.fields };
  await setSessionCookie(r.token, r.expiresAt);
  redirect("/onboarding");
}

export async function loginAction(_: FormState, fd: FormData): Promise<FormState> {
  const ip = await clientIp();
  if (!rateLimit(`login:${ip}`, 30, 15 * 60_000)) return { error: "Bạn thao tác quá nhanh. Vui lòng thử lại sau." };
  const p = loginSchema.safeParse({ email: str(fd, "email"), password: str(fd, "password") });
  if (!p.success) return { error: "Vui lòng kiểm tra lại thông tin", fields: fieldErrors(p.error) };
  const r = await login({ ...p.data, ip });
  if (!r.ok) return { error: r.error };
  await setSessionCookie(r.token, r.expiresAt);
  redirect("/hom-nay");
}

export async function forgotAction(_: FormState, fd: FormData): Promise<FormState> {
  if (!rateLimit(`forgot:${await clientIp()}`, 5, 3600_000)) return { error: "Bạn thao tác quá nhanh. Vui lòng thử lại sau." };
  const p = emailSchema.safeParse(str(fd, "email"));
  if (!p.success) return { error: "Vui lòng kiểm tra lại thông tin", fields: { email: "Email không hợp lệ" } };
  try {
    await requestPasswordReset(p.data, process.env.APP_URL ?? "http://localhost:3000");
  } catch {
    // Do not reveal delivery problems or account existence.
  }
  return { message: "Nếu email tồn tại, chúng tôi đã gửi liên kết đặt lại mật khẩu (hiệu lực 60 phút)." };
}

export async function resetAction(_: FormState, fd: FormData): Promise<FormState> {
  const p = resetPasswordSchema.safeParse({ token: str(fd, "token"), password: str(fd, "password") });
  if (!p.success) return { error: "Vui lòng kiểm tra lại thông tin", fields: fieldErrors(p.error) };
  const r = await resetPassword(p.data.token, p.data.password);
  if (!r.ok) return { error: r.error };
  redirect("/dang-nhap?reset=1");
}

export async function logoutAction(): Promise<void> {
  const s = await getSession();
  if (s) await logout(s.token);
  await clearSessionCookie();
  redirect("/dang-nhap");
}
