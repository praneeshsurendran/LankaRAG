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
    default: "bg-white/10 text-white border-white/20",
    structured: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    semantic: "bg-violet-500/20 text-violet-300 border-violet-500/30",
    image: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    hybrid: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    success: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    warning: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    danger: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-2.5 py-1 text-xs",
  };

  const pulseColors = {
    default: "bg-white",
    structured: "bg-blue-400",
    semantic: "bg-violet-400",
    image: "bg-amber-400",
    hybrid: "bg-emerald-400",
    success: "bg-emerald-400",
    warning: "bg-amber-400",
    danger: "bg-red-400",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 font-semibold rounded-full border backdrop-blur-sm",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {pulse && (
        <span
          className={cn(
            "rounded-full animate-pulse",
            size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2",
            pulseColors[variant]
          )}
        />
      )}
      {children}
    </div>
  );
}
