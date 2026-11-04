"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { addWaterAction, snoozeReminderAction } from "@/app/(app)/actions";
import { useToast } from "@/components/ui/toast";
import { MAX_SNOOZES, dueSlot, type ReminderLike } from "@/lib/reminders";

const MEAL_LABEL = { breakfast: "bữa sáng", lunch: "bữa trưa", dinner: "bữa tối", snack: "bữa phụ" } as const;

/** Local wall-clock Date in the user's timezone. */
function nowIn(tz: string): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
}

/** In-app reminder scheduler (ADR §2.6): toast + Notification API when permission was already granted. */
export function RemindersRunner({ reminders, timezone }: { reminders: ReminderLike[]; timezone: string }) {
  const toast = useToast();
  const router = useRouter();
  const shown = useRef(new Set<string>());
  const snoozes = useRef(new Map<string, number>());

  useEffect(() => {
    const active = reminders.filter((r) => r.enabled);
    if (active.length === 0) return;
    let stop = false;

    /** US-26.2: a notification click focuses the tab and opens the matching action. */
    const openAction = (r: ReminderLike) => {
      window.focus();
      if (r.type === "water") void addWaterAction(250).then(() => router.refresh());
      else router.push(`/nhat-ky/them?meal=${r.meal ?? "lunch"}`);
    };

    const tick = async () => {
      const now = nowIn(timezone);
      const candidates = active.map((r) => ({ r, slot: dueSlot({ reminder: r, now, lastLoggedMinAgo: null, shown: shown.current }) })).filter((x) => x.slot);
      if (candidates.length === 0) return;
      let ctx: { lastWaterAt: string | null; lastMealAt: Record<string, string> } | null = null;
      try {
        ctx = await (await fetch("/api/reminders/context")).json();
      } catch {
        ctx = null;
      }
      if (stop) return;
      for (const { r, slot } of candidates) {
        const last = r.type === "water" ? ctx?.lastWaterAt : r.meal ? ctx?.lastMealAt[r.meal] : null;
        const ago = last ? (Date.now() - new Date(last).getTime()) / 60000 : null;
        const key = `${r.id}@${slot}`;
        shown.current.add(key);
        if (ago !== null && ago <= 30) continue; // US-25.2
        const text = r.type === "water" ? "Đến giờ uống nước rồi 💧" : `Đến giờ ghi ${MEAL_LABEL[r.meal ?? "lunch"]}`;
        if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.visibilityState === "hidden") {
          const notification = new Notification("NutriTrack", { body: text });
          notification.onclick = () => {
            notification.close();
            openAction(r);
          };
        }
        toast.show(text, {
          ms: 15000,
          actionLabel: r.type === "water" ? "+250 ml" : `Ghi ${MEAL_LABEL[r.meal ?? "lunch"]}`,
          onAction: () => openAction(r),
        });
        // Snooze is offered as a second toast so the user can postpone up to 3 times (PRD §8.6).
        const used = snoozes.current.get(key) ?? 0;
        if (used < MAX_SNOOZES) {
          toast.show("Hoãn nhắc nhở này?", {
            ms: 15000,
            actionLabel: "Hoãn 30 phút",
            onAction: () => {
              snoozes.current.set(key, used + 1);
              shown.current.delete(key);
              void snoozeReminderAction(r.id);
              r.snoozeUntil = new Date(Date.now() + 30 * 60000).toISOString();
            },
          });
        }
      }
    };
    const id = setInterval(() => void tick(), 30_000);
    void tick();
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [reminders, timezone, toast, router]);

  return null;
}
