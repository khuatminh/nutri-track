import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Đăng nhập" };

export default async function Page({ searchParams }: { searchParams: Promise<{ reset?: string }> }) {
  const sp = await searchParams;
  return (
    <>
      <h1 className="mb-4 text-[1.75rem] font-bold">Đăng nhập</h1>
      <LoginForm resetOk={sp.reset === "1"} />
    </>
  );
}
