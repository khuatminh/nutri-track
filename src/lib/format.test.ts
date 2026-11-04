import { describe, expect, it } from "vitest";
import { addDays, fmtLongDate, startOfWeek, todayIn } from "./dates";
import { fmtDec1, fmtInt, parseDecimal } from "./format";

describe("format", () => {
  it("uses vi-VN separators", () => {
    expect(fmtInt(2150)).toBe("2.150");
    expect(fmtDec1(62.45)).toBe("62,5");
  });
  it("parses comma, dot and units", () => {
    expect(parseDecimal("62,4")).toBe(62.4);
    expect(parseDecimal("62.4")).toBe(62.4);
    expect(parseDecimal("250ml")).toBe(250);
    expect(parseDecimal("abc")).toBeNaN();
    expect(parseDecimal("-5")).toBe(-5);
  });
});

describe("dates", () => {
  it("formats long date", () => expect(fmtLongDate("2026-11-04")).toBe("Thứ Tư, 04/11/2026"));
  it("week starts Monday", () => {
    expect(startOfWeek("2026-11-04")).toBe("2026-11-02");
    expect(startOfWeek("2026-11-08")).toBe("2026-11-02");
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
  });
  it("uses the user's timezone for the day boundary", () => {
    const t = new Date("2026-11-04T18:30:00Z");
    expect(todayIn("Asia/Ho_Chi_Minh", t)).toBe("2026-11-05");
    expect(todayIn("UTC", t)).toBe("2026-11-04");
  });
});
