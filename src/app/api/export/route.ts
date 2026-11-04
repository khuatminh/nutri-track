import { NextResponse } from "next/server";
import { getSession } from "@/server/auth";
import { db } from "@/server/db";

/** US-04.2: export the signed-in user's own data as JSON. Everything is filtered by the session userId. */
export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const where = { userId: s.userId };
  const [user, profile, targets, foodLogs, waterLogs, weightLogs, recipes, reminders, foods] = await Promise.all([
    db.user.findUnique({ where: { id: s.userId }, select: { email: true, createdAt: true, timezone: true, themePref: true } }),
    db.profile.findUnique({ where }),
    db.targetHistory.findMany({ where }),
    db.foodLog.findMany({ where }),
    db.waterLog.findMany({ where }),
    db.weightLog.findMany({ where }),
    db.recipe.findMany({ where: { ...where, deletedAt: null }, include: { ingredients: true } }),
    db.reminder.findMany({ where }),
    db.food.findMany({ where: { ownerId: s.userId, deletedAt: null }, include: { servings: true } }),
  ]);
  return new NextResponse(JSON.stringify({ exportedAt: new Date().toISOString(), user, profile, targets, foodLogs, waterLogs, weightLogs, recipes, reminders, customFoods: foods }, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": 'attachment; filename="nutritrack-du-lieu.json"', "Cache-Control": "no-store" },
  });
}
