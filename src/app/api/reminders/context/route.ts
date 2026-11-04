import { NextResponse } from "next/server";
import { dateToIso, isoToDate, todayIn } from "@/lib/dates";
import { getSession } from "@/server/auth";
import { db } from "@/server/db";

/** Minimal data for client reminder logic: last water/meal log times (US-25.2). */
export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const day = isoToDate(todayIn(s.timezone));
  const [water, foods] = await Promise.all([
    db.waterLog.findFirst({ where: { userId: s.userId, logDate: day }, orderBy: { loggedAt: "desc" }, select: { loggedAt: true } }),
    db.foodLog.findMany({ where: { userId: s.userId, logDate: day }, orderBy: { createdAt: "desc" }, select: { meal: true, createdAt: true } }),
  ]);
  const meals: Record<string, string> = {};
  for (const f of foods) meals[f.meal] ??= f.createdAt.toISOString();
  return NextResponse.json({ today: dateToIso(day), lastWaterAt: water?.loggedAt.toISOString() ?? null, lastMealAt: meals });
}
