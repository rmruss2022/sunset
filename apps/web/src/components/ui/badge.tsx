import type { HTMLAttributes } from "react";

import { cn } from "./cn";

const badgeVariants = {
  default: "bg-gray-900 text-white",
  outline: "border border-gray-200 text-gray-700",
  success: "bg-green-50 text-green-700 border border-green-200",
  warning: "bg-amber-50 text-amber-700 border border-amber-200",
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
