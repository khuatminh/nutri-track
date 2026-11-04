import type { Metadata } from "next";
import { RecipeEditor } from "@/components/recipes/recipe-editor";

export const metadata: Metadata = { title: "Tạo công thức" };

export default function Page() {
  return <RecipeEditor />;
}
