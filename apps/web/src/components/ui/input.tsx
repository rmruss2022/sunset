import type { InputHTMLAttributes } from "react";
import { forwardRef } from "react";

import { cn } from "./cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full border border-ah-border bg-ah-raised px-3 py-2 text-sm text-ah-text transition-colors placeholder:text-ah-text-3 focus-visible:outline-none focus-visible:border-ah-border-gold disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
