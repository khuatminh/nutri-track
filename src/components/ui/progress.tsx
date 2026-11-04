import { cn } from "@/lib/cn";
import { fmtDec1, fmtInt } from "@/lib/format";

/** Kcal ring (design-spec §3): <90% green, 90–100% warning, >100% neutral "over" with text (US-13.2). */
export function KcalRing({ eaten, target }: { eaten: number; target: number }) {
  const remaining = target - eaten;
  const over = remaining < 0;
  const pct = target > 0 ? Math.min(eaten / target, 1) : 0;
  const R = 70;
  const C = 2 * Math.PI * R;
  const near = !over && target > 0 && eaten / target >= 0.9;
  const color = over ? "var(--macro-carb)" : near ? "var(--warning)" : "var(--kcal)";
  const label = over ? `Vượt ${fmtInt(-remaining)} kcal so với mục tiêu` : `Còn lại ${fmtInt(remaining)} kcal`;
  return (
    <div className="relative grid place-items-center" role="img" aria-label={`${label}. Đã ăn ${fmtInt(eaten)} trên mục tiêu ${fmtInt(target)} kcal`}>
      <svg width="176" height="176" viewBox="0 0 176 176" className="-rotate-90" aria-hidden>
        <circle cx="88" cy="88" r={R} fill="none" stroke="var(--track)" strokeWidth="14" />
        <circle cx="88" cy="88" r={R} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} className="transition-[stroke-dashoffset] duration-200 motion-reduce:transition-none" />
      </svg>
      <div className="absolute text-center">
        <div className="text-[2.5rem] font-bold leading-none">{fmtInt(Math.abs(remaining))}</div>
        <div className="text-sm text-muted">{over ? "kcal vượt ⓘ" : "kcal còn lại"}</div>
      </div>
    </div>
  );
}

const MACRO = {
  protein: { name: "Đạm (P)", mark: "■", text: "text-protein-text", fill: "bg-protein bg-[repeating-linear-gradient(45deg,transparent_0_4px,rgba(255,255,255,.35)_4px_6px)]" },
  carb: { name: "Tinh bột (C)", mark: "●", text: "text-carb-text", fill: "bg-carb bg-[radial-gradient(circle,rgba(255,255,255,.45)_1.2px,transparent_1.5px)] bg-[length:6px_6px]" },
  fat: { name: "Béo (F)", mark: "◆", text: "text-fat-text", fill: "bg-fat bg-[repeating-linear-gradient(0deg,transparent_0_4px,rgba(255,255,255,.35)_4px_6px),repeating-linear-gradient(90deg,transparent_0_4px,rgba(255,255,255,.35)_4px_6px)]" },
} as const;

export function MacroBar({ kind, eatenG, targetG }: { kind: keyof typeof MACRO; eatenG: number; targetG: number }) {
  const m = MACRO[kind];
  const pct = targetG > 0 ? (eatenG / targetG) * 100 : 0;
  const over = pct > 100;
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm font-semibold">
        <span className={m.text}>
          <span aria-hidden>{m.mark}</span> {m.name}
        </span>
        <span>
          {fmtDec1(eatenG)} / {fmtInt(targetG)} g · {fmtInt(pct)}% {over && <span className="ml-1 rounded-full bg-warning-soft px-2 text-xs font-bold text-warning">Vượt</span>}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`${m.name}: ${fmtDec1(eatenG)} trên ${fmtInt(targetG)} gram`}
        aria-valuemin={0}
        aria-valuemax={targetG}
        aria-valuenow={Math.round(eatenG)}
        aria-valuetext={`${fmtDec1(eatenG)} g trên ${fmtInt(targetG)} g, ${fmtInt(pct)}%`}
        className={cn("h-2.5 overflow-hidden rounded-full bg-track", over && "ring-2 ring-warning")}
      >
        <div className={cn("h-full rounded-full", m.fill)} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

export function WaterBar({ totalMl, targetMl }: { totalMl: number; targetMl: number }) {
  const pct = targetMl > 0 ? Math.min((totalMl / targetMl) * 100, 100) : 0;
  return (
    <div
      role="progressbar"
      aria-label="Nước uống hôm nay"
      aria-valuemin={0}
      aria-valuemax={targetMl}
      aria-valuenow={totalMl}
      aria-valuetext={`${fmtInt(totalMl)} trên ${fmtInt(targetMl)} ml`}
      className="h-2.5 overflow-hidden rounded-full bg-track"
    >
      <div className="h-full rounded-full bg-water" style={{ width: `${pct}%` }} />
    </div>
  );
}
