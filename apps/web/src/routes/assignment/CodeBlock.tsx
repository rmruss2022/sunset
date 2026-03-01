import type { ReactNode } from "react";

import { cn } from "../../components/ui/cn";

type CodeBlockProps = {
  children: ReactNode;
  className?: string;
};

export function CodeBlock({ children, className }: CodeBlockProps) {
  return (
    <pre
      className={cn(
        "overflow-x-auto rounded-lg bg-gray-900 p-4 text-xs text-gray-100",
        className,
      )}
    >
      <code>{children}</code>
    </pre>
  );
}

