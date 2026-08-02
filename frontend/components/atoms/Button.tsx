import * as React from "react";
import { cn } from "@/utils/cn";
import { Loader2 } from "lucide-react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", isLoading, children, disabled, ...props },
    ref
  ) => {
    const variants = {
      primary: "bg-[#1b8867] text-white hover:bg-[#157357] font-semibold border border-[#157357] shadow-sm",
      secondary: "bg-[#d4f2e6] text-[#062b20] hover:bg-[#c3ecd9] border border-[#a9e2cc]",
      outline: "border border-[#a9e2cc] text-[#062b20] hover:bg-[#d4f2e6]",
      ghost: "text-[#12543e] hover:text-[#062b20] hover:bg-[#d4f2e6]",
    };

    const sizes = {
      sm: "h-8 px-3 text-xs rounded-md",
      md: "h-9 px-4 py-2 text-sm rounded-lg",
      lg: "h-11 px-5 py-2.5 text-sm rounded-lg",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1b8867] disabled:opacity-50 disabled:pointer-events-none",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button };
