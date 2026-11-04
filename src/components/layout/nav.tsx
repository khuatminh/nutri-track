"use client";
import { BarChart3, BookOpen, ChefHat, Home, Plus, Scale, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const MOBILE = [
  { href: "/hom-nay", label: "Hôm nay", icon: Home },
  { href: "/nhat-ky", label: "Nhật ký", icon: BookOpen },
  { href: "/nhat-ky/them", label: "Thêm món", icon: Plus, fab: true },
  { href: "/bao-cao", label: "Báo cáo", icon: BarChart3 },
  { href: "/ho-so", label: "Hồ sơ", icon: User },
] as const;

const SIDE = [
  { href: "/hom-nay", label: "Hôm nay", icon: Home },
  { href: "/nhat-ky", label: "Nhật ký", icon: BookOpen },
  { href: "/cong-thuc", label: "Công thức", icon: ChefHat },
  { href: "/can-nang", label: "Cân nặng", icon: Scale },
  { href: "/bao-cao", label: "Báo cáo", icon: BarChart3 },
  { href: "/ho-so", label: "Hồ sơ & cài đặt", icon: User },
] as const;

function isActive(path: string, href: string): boolean {
  if (href === "/nhat-ky") return path === "/nhat-ky";
  return path === href || path.startsWith(`${href}/`);
}

export function BottomNav() {
  const path = usePathname();
  return (
    <nav aria-label="Điều hướng chính" className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-surface px-1 pb-[max(env(safe-area-inset-bottom),8px)] pt-1.5 lg:hidden">
      {MOBILE.map(({ href, label, icon: Icon, ...rest }) => {
        const active = isActive(path, href);
        const fab = "fab" in rest;
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined} aria-label={label} className={cn("flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold", active ? "text-primary-soft-text" : "text-muted", fab && "-mt-5")}>
            {fab ? (
              <span className="grid size-[52px] place-items-center rounded-full bg-primary text-primary-contrast shadow-[var(--shadow-2)]">
                <Icon className="size-7" aria-hidden />
              </span>
            ) : (
              <>
                <span className={cn("rounded-full px-4 py-0.5", active && "bg-primary-soft")}><Icon className="size-5" aria-hidden /></span>
                {label}
              </>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({ name }: { name: string }) {
  const path = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh w-16 shrink-0 flex-col gap-1 border-r border-border bg-surface px-2 py-5 lg:flex xl:w-[var(--sidebar-w)] xl:px-3">
      <p className="px-3 pb-4 text-lg font-bold text-primary-soft-text"><span aria-hidden>🥗</span><span className="hidden xl:inline"> NutriTrack</span></p>
      <nav aria-label="Điều hướng chính" className="flex flex-col gap-1">
        {SIDE.map(({ href, label, icon: Icon }) => {
          const active = isActive(path, href);
          return (
            <Link key={href} href={href} title={label} aria-current={active ? "page" : undefined} className={cn("flex min-h-11 items-center gap-3 rounded-md px-3 font-semibold", active ? "bg-primary-soft text-primary-soft-text" : "text-muted hover:bg-surface-2")}>
              <Icon className="size-5 shrink-0" aria-hidden />
              <span className="hidden xl:inline">{label}</span>
              <span className="sr-only xl:hidden">{label}</span>
            </Link>
          );
        })}
      </nav>
      <Link href="/nhat-ky/them" className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-3 font-semibold text-primary-contrast">
        <Plus className="size-5" aria-hidden /><span className="hidden xl:inline">Thêm món</span><span className="sr-only xl:hidden">Thêm món</span>
      </Link>
      <p className="mt-auto hidden truncate px-3 text-xs text-muted xl:block">{name}</p>
    </aside>
  );
}
