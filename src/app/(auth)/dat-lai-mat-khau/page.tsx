import type { Metadata } from "next";
import Link from "next/link";
import { ResetForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Đặt lại mật khẩu" };

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <>
      <h1 className="mb-4 text-[1.75rem] font-bold">Đặt lại mật khẩu</h1>
      {token ? <ResetForm token={token} /> : <p>Liên kết không hợp lệ. <Link href="/quen-mat-khau" className="text-primary underline">Yêu cầu liên kết mới</Link></p>}
    </>
  );
}
