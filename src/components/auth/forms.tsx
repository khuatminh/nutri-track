"use client";
import Link from "next/link";
import { useActionState } from "react";
import { forgotAction, loginAction, registerAction, resetAction, type FormState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

const initial: FormState = {};

function Banner({ state }: { state: FormState }) {
  if (state.error && !state.fields) return <p role="alert" className="rounded-md bg-danger-soft p-3 text-sm font-semibold text-danger">⚠ {state.error}</p>;
  if (state.message) return <p role="status" className="rounded-md bg-success-soft p-3 text-sm font-semibold text-success">✓ {state.message}</p>;
  return null;
}

export function LoginForm({ resetOk }: { resetOk?: boolean }) {
  const [s, action, pending] = useActionState(loginAction, initial);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {resetOk && <p role="status" className="rounded-md bg-success-soft p-3 text-sm font-semibold text-success">✓ Đã đặt lại mật khẩu. Hãy đăng nhập.</p>}
      <Banner state={s} />
      <Input label="Email" name="email" type="email" autoComplete="email" required error={s.fields?.email} />
      <Input label="Mật khẩu" name="password" type="password" autoComplete="current-password" required error={s.fields?.password} />
      <Button type="submit" loading={pending} block>{pending ? "Đang đăng nhập…" : "Đăng nhập"}</Button>
      <div className="flex justify-between text-sm">
        <Link href="/quen-mat-khau" className="text-primary underline">Quên mật khẩu?</Link>
        <Link href="/dang-ky" className="text-primary underline">Tạo tài khoản</Link>
      </div>
    </form>
  );
}

export function RegisterForm() {
  const [s, action, pending] = useActionState(registerAction, initial);
  const tz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "Asia/Ho_Chi_Minh";
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Banner state={s} />
      <input type="hidden" name="timezone" value={tz} />
      <Input label="Email" name="email" type="email" autoComplete="email" required error={s.fields?.email} />
      <Input label="Mật khẩu" name="password" type="password" autoComplete="new-password" required hint="Tối thiểu 8 ký tự, gồm chữ và số" error={s.fields?.password} />
      <div>
        <label className="flex min-h-11 items-start gap-3 text-sm">
          <input type="checkbox" name="consent" className="mt-1 size-5" aria-invalid={!!s.fields?.consent || undefined} aria-describedby={s.fields?.consent ? "consent-err" : undefined} />
          <span>Tôi đồng ý cho NutriTrack lưu trữ và xử lý dữ liệu sức khỏe của tôi (cân nặng, chiều cao, nhật ký ăn uống) để cung cấp dịch vụ. Dữ liệu không được bán hay chia sẻ cho bên thứ ba.</span>
        </label>
        {s.fields?.consent && <p id="consent-err" role="alert" className="text-xs font-semibold text-danger">⚠ {s.fields.consent}</p>}
      </div>
      <Button type="submit" loading={pending} block>{pending ? "Đang tạo tài khoản…" : "Tạo tài khoản"}</Button>
      <p className="text-center text-sm">Đã có tài khoản? <Link href="/dang-nhap" className="text-primary underline">Đăng nhập</Link></p>
    </form>
  );
}

export function ForgotForm() {
  const [s, action, pending] = useActionState(forgotAction, initial);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Banner state={s} />
      <Input label="Email" name="email" type="email" autoComplete="email" required error={s.fields?.email} />
      <Button type="submit" loading={pending} block>Gửi liên kết đặt lại</Button>
      <p className="text-center text-sm"><Link href="/dang-nhap" className="text-primary underline">Quay lại đăng nhập</Link></p>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [s, action, pending] = useActionState(resetAction, initial);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Banner state={s} />
      <input type="hidden" name="token" value={token} />
      <Input label="Mật khẩu mới" name="password" type="password" autoComplete="new-password" required hint="Tối thiểu 8 ký tự, gồm chữ và số" error={s.fields?.password} />
      <Button type="submit" loading={pending} block>Đặt lại mật khẩu</Button>
    </form>
  );
}
