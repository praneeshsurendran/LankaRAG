import * as React from "react";
import { cn } from "@/utils/cn";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "structured" | "semantic" | "image" | "hybrid" | "success" | "warning" | "danger";
  size?: "sm" | "md";
  pulse?: boolean;
}

export function Badge({
  className,
  variant = "default",
  size = "md",
  pulse = false,
  children,
  ...props
}: BadgeProps) {
  const variants = {
    default: "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border)]",
    structured: "bg-[var(--structured-light)] text-[#1e40af] border-[var(--structured-border)]",
    semantic: "bg-[var(--semantic-light)] text-[#5b21b6] border-[var(--semantic-border)]",
    image: "bg-[var(--image-light)] text-[#c2410c] border-[var(--image-border)]",
    hybrid: "bg-[var(--hybrid-light)] text-[#a16207] border-[var(--hybrid-border)]",
    success: "bg-[var(--success-light)] text-[#166534] border-[#bbf7d0]",
    warning: "bg-[var(--warning-light)] text-[#92400e] border-[#fde68a]",
    danger: "bg-[var(--danger-light)] text-[#991b1b] border-[var(--danger-border)]",
  };

  const pulseColors: Record<string, string> = {
    default: "bg-[var(--text-muted)]",
    structured: "bg-[var(--structured-hue)]",
    semantic: "bg-[var(--semantic-hue)]",
    image: "bg-[var(--image-hue)]",
    hybrid: "bg-[var(--hybrid-hue)]",
    success: "bg-[var(--success)]",
    warning: "bg-[var(--warning)]",
    danger: "bg-[var(--danger)]",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-2.5 py-1 text-xs",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 font-medium rounded-full border",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {pulse && (
        <span
          className={cn(
            "rounded-full opacity-90 animate-pulse",
            pulseColors[variant] || pulseColors.default,
            size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2"
          )}
        />
      )}
      {children}
    </div>
  );
}
