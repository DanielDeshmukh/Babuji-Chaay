import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef(({ className, type = "text", ...props }, ref) => {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex min-h-11 w-full rounded-xl border border-emerald-900/60 bg-slate-950/80 px-4 py-3 text-sm text-amber-50 shadow-sm transition-colors",
        "placeholder:text-amber-100/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 focus-visible:border-amber-400/50",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
});

Input.displayName = "Input";

export { Input };
