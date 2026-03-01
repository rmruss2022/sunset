type TableOfContentsItem = {
  id: string;
  label: string;
};

type TableOfContentsProps = {
  items: TableOfContentsItem[];
};

export function TableOfContents({ items }: TableOfContentsProps) {
  return (
    <nav className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="mb-3 text-lg font-semibold text-gray-900">
        Table of contents
      </h2>
      <ul className="space-y-2 text-sm">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="text-gray-700 underline underline-offset-4 hover:text-gray-900"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

