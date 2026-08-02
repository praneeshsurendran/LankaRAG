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
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#377d64]">
            {icon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            "flex h-9 w-full rounded-lg border border-[#a9e2cc] bg-white px-3 py-2 text-sm text-[#062b20] placeholder:text-[#5fa088]",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1b8867] focus-visible:border-[#1b8867]",
            "disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
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
          "flex min-h-[80px] w-full rounded-lg border border-[#a9e2cc] bg-white px-3.5 py-2.5 text-sm text-[#062b20] placeholder:text-[#5fa088]",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1b8867] focus-visible:border-[#1b8867]",
          "disabled:cursor-not-allowed disabled:opacity-50 transition-colors resize-none",
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
