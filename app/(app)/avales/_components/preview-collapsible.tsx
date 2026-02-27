"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

type Props = {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

export default function PreviewCollapsible({
  title,
  defaultOpen = false,
  children,
}: Props) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full inline-flex items-center justify-between gap-3 text-left"
        aria-expanded={isOpen}
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
          {title}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-500 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen ? children : null}
    </div>
  );
}
