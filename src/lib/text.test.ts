import { describe, expect, it } from "vitest";
import { escapeLike, normalizeQuery, unaccent } from "./text";

describe("text", () => {
  it("strips Vietnamese diacritics and đ", () => {
    expect(unaccent("Phở Bò Đặc Biệt")).toBe("pho bo dac biet");
    expect(unaccent("Cơm tấm sườn")).toBe("com tam suon");
  });
  it("normalizes queries", () => expect(normalizeQuery("  Bún   CHẢ ")).toBe("bun cha"));
  it("escapes LIKE wildcards", () => expect(escapeLike("50%_a\\")).toBe("50\\%\\_a\\\\"));
});
