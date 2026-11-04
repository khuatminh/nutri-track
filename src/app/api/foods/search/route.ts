import { NextResponse } from "next/server";
import { getSession } from "@/server/auth";
import { searchFoods } from "@/server/foods/search";

export async function GET(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (q.length > 80) return NextResponse.json({ error: "Từ khóa quá dài" }, { status: 400 });
  // userId always comes from the session, never from the query string.
  return NextResponse.json({ hits: await searchFoods(s.userId, q) });
}
