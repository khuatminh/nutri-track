import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Đăng ký" };

export default function Page() {
  return (
    <>
      <h1 className="mb-4 text-[1.75rem] font-bold">Tạo tài khoản</h1>
      <RegisterForm />
    </>
  );
}
