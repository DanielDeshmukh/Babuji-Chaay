import * as React from "react";
import { cn } from "@/lib/utils";

const Button = React.forwardRef(
  (
    { children, className, type = "button", variant = "primary", ...props },
    ref
  ) => {
    const variants = {
      primary: "bg-primary text-primary-foreground hover:opacity-90",
      secondary: "border border-border bg-card text-foreground hover:bg-muted",
      ghost: "border border-border bg-background text-primary hover:bg-card",
      danger:
        "bg-destructive text-destructive-foreground hover:opacity-90",
    };

    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex h-12 w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
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
