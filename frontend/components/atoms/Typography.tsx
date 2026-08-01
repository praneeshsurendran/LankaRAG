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
    h1: "text-3xl sm:text-4xl font-bold tracking-tight text-white",
    h2: "text-2xl font-bold tracking-tight text-white",
    h3: "text-xl font-semibold tracking-tight text-white",
    h4: "text-lg font-semibold tracking-tight text-white",
    p: "text-base leading-7 text-white/90",
    small: "text-sm font-medium leading-none text-white/70",
    muted: "text-sm text-white/50",
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
