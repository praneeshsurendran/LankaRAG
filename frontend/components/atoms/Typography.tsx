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
    h1: "text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)] font-[family-name:var(--font-outfit)]",
    h2: "text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)] font-[family-name:var(--font-outfit)]",
    h3: "text-lg font-semibold tracking-tight text-[var(--text-primary)] font-[family-name:var(--font-outfit)]",
    h4: "text-base font-semibold tracking-tight text-[var(--text-primary)] font-[family-name:var(--font-outfit)]",
    p: "text-sm leading-relaxed text-[var(--text-secondary)]",
    small: "text-xs font-medium leading-none text-[var(--text-secondary)]",
    muted: "text-sm text-[var(--text-muted)]",
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
