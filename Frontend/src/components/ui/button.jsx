import * as React from "react";
import { cn } from "@/lib/utils";

const Button = React.forwardRef(
  (
    { children, className, type = "button", variant = "primary", ...props },
    ref
  ) => {
    const variants = {
      primary:
        "bg-amber-500 text-slate-950 shadow-[0_10px_30px_rgba(245,158,11,0.24)] hover:bg-amber-400",
      secondary:
        "border border-emerald-900/70 bg-slate-800 text-amber-100 hover:bg-slate-700",
      ghost:
        "border border-white/10 bg-transparent text-amber-200 hover:bg-white/5",
      danger: "bg-rose-500 text-white hover:bg-rose-400",
    };

    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex min-h-11 w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
          "disabled:cursor-not-allowed disabled:opacity-50",
          variants[variant] || variants.primary,
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
