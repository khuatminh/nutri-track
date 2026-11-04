"use client";
import { Copy, MoreVertical, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteRecipeAction, duplicateRecipeAction } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/dialog";
import { Card } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { fmtDec1, fmtInt } from "@/lib/format";
import type { RecipeDto } from "@/server/recipes/service";

type Row = Pick<RecipeDto, "id" | "name" | "servings" | "perServing">;

export function RecipeList({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [menu, setMenu] = useState<Row | null>(null);
  const [confirm, setConfirm] = useState<Row | null>(null);

  return (
    <>
      <ul className="grid gap-3 md:grid-cols-2">
        {rows.map((r) => (
          <li key={r.id}>
            <Card className="flex items-center gap-2">
              <Link href={`/cong-thuc/${r.id}`} className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{r.name}</span>
                <span className="text-sm text-muted">{fmtDec1(r.servings)} phần · {fmtInt(r.perServing.kcal)} kcal/phần</span>
                <span className="block text-xs"><span className="text-protein-text">■ P {fmtDec1(r.perServing.proteinG)}</span> · <span className="text-carb-text">● C {fmtDec1(r.perServing.carbG)}</span> · <span className="text-fat-text">◆ F {fmtDec1(r.perServing.fatG)}</span></span>
              </Link>
              <button className="grid size-11 place-items-center rounded-full hover:bg-surface-2" aria-label={`Tùy chọn cho ${r.name}`} onClick={() => setMenu(r)}><MoreVertical className="size-5" aria-hidden /></button>
            </Card>
          </li>
        ))}
      </ul>

      <Sheet open={!!menu} onOpenChange={(o) => !o && setMenu(null)} title={menu?.name ?? ""}>
        <div className="flex flex-col gap-2">
          <Button asChild variant="secondary"><Link href={`/cong-thuc/${menu?.id}`}><Pencil className="size-4" aria-hidden /> Sửa</Link></Button>
          <Button variant="secondary" disabled={pending} onClick={() => start(async () => { const r = await duplicateRecipeAction(menu!.id); setMenu(null); if (r.ok) toast.show(`Đã tạo “${r.recipe.name}”`); router.refresh(); })}><Copy className="size-4" aria-hidden /> Nhân bản</Button>
          <Button variant="danger" onClick={() => { setConfirm(menu); setMenu(null); }}><Trash2 className="size-4" aria-hidden /> Xóa</Button>
        </div>
      </Sheet>

      <Sheet open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)} title="Xóa công thức?" description="Các bữa đã ghi từ công thức này vẫn được giữ nguyên. Công thức sẽ không còn xuất hiện khi tìm món.">
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setConfirm(null)}>Hủy</Button>
          <Button variant="danger" className="flex-1" loading={pending} onClick={() => start(async () => { await deleteRecipeAction(confirm!.id); setConfirm(null); toast.show("Đã xóa công thức"); router.refresh(); })}>Xóa</Button>
        </div>
      </Sheet>
    </>
  );
}
