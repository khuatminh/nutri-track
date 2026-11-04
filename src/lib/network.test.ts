import { describe, expect, it } from "vitest";
import { OFFLINE_MESSAGE, UNKNOWN_ERROR_MESSAGE, friendlyError, isNetworkError, newRequestId } from "@/lib/network";

describe("network error helpers (NFR-09)", () => {
  it("recognises the failures thrown by a Server Action while offline", () => {
    expect(isNetworkError(new TypeError("Failed to fetch"))).toBe(true);
    expect(isNetworkError(new Error("NetworkError when attempting to fetch resource."))).toBe(true);
    expect(isNetworkError(new Error("fetch failed"))).toBe(true);
    expect(isNetworkError({ name: "AbortError" })).toBe(true);
  });

  it("does not mislabel validation or programming errors as offline", () => {
    expect(isNetworkError(new Error("Dữ liệu chưa hợp lệ"))).toBe(false);
    expect(isNetworkError(new RangeError("Invalid time value"))).toBe(false);
    expect(isNetworkError(null)).toBe(false);
    expect(isNetworkError(undefined)).toBe(false);
  });

  it("returns friendly Vietnamese copy with a retry hint", () => {
    expect(friendlyError(new TypeError("Failed to fetch"))).toBe(OFFLINE_MESSAGE);
    expect(friendlyError(new Error("boom"))).toBe(UNKNOWN_ERROR_MESSAGE);
    expect(OFFLINE_MESSAGE).toMatch(/Kiểm tra mạng và thử lại/);
  });

  it("generates distinct opaque request ids", () => {
    const a = newRequestId();
    const b = newRequestId();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(8);
    expect(a.length).toBeLessThanOrEqual(120);
  });
});
