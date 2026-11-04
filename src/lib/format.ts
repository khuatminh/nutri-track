import { roundHalfUp } from "@/lib/nutrition/math";

// Display formatting, vi-VN (PRD NFR-04, §8.2). Rounding happens here, never in calculations.
const nf = (digits: number) =>
  new Intl.NumberFormat("vi-VN", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const NF0 = nf(0);
const NF1 = nf(1);

export const fmtInt = (n: number) => NF0.format(roundHalfUp(n));
export const fmtDec1 = (n: number) => NF1.format(roundHalfUp(n, 1));
export const fmtKcal = (n: number) => `${fmtInt(n)} kcal`;
export const fmtMl = (n: number) => `${fmtInt(n)} ml`;
export const fmtKg = (n: number) => `${fmtDec1(n)} kg`;
export const fmtGram = (n: number) => `${fmtDec1(n)} g`;
export const fmtPercent = (n: number) => `${fmtInt(n)}%`;

/** Parse user input accepting both "62,4" and "62.4"; strips a trailing unit ("250ml"). Returns NaN if invalid. */
export function parseDecimal(input: string): number {
  const s = input.trim().replace(/\s*(kg|g|ml|kcal|mg|cm)$/i, "").replace(",", ".");
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : Number.NaN;
}
