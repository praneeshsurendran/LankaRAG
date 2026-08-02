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
    default: "bg-[#d4f2e6] text-[#0a382a] border-[#a9e2cc]",
    structured: "bg-[#d4f2e6] text-[#0a382a] border-[#a9e2cc]",
    semantic: "bg-[#d4f2e6] text-[#0a382a] border-[#a9e2cc]",
    image: "bg-[#d4f2e6] text-[#0a382a] border-[#a9e2cc]",
    hybrid: "bg-[#1b8867]/20 text-[#062b20] border-[#1b8867]/40",
    success: "bg-[#d4f2e6] text-[#0a382a] border-[#a9e2cc]",
    warning: "bg-[#d4f2e6] text-[#0a382a] border-[#a9e2cc]",
    danger: "bg-[#fdeded] text-[#8a2b2b] border-[#f8c4c4]",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-2.5 py-1 text-xs",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 font-medium rounded-md border",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {pulse && (
        <span
          className={cn(
            "rounded-full bg-[#1b8867] opacity-90 animate-pulse",
            size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2"
          )}
        />
      )}
      {children}
    </div>
  );
}
