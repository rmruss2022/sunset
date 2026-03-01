import { cn } from "./cn";

const alertVariants = {
  default: "border-ah-border-gold bg-ah-gold/5 text-ah-text",
  destructive: "border-ah-red/30 bg-ah-red/10 text-ah-red",
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
