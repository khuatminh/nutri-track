import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { addDays, fmtLongDate } from "@/lib/dates";

/** Previous/next day + "Hôm nay" (US-13.6). Server-rendered links keep it accessible without JS. */
export function DateNav({ date, today, basePath }: { date: string; today: string; basePath: string }) {
  const href = (d: string) => (d === today ? basePath : `${basePath}?date=${d}`);
  const btn = "grid size-11 shrink-0 place-items-center rounded-full bg-surface-2 hover:bg-primary-soft";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href={href(addDays(date, -1))} className={btn} aria-label="Ngày trước"><ChevronLeft className="size-5" aria-hidden /></Link>
      <form action={basePath} className="flex items-center gap-2">
        <label className="sr-only" htmlFor="date-pick">Chọn ngày</label>
        <input id="date-pick" type="date" name="date" defaultValue={date} className="min-h-11 rounded-md border border-border-strong bg-surface px-2 text-sm" />
        <button className="min-h-11 min-w-11 rounded-md px-2 text-sm font-semibold text-primary">Đi</button>
      </form>
      <Link href={href(addDays(date, 1))} className={btn} aria-label="Ngày sau"><ChevronRight className="size-5" aria-hidden /></Link>
      {date !== today && <Link href={basePath} className="min-h-11 content-center rounded-md px-3 text-sm font-semibold text-primary underline">Hôm nay</Link>}
      <span className="ml-1 hidden text-sm font-semibold sm:inline" aria-live="polite">{fmtLongDate(date)}</span>
    </div>
  );
}
