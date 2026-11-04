import type { Metadata } from "next";
import { ForgotForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Quên mật khẩu" };

export default function Page() {
  return (
    <>
      <h1 className="mb-1 text-[1.75rem] font-bold">Quên mật khẩu</h1>
      <p className="mb-4 text-sm text-muted">Nhập email, chúng tôi sẽ gửi liên kết đặt lại mật khẩu.</p>
      <ForgotForm />
    </>
  );
}
