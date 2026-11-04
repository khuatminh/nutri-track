import type { Metadata } from "next";
import { AddFood } from "@/components/diary/add-food";
import { todayIn } from "@/lib/dates";
import { isMeal, mealForHour } from "@/lib/meals";
import { requireUser } from "@/server/auth";
import { frequentFoods, listFavorites, recentFoods } from "@/server/food-log/service";
import { listMyFoods } from "@/server/foods/custom";
import { hydrate } from "@/server/foods/search";
import { listRecipes } from "@/server/recipes/service";

export const metadata: Metadata = { title: "Thêm món" };

export default async function Page({ searchParams }: { searchParams: Promise<{ date?: string; meal?: string }> }) {
  const u = await requireUser();
  const sp = await searchParams;
  const today = todayIn(u.timezone);
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : today;
  const hour = Number(new Date().toLocaleString("en-US", { timeZone: u.timezone, hour: "numeric", hour12: false })) % 24;
  const meal = isMeal(sp.meal) ? sp.meal : mealForHour(hour);
  const [recent, frequent, favorites, recipeRows, mine] = await Promise.all([
    recentFoods(u.userId),
    frequentFoods(u.userId, meal),
    listFavorites(u.userId),
    listRecipes(u.userId),
    listMyFoods(u.userId),
  ]);
  const recipes = await hydrate(u.userId, [], recipeRows.map((r) => r.id));
  return <AddFood date={date} meal={meal} lists={{ recent, frequent, favorites, recipes, mine }} />;
}
