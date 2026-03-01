import { cn } from "./cn";

const alertVariants = {
  default: "border-gray-200 bg-white text-gray-900",
  destructive: "border-red-200 bg-red-50 text-red-700",
};

type AlertVariant = keyof typeof alertVariants;

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
}

export function Alert({ className, variant = "default", ...props }: AlertProps) {
  return (
    <div
      role="status"
      className={cn(
        "w-full rounded-lg border px-4 py-3 text-sm shadow-sm",
        alertVariants[variant],
        className,
      )}
      {...props}
    />
  );
}
