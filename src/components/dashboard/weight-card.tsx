"use client";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { setHideWeightAction } from "@/app/(app)/actions";
import { Card } from "@/components/ui/misc";
import { fmtKg } from "@/lib/format";
import { fmtShortDate } from "@/lib/dates";
import type { WeightDto } from "@/server/weight/service";

export function WeightCard({ weight, hidden: initialHidden }: { weight: WeightDto | null; hidden: boolean }) {
  const [hidden, setHidden] = useState(initialHidden);
  const [, start] = useTransition();
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Cân nặng</h2>
        <button
          className="grid size-11 place-items-center rounded-full hover:bg-surface-2"
          aria-pressed={hidden}
          aria-label={hidden ? "Hiện cân nặng" : "Ẩn cân nặng"}
          onClick={() => { const next = !hidden; setHidden(next); start(() => setHideWeightAction(next)); }}
        >
          {hidden ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
        </button>
      </div>
      {hidden ? (
        <p className="text-sm text-muted"><span className="text-xl font-bold text-text">••••</span> Số cân nặng đang được ẩn. Bấm biểu tượng mắt để hiện lại.</p>
      ) : weight ? (
        <p><strong className="text-2xl">{fmtKg(weight.weightKg)}</strong> <span className="text-sm text-muted">· {fmtShortDate(weight.date)}</span></p>
      ) : (
        <p className="text-sm text-muted">Chưa có bản ghi cân nặng.</p>
      )}
      {!hidden && <Link href="/can-nang" className="min-h-11 content-center text-sm font-semibold text-primary underline">Ghi cân nặng & xem xu hướng</Link>}
    </Card>
  );
}
