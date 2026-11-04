-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('male', 'female', 'other');

-- CreateEnum
CREATE TYPE "ActivityLevel" AS ENUM ('sedentary', 'light', 'moderate', 'active', 'very_active');

-- CreateEnum
CREATE TYPE "Goal" AS ENUM ('lose', 'maintain', 'gain');

-- CreateEnum
CREATE TYPE "TargetsMode" AS ENUM ('auto', 'custom');

-- CreateEnum
CREATE TYPE "ThemePref" AS ENUM ('system', 'light', 'dark');

-- CreateEnum
CREATE TYPE "Meal" AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');

-- CreateEnum
CREATE TYPE "LogSource" AS ENUM ('search', 'recent', 'copy', 'quick');

-- CreateEnum
CREATE TYPE "ReminderType" AS ENUM ('water', 'meal');

-- CreateEnum
CREATE TYPE "ReminderChannel" AS ENUM ('in_app', 'web_push');

-- CreateEnum
CREATE TYPE "Confidence" AS ENUM ('high', 'medium', 'low');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login_at" TIMESTAMP(3),
    "consent_at" TIMESTAMP(3),
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    "theme_pref" "ThemePref" NOT NULL DEFAULT 'system',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ip" TEXT,
    "success" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "user_id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "sex" "Sex" NOT NULL,
    "birth_date" DATE NOT NULL,
    "height_cm" DOUBLE PRECISION NOT NULL,
    "weight_kg" DOUBLE PRECISION NOT NULL,
    "activity_level" "ActivityLevel" NOT NULL,
    "goal" "Goal" NOT NULL,
    "goal_rate_kg_per_week" DOUBLE PRECISION,
    "target_weight_kg" DOUBLE PRECISION,
    "calorie_target" INTEGER NOT NULL,
    "protein_g" INTEGER NOT NULL,
    "carb_g" INTEGER NOT NULL,
    "fat_g" INTEGER NOT NULL,
    "targets_mode" "TargetsMode" NOT NULL DEFAULT 'auto',
    "water_target_ml" INTEGER NOT NULL,
    "water_target_custom" BOOLEAN NOT NULL DEFAULT false,
    "targets_effective_from" DATE NOT NULL,
    "targets_weight_kg" DOUBLE PRECISION NOT NULL,
    "hide_weight" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "target_history" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "effective_from" DATE NOT NULL,
    "kcal" INTEGER NOT NULL,
    "protein_g" INTEGER NOT NULL,
    "carb_g" INTEGER NOT NULL,
    "fat_g" INTEGER NOT NULL,
    "water_ml" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "target_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "foods" (
    "id" TEXT NOT NULL,
    "slug" TEXT,
    "owner_id" TEXT,
    "name" TEXT NOT NULL,
    "name_unaccented" TEXT NOT NULL,
    "brand" TEXT,
    "category" TEXT,
    "is_vietnamese" BOOLEAN NOT NULL DEFAULT false,
    "energy_kcal" DOUBLE PRECISION NOT NULL,
    "protein_g" DOUBLE PRECISION NOT NULL,
    "carb_g" DOUBLE PRECISION NOT NULL,
    "fat_g" DOUBLE PRECISION NOT NULL,
    "fiber_g" DOUBLE PRECISION,
    "sugar_g" DOUBLE PRECISION,
    "sodium_mg" DOUBLE PRECISION,
    "source" TEXT,
    "confidence" "Confidence",
    "default_serving_id" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "foods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "food_servings" (
    "id" TEXT NOT NULL,
    "food_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "grams" DOUBLE PRECISION NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "food_servings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "user_id" TEXT NOT NULL,
    "food_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("user_id","food_id")
);

-- CreateTable
CREATE TABLE "food_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "log_date" DATE NOT NULL,
    "meal" "Meal" NOT NULL,
    "food_id" TEXT,
    "recipe_id" TEXT,
    "name_snapshot" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "serving_label" TEXT,
    "grams" DOUBLE PRECISION NOT NULL,
    "kcal" DOUBLE PRECISION NOT NULL,
    "protein_g" DOUBLE PRECISION NOT NULL,
    "carb_g" DOUBLE PRECISION NOT NULL,
    "fat_g" DOUBLE PRECISION NOT NULL,
    "fiber_g" DOUBLE PRECISION,
    "sugar_g" DOUBLE PRECISION,
    "sodium_mg" DOUBLE PRECISION,
    "missing_micro" BOOLEAN NOT NULL DEFAULT false,
    "source" "LogSource" NOT NULL DEFAULT 'search',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "food_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_unaccented" TEXT NOT NULL,
    "servings" DOUBLE PRECISION NOT NULL,
    "cooked_weight_g" DOUBLE PRECISION,
    "note" TEXT,
    "kcal_per_serving" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "protein_per_serving" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "carb_per_serving" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fat_per_serving" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fiber_per_serving" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sugar_per_serving" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sodium_per_serving" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_weight_g" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_ingredients" (
    "id" TEXT NOT NULL,
    "recipe_id" TEXT NOT NULL,
    "food_id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "serving_label" TEXT,
    "grams" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "water_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "logged_at" TIMESTAMP(3) NOT NULL,
    "log_date" DATE NOT NULL,
    "amount_ml" INTEGER NOT NULL,

    CONSTRAINT "water_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weight_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "log_date" DATE NOT NULL,
    "weight_kg" DOUBLE PRECISION NOT NULL,
    "note" TEXT,

    CONSTRAINT "weight_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminders" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "ReminderType" NOT NULL,
    "meal" "Meal",
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "times" TEXT[],
    "start_time" TEXT,
    "end_time" TEXT,
    "interval_hours" INTEGER,
    "days_of_week" INTEGER[],
    "channel" "ReminderChannel" NOT NULL DEFAULT 'in_app',
    "snooze_until" TIMESTAMP(3),

    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "login_attempts_email_created_at_idx" ON "login_attempts"("email", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "target_history_user_id_effective_from_key" ON "target_history"("user_id", "effective_from");

-- CreateIndex
CREATE UNIQUE INDEX "foods_slug_key" ON "foods"("slug");

-- CreateIndex
CREATE INDEX "foods_owner_id_idx" ON "foods"("owner_id");

-- CreateIndex
CREATE INDEX "food_servings_food_id_idx" ON "food_servings"("food_id");

-- CreateIndex
CREATE INDEX "food_logs_user_id_log_date_idx" ON "food_logs"("user_id", "log_date");

-- CreateIndex
CREATE INDEX "food_logs_user_id_food_id_idx" ON "food_logs"("user_id", "food_id");

-- CreateIndex
CREATE INDEX "recipes_user_id_idx" ON "recipes"("user_id");

-- CreateIndex
CREATE INDEX "recipe_ingredients_recipe_id_idx" ON "recipe_ingredients"("recipe_id");

-- CreateIndex
CREATE INDEX "water_logs_user_id_log_date_idx" ON "water_logs"("user_id", "log_date");

-- CreateIndex
CREATE UNIQUE INDEX "weight_logs_user_id_log_date_key" ON "weight_logs"("user_id", "log_date");

-- CreateIndex
CREATE INDEX "reminders_user_id_idx" ON "reminders"("user_id");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "target_history" ADD CONSTRAINT "target_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "foods" ADD CONSTRAINT "foods_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_servings" ADD CONSTRAINT "food_servings_food_id_fkey" FOREIGN KEY ("food_id") REFERENCES "foods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_food_id_fkey" FOREIGN KEY ("food_id") REFERENCES "foods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_logs" ADD CONSTRAINT "food_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_logs" ADD CONSTRAINT "food_logs_food_id_fkey" FOREIGN KEY ("food_id") REFERENCES "foods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_logs" ADD CONSTRAINT "food_logs_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_food_id_fkey" FOREIGN KEY ("food_id") REFERENCES "foods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "water_logs" ADD CONSTRAINT "water_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weight_logs" ADD CONSTRAINT "weight_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Fuzzy / accent-insensitive search (ADR-0001 §2.5, NFR-06)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "foods_name_unaccented_trgm_idx" ON "foods" USING GIN ("name_unaccented" gin_trgm_ops);
CREATE INDEX "recipes_name_unaccented_trgm_idx" ON "recipes" USING GIN ("name_unaccented" gin_trgm_ops);
