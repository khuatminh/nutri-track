import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { RecipeList } from "@/components/recipes/recipe-list";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, PageHeader } from "@/components/ui/misc";
import { requireUser } from "@/server/auth";
import { listRecipes } from "@/server/recipes/service";

export const metadata: Metadata = { title: "Công thức" };

export default async function Page() {
  const u = await requireUser();
  const rows = await listRecipes(u.userId);
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Công thức của tôi" subtitle="Tự nấu một nồi, chia thành nhiều phần — app tính dinh dưỡng mỗi phần." actions={<Button asChild><Link href="/cong-thuc/moi"><Plus className="size-4" aria-hidden /> Tạo công thức</Link></Button>} />
      {rows.length === 0 ? <Card><EmptyState icon="🍲" title="Chưa có công thức nào" hint="Tạo công thức để ghi cả nồi cơm meal-prep chỉ với vài chạm." action={<Button asChild><Link href="/cong-thuc/moi">Tạo công thức đầu tiên</Link></Button>} /></Card> : <RecipeList rows={rows} />}
    </div>
  );
}
