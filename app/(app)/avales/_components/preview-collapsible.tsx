"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

type Props = {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

function normalizeDocumentTitle(rawTitle: string) {
  const cleaned = rawTitle
    .trim()
    .replace(/^preview\s+/i, "")
    .replace(/\bpreview\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (!cleaned) return "Documento";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export default function PreviewCollapsible({
  title,
  defaultOpen = false,
  children,
}: Props) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const documentTitle = normalizeDocumentTitle(title);

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950/60 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full inline-flex items-start justify-between gap-4 text-left px-4 py-3 bg-gray-50 dark:bg-gray-900/30 hover:bg-gray-100 dark:hover:bg-gray-900/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
        aria-expanded={isOpen}
      >
        <div className="min-w-0">
          <p className="text-[0.65rem] uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Previsualización
          </p>
          <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {documentTitle}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-1">
          <span className="text-[0.7rem] text-gray-400 dark:text-gray-500">
            {isOpen ? "Ocultar" : "Desplegar"}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {isOpen ? (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          {children}
        </div>
      ) : null}
    </div>
  );
}
