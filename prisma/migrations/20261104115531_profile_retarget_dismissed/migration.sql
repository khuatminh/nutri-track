-- DropIndex
DROP INDEX "foods_name_unaccented_trgm_idx";

-- DropIndex
DROP INDEX "recipes_name_unaccented_trgm_idx";

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "retarget_dismissed_kg" DOUBLE PRECISION;
