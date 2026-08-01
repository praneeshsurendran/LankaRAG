import * as React from "react";
import { cn } from "@/utils/cn";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
            {icon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:border-transparent",
            "disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
            icon && "pl-10",
            className
          )}
          ref={ref}
          {...props}
        />
      </div>
    );
  }
);
Input.displayName = "Input";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:border-transparent",
          "disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 resize-none",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Input, Textarea };
