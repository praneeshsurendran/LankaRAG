import * as React from "react";
import { cn } from "@/utils/cn";

interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  variant?: "h1" | "h2" | "h3" | "h4" | "p" | "small" | "muted";
  as?: React.ElementType;
}

export function Typography({
  className,
  variant = "p",
  as,
  children,
  ...props
}: TypographyProps) {
  const Component = as || (variant.startsWith("h") ? variant : variant === "small" ? "small" : "p");

  const variants = {
    h1: "text-2xl sm:text-3xl font-bold tracking-tight text-[#062b20]",
    h2: "text-xl font-bold tracking-tight text-[#062b20]",
    h3: "text-lg font-semibold tracking-tight text-[#0a382a]",
    h4: "text-base font-semibold tracking-tight text-[#0a382a]",
    p: "text-sm leading-relaxed text-[#12543e]",
    small: "text-xs font-medium leading-none text-[#1b6b51]",
    muted: "text-xs text-[#377d64]",
  };

  return (
    // @ts-ignore - Dynamic component type
    <Component
      className={cn(variants[variant], className)}
      {...props}
    >
      {children}
    </Component>
  );
}
