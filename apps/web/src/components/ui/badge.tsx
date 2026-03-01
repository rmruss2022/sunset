import type { HTMLAttributes } from "react";

import { cn } from "./cn";

const badgeVariants = {
  default: "bg-ah-raised border border-ah-border text-ah-text",
  outline: "border border-ah-border text-ah-text-2",
  success: "bg-ah-green/10 text-ah-green border border-ah-green/25",
  warning: "bg-ah-amber/10 text-ah-amber border border-ah-amber/25",
};

type BadgeVariant = keyof typeof badgeVariants;

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium",
        badgeVariants[variant],
        className,
      )}
      {...props}
    />
  );
}
