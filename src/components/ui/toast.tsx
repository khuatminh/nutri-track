"use client";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

interface ToastItem {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  tone: "info" | "error";
}
interface ToastApi {
  show: (message: string, opts?: { actionLabel?: string; onAction?: () => void; tone?: "info" | "error"; ms?: number }) => void;
}

const Ctx = createContext<ToastApi>({ show: () => undefined });
export const useToast = () => useContext(Ctx);

/** Toasts: role=status, auto-hide 5 s (8 s with undo), paused on hover/focus (design-spec §3). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setItems((xs) => xs.filter((x) => x.id !== id));
  }, []);
  const arm = useCallback((id: number, ms: number) => {
    clearTimeout(timers.current.get(id));
    timers.current.set(id, setTimeout(() => dismiss(id), ms));
  }, [dismiss]);

  const api = useMemo<ToastApi>(
    () => ({
      show: (message, opts = {}) => {
        const id = ++seq.current;
        setItems((xs) => [...xs.slice(-2), { id, message, actionLabel: opts.actionLabel, onAction: opts.onAction, tone: opts.tone ?? "info" }]);
        arm(id, opts.ms ?? (opts.onAction ? 8000 : 5000));
      },
    }),
    [arm],
  );

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-24 z-[60] flex flex-col items-center gap-2 lg:bottom-6" role="status" aria-live="polite">
        {items.map((t) => (
          <div
            key={t.id}
            onMouseEnter={() => clearTimeout(timers.current.get(t.id))}
            onMouseLeave={() => arm(t.id, 3000)}
            onFocus={() => clearTimeout(timers.current.get(t.id))}
            className="pointer-events-auto flex w-full max-w-md items-center justify-between gap-4 rounded-md bg-text px-4 py-3 text-sm font-medium text-bg shadow-[var(--shadow-2)]"
          >
            <span>{t.tone === "error" ? "⚠ " : ""}{t.message}</span>
            {t.actionLabel && (
              <button
                className="min-h-9 rounded px-2 font-bold underline"
                onClick={() => {
                  t.onAction?.();
                  dismiss(t.id);
                }}
              >
                {t.actionLabel}
              </button>
            )}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
