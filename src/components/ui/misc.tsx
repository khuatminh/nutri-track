import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("min-w-0 rounded-lg border border-border bg-surface p-4 shadow-[var(--shadow-1)]", className)} {...rest} />;
}

type Tone = "default" | "warn" | "ok" | "danger";
const TONE: Record<Tone, string> = {
  default: "bg-primary-soft text-primary-soft-text",
  warn: "bg-warning-soft text-warning",
  ok: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
};
export function Badge({ tone = "default", className, ...rest }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold", TONE[tone], className)} {...rest} />;
}

export function EmptyState({ icon, title, hint, action }: { icon?: ReactNode; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
      {icon && <div className="text-4xl" aria-hidden>{icon}</div>}
      <h3 className="text-base font-semibold">{title}</h3>
      {hint && <p className="max-w-sm text-sm text-muted">{hint}</p>}
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-surface-2 motion-reduce:animate-none", className)} />;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-[1.75rem] font-bold leading-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Disclaimer() {
  return <p className="text-xs text-muted">Thông tin chỉ mang tính tham khảo, không phải tư vấn y tế. Hãy hỏi bác sĩ hoặc chuyên gia dinh dưỡng nếu bạn có bệnh lý.</p>;
}
