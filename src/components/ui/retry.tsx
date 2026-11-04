"use client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/**
 * NFR-09: inline, non-destructive failure notice for a save that could not reach the server.
 * The caller keeps the user's input and passes a retry callback that replays the exact same
 * payload (and idempotency key when applicable).
 */
export function RetryNotice({
  message,
  onRetry,
  busy,
  className,
  retryLabel = "Thử lại",
}: {
  message: string;
  onRetry: () => void;
  busy?: boolean;
  className?: string;
  retryLabel?: string;
}) {
  return (
    <div
      role="alert"
      className={cn("flex flex-wrap items-center justify-between gap-2 rounded-md bg-warning-soft p-3 text-sm font-semibold text-warning", className)}
    >
      <span>⚠ {message}</span>
      <Button type="button" size="sm" variant="secondary" loading={busy} onClick={onRetry}>
        {retryLabel}
      </Button>
    </div>
  );
}
