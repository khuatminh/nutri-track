import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { foodSeedListSchema, type FoodSeed } from "./schema";

export const SEED_DATA_DIR = join(fileURLToPath(new URL(".", import.meta.url)), "data");

export function seedFiles(dir = SEED_DATA_DIR): string[] {
  return readdirSync(dir)
    .filter((f) => /^foods\.vi\..+\.json$/.test(f))
    .sort()
    .map((f) => join(dir, f));
}

/** Reads and validates every foods.vi.*.json file. Throws on schema violations. */
export function loadFoods(dir = SEED_DATA_DIR): FoodSeed[] {
  return seedFiles(dir).flatMap((file) => {
    const parsed = foodSeedListSchema.safeParse(JSON.parse(readFileSync(file, "utf8")));
    if (!parsed.success) throw new Error(`Invalid seed file ${file}: ${parsed.error.message}`);
    return parsed.data;
  });
}

/** Search key: NFD, strip diacritics, đ→d, lowercase (ADR-0001 §2.5). */
export function unaccent(s: string): string {
  return s
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}
