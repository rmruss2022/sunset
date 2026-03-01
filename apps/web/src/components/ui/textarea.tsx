import type { TextareaHTMLAttributes } from "react";
import { forwardRef } from "react";

import { cn } from "./cn";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-[120px] w-full border border-ah-border bg-ah-raised px-3 py-2 text-sm text-ah-text transition-colors placeholder:text-ah-text-3 focus-visible:outline-none focus-visible:border-ah-border-gold disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";
