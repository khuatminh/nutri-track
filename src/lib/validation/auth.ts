import { z } from "zod";

export const emailSchema = z
  .string({ error: "Vui lòng nhập email" })
  .trim()
  .toLowerCase()
  .max(254, "Email quá dài")
  .pipe(z.email({ error: "Email không hợp lệ" }));

/** US-01.2: ≥ 8 characters with at least one letter and one digit. */
export const passwordSchema = z
  .string({ error: "Vui lòng nhập mật khẩu" })
  .min(8, "Mật khẩu tối thiểu 8 ký tự")
  .max(128, "Mật khẩu tối đa 128 ký tự")
  .regex(/[A-Za-z]/, "Mật khẩu cần có ít nhất một chữ cái")
  .regex(/\d/, "Mật khẩu cần có ít nhất một chữ số");

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  consent: z.literal(true, { error: "Bạn cần đồng ý chính sách quyền riêng tư để tiếp tục" }),
  timezone: z.string().min(1).max(64).default("Asia/Ho_Chi_Minh"),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Vui lòng nhập mật khẩu").max(128),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10).max(200),
  password: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
  newPassword: passwordSchema,
});

/** Flatten Zod issues to `{ field: message }` (first message per field). */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    out[key] ??= issue.message;
  }
  return out;
}
