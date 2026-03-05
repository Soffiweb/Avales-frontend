"use client";

type Props = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
};

type PageItem = number | "...";

function buildPageItems(currentPage: number, totalPages: number): PageItem[] {
  if (totalPages <= 1) return [1];

  const pages = new Set<number>();

  pages.add(1);
  if (totalPages >= 2) pages.add(2);

  for (
    let page = Math.max(1, currentPage - 3);
    page <= Math.min(totalPages, currentPage + 3);
    page += 1
  ) {
    pages.add(page);
  }

  if (totalPages >= 2) pages.add(totalPages - 1);
  pages.add(totalPages);

  const sorted = Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  const items: PageItem[] = [];

  for (let i = 0; i < sorted.length; i += 1) {
    const page = sorted[i];
    const prev = sorted[i - 1];

    if (i > 0 && prev !== undefined && page - prev > 1) {
      items.push("...");
    }

    items.push(page);
  }

  return items;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className = "",
}: Props) {
  const pages = buildPageItems(currentPage, totalPages);

  return (
    <div className={`flex justify-center ${className}`}>
      <nav className="flex" role="navigation" aria-label="Navigation">
        {/* Previous */}

        <div className="mr-2">
          <span
            role="button"
            tabIndex={currentPage === 1 ? -1 : 0}
            aria-disabled={currentPage === 1}
            onClick={() =>
              currentPage !== 1 && onPageChange(Math.max(1, currentPage - 1))
            }
            onKeyDown={(e) => {
              if (currentPage === 1) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onPageChange(Math.max(1, currentPage - 1));
              }
            }}
            className={[
              "inline-flex items-center justify-center rounded-lg leading-5 px-2.5 py-2",
              "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60",
              "shadow-sm",
              currentPage === 1
                ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                : "text-violet-500 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer",
            ].join(" ")}
          >
            <span className="sr-only">Previous</span>
            <wbr />
            <svg
              className="fill-current"
              width="16"
              height="16"
              viewBox="0 0 16 16"
            >
              <path d="M9.4 13.4l1.4-1.4-4-4 4-4-1.4-1.4L4 8z" />
            </svg>
          </span>
        </div>

        {/* Pages */}
        <ul className="inline-flex text-sm font-medium -space-x-px rounded-lg shadow-sm">
          {pages.map((p, idx) => {
            if (p === "...") {
              return (
                <li key={`ellipsis-${idx}`}>
                  <span
                    className="inline-flex items-center justify-center leading-5 px-3.5 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 text-gray-400 dark:text-gray-500"
                    aria-hidden="true"
                  >
                    ...
                  </span>
                </li>
              );
            }

            const isActive = p === currentPage;
            const isFirst = idx === 0;
            const isLast = idx === pages.length - 1;

            const base =
              "inline-flex items-center justify-center leading-5 px-3.5 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60";

            const radius = isFirst
              ? "rounded-l-lg"
              : isLast
              ? "rounded-r-lg"
              : "";

            if (isActive) {
              return (
                <li key={p}>
                  <span
                    className={[base, radius, "text-violet-500"].join(" ")}
                    aria-current="page"
                  >
                    {p}
                  </span>
                </li>
              );
            }

            return (
              <li key={p}>
                <button
                  type="button"
                  onClick={() => onPageChange(p)}
                  className={[
                    base,
                    radius,
                    "text-gray-600 dark:text-gray-300",
                    "hover:bg-gray-50 dark:hover:bg-gray-900",
                    "cursor-pointer",
                  ].join(" ")}
                >
                  {p}
                </button>
              </li>
            );
          })}
        </ul>

        {/* Next */}
        {/* Next */}
        <div className="ml-2">
          <span
            role="button"
            tabIndex={currentPage === totalPages ? -1 : 0}
            aria-disabled={currentPage === totalPages}
            onClick={() =>
              currentPage !== totalPages &&
              onPageChange(Math.min(totalPages, currentPage + 1))
            }
            onKeyDown={(e) => {
              if (currentPage === totalPages) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onPageChange(Math.min(totalPages, currentPage + 1));
              }
            }}
            className={[
              "inline-flex items-center justify-center rounded-lg leading-5 px-2.5 py-2",
              "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60",
              "shadow-sm",
              currentPage === totalPages
                ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                : "text-violet-500 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer",
            ].join(" ")}
          >
            <span className="sr-only">Next</span>
            <wbr />
            <svg
              className="fill-current"
              width="16"
              height="16"
              viewBox="0 0 16 16"
            >
              <path d="M6.6 13.4L5.2 12l4-4-4-4 1.4-1.4L12 8z" />
            </svg>
          </span>
        </div>
      </nav>
    </div>
  );
}
