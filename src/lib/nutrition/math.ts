/** Round half away from zero to `digits` decimals (PRD §8.2 "half-up"). */
export function roundHalfUp(n: number, digits = 0): number {
  const f = 10 ** digits;
  const x = Math.abs(n) * f;
  // epsilon guards against binary representation, e.g. 1.005 * 100 = 100.49999…
  const r = Math.floor(x + 0.5 + 1e-9) / f;
  return n < 0 ? -r : r;
}

export function roundToStep(n: number, step: number): number {
  return roundHalfUp(n / step) * step;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
