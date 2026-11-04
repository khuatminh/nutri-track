import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";

interface FieldShellProps {
  label: string;
  error?: string;
  hint?: string;
  id: string;
  children: ReactNode;
}

function FieldShell({ label, error, hint, id, children }: FieldShellProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} role="alert" className="flex items-center gap-1 text-xs font-semibold text-danger">
          <AlertTriangle className="size-3.5" aria-hidden /> {error}
        </p>
      )}
    </div>
  );
}

const inputCls = (error?: string) =>
  cn(
    "min-h-11 w-full rounded-md bg-surface px-3 text-base text-text placeholder:text-faint",
    error ? "border-2 border-danger" : "border border-border-strong",
    "disabled:opacity-60",
  );

const describedBy = (id: string, error?: string, hint?: string) => (error ? `${id}-err` : hint ? `${id}-hint` : undefined);

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  unit?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ label, error, hint, unit, className, id, ...rest }, ref) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FieldShell label={label} error={error} hint={hint} id={fid}>
      <div className="relative">
        <input
          ref={ref}
          id={fid}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy(fid, error, hint)}
          className={cn(inputCls(error), unit && "pr-14", className)}
          {...rest}
        />
        {unit && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted">{unit}</span>}
      </div>
    </FieldShell>
  );
});

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: string;
  options: Array<{ value: string; label: string }>;
}

export function Select({ label, error, hint, options, id, className, ...rest }: SelectProps) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FieldShell label={label} error={error} hint={hint} id={fid}>
      <select id={fid} aria-invalid={!!error || undefined} aria-describedby={describedBy(fid, error, hint)} className={cn(inputCls(error), className)} {...rest}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function Textarea({ label, error, hint, id, className, ...rest }: TextareaProps) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FieldShell label={label} error={error} hint={hint} id={fid}>
      <textarea id={fid} aria-invalid={!!error || undefined} aria-describedby={describedBy(fid, error, hint)} className={cn(inputCls(error), "min-h-20 py-2", className)} {...rest} />
    </FieldShell>
  );
}
