"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { acceptRetargetAction, dismissRetargetAction } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/dialog";
import { Card } from "@/components/ui/misc";
import { fmtInt, fmtKg } from "@/lib/format";
import type { RetargetSuggestion } from "@/server/profile/service";

/** US-18: ask to recompute targets after a ≥ 1 kg change. */
export function RetargetPrompt({ s }: { s: RetargetSuggestion }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const done = () => { setOpen(false); router.refresh(); };
  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 border-primary bg-primary-soft">
      <p className="text-sm font-semibold text-primary-soft-text">Cân nặng mới {fmtKg(s.newWeightKg)}. Cập nhật mục tiêu kcal theo cân nặng mới?</p>
      <Button size="sm" onClick={() => setOpen(true)}>Xem gợi ý</Button>
      <Sheet open={open} onOpenChange={setOpen} title="Cập nhật mục tiêu?" description="Các ngày trước vẫn giữ mục tiêu cũ.">
        <dl className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 gap-y-2 text-sm">
          <dt className="font-semibold">Kcal</dt><dd>{fmtInt(s.current.kcal)}</dd><dd className="font-bold">→ {fmtInt(s.proposed.kcal)}</dd>
          <dt className="font-semibold">Đạm (g)</dt><dd>{s.current.proteinG}</dd><dd className="font-bold">→ {s.proposed.proteinG}</dd>
          <dt className="font-semibold">Tinh bột (g)</dt><dd>{s.current.carbG}</dd><dd className="font-bold">→ {s.proposed.carbG}</dd>
          <dt className="font-semibold">Béo (g)</dt><dd>{s.current.fatG}</dd><dd className="font-bold">→ {s.proposed.fatG}</dd>
        </dl>
        {s.isCustom && <p className="text-sm text-warning">Bạn đang dùng mục tiêu tùy chỉnh — đồng ý sẽ chuyển về tự động.</p>}
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" disabled={pending} onClick={() => start(async () => { await dismissRetargetAction(); done(); })}>{s.isCustom ? "Giữ mục tiêu của tôi" : "Giữ nguyên"}</Button>
          <Button className="flex-1" loading={pending} onClick={() => start(async () => { await acceptRetargetAction(); done(); })}>Cập nhật</Button>
        </div>
      </Sheet>
    </Card>
  );
}
