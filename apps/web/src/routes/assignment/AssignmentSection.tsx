import type { ReactNode } from "react";

type AssignmentSectionProps = {
  id: string;
  title: string;
  children: ReactNode;
};

export function AssignmentSection({
  id,
  title,
  children,
}: AssignmentSectionProps) {
  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-lg border border-gray-200 bg-white p-6"
    >
      <h2 className="mb-3 text-2xl font-semibold text-gray-900">{title}</h2>
      <div className="space-y-3 text-gray-700">{children}</div>
    </section>
  );
}

