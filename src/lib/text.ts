/** Search key: NFD, strip diacritics, đ→d, lowercase (ADR-0001 §2.5). Shared by seed and app. */
export function unaccent(s: string): string {
  return s
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

/** Normalize a user query: unaccent, collapse whitespace, trim. */
export function normalizeQuery(q: string): string {
  return unaccent(q).replace(/\s+/g, " ").trim();
}

/** Escape LIKE wildcards so user input is matched literally. */
export function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}
