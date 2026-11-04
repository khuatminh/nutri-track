import { Slot } from "@radix-ui/react-slot";
import { Loader2 } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "sm";

const VARIANT: Record<Variant, string> = {
  primary: "bg-primary text-primary-contrast hover:bg-primary-hover border-transparent",
  secondary: "bg-surface text-text border-border-strong hover:bg-surface-2",
  ghost: "bg-transparent text-primary hover:bg-primary-soft border-transparent",
  danger: "bg-danger text-surface border-transparent hover:opacity-90",
};
const SIZE: Record<Size, string> = { md: "min-h-11 px-5 text-base", sm: "min-h-11 px-3 text-sm" };

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  block?: boolean;
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, block, asChild, className, children, disabled, ...rest },
  ref,
) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      ref={ref}
      className={cn(
        "inline-flex min-w-11 shrink-0 items-center justify-center gap-2 rounded-md border font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45",
        VARIANT[variant],
        SIZE[size],
        block && "w-full",
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading && <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />}
          {children}
        </>
      )}
    </Comp>
  );
});
