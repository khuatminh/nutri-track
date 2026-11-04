import { PrismaClient } from "@prisma/client";
import { loadFoods, unaccent } from "./load";

/** Idempotent: upserts each food by slug and replaces its servings. */
export async function seedFoods(prisma: PrismaClient): Promise<number> {
  const foods = loadFoods();
  for (const f of foods) {
    const { servings, ...rest } = f;
    const data = { ...rest, nameUnaccented: unaccent(f.name), deletedAt: null };
    await prisma.$transaction([
      prisma.food.upsert({ where: { slug: f.slug }, create: data, update: data }),
      prisma.foodServing.deleteMany({ where: { food: { slug: f.slug } } }),
      prisma.food.update({
        where: { slug: f.slug },
        data: { servings: { create: servings } },
      }),
    ]);
  }
  return foods.length;
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const n = await seedFoods(prisma);
    const [foods, servings] = await Promise.all([prisma.food.count(), prisma.foodServing.count()]);
    console.log(`Seeded ${n} foods (db totals: foods=${foods}, servings=${servings})`);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
