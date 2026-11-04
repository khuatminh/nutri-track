import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RecipeEditor } from "@/components/recipes/recipe-editor";
import { requireUser } from "@/server/auth";
import { hydrate } from "@/server/foods/search";
import { getRecipe } from "@/server/recipes/service";

export const metadata: Metadata = { title: "Sửa công thức" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  const { id } = await params;
  const recipe = await getRecipe(u.userId, id);
  if (!recipe) notFound();
  const foods = await hydrate(u.userId, [...new Set(recipe.ingredients.map((i) => i.foodId))], []);
  return <RecipeEditor initial={recipe} ingredientFoods={Object.fromEntries(foods.map((f) => [f.id, f]))} />;
}
