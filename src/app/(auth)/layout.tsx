import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSession } from "@/server/auth";
import { NOINDEX } from "@/lib/seo";

// QLD-50: 4 trang auth gần trùng nội dung — không để Google index.
export const metadata: Metadata = { robots: NOINDEX };

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getSession()) redirect("/hom-nay");
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 p-6">
      <div className="text-center">
        <p className="text-lg font-bold text-primary-soft-text">🥗 NutriTrack</p>
        <p className="text-sm text-muted">Quản lý dinh dưỡng cho người Việt</p>
      </div>
      <div className="rounded-xl border border-border bg-surface p-6 shadow-[var(--shadow-2)]">{children}</div>
    </main>
  );
}
