/**
 * Client-side helpers for server-action failures (NFR-09).
 * Next.js Server Actions reject with a TypeError when the network is unavailable;
 * we translate that into a friendly Vietnamese message instead of crashing the tree.
 */

export const OFFLINE_MESSAGE = "Không thể kết nối. Kiểm tra mạng và thử lại.";
export const UNKNOWN_ERROR_MESSAGE = "Có lỗi xảy ra. Vui lòng thử lại.";

const NETWORK_PATTERNS = [
  "failed to fetch",
  "networkerror",
  "network request failed",
  "load failed",
  "fetch failed",
  "err_internet_disconnected",
  "err_network_changed",
  "socket hang up",
  "connection reset",
  "timed out",
];

export function isNetworkError(error: unknown): boolean {
  if (typeof error === "object" && error !== null && "name" in error) {
    const name = (error as { name?: unknown }).name;
    if (name === "AbortError" || name === "NetworkError") return true;
  }
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : typeof error === "object" && error !== null && "message" in error
          ? String((error as { message?: unknown }).message ?? "")
          : "";
  const lower = message.toLowerCase();
  return NETWORK_PATTERNS.some((p) => lower.includes(p));
}

/** Anything that looks like a lost connection gets the offline copy; everything else a generic retry hint. */
export function friendlyError(error: unknown): string {
  return isNetworkError(error) ? OFFLINE_MESSAGE : UNKNOWN_ERROR_MESSAGE;
}

/**
 * Opaque retry key for one logical save. The same key is reused when the user presses
 * "Thử lại", so a request that reached the server before the response was lost returns
 * the original row instead of creating a duplicate (NFR-09).
 */
export function newRequestId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
