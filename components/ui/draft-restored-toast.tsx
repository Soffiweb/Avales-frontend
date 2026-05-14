"use client";

import { useEffect } from "react";
import { RotateCcw, X } from "lucide-react";

type DraftRestoredToastProps = {
  visible: boolean;
  savedAt: Date | null;
  onDiscard: () => void;
  onDismiss: () => void;
  durationMs?: number;
};

function formatRelative(date: Date | null): string {
  if (!date) return "";
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return `hace ${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `hace ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `hace ${diffD}d`;
}

export default function DraftRestoredToast({
  visible,
  savedAt,
  onDiscard,
  onDismiss,
  durationMs = 8000,
}: DraftRestoredToastProps) {
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
  }, [visible, onDismiss, durationMs]);

  if (!visible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm rounded-lg border border-indigo-200 bg-white shadow-lg dark:border-indigo-800 dark:bg-gray-900">
      <div className="flex items-start gap-3 p-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/40">
          <RotateCcw className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Borrador restaurado
          </p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Guardado {formatRelative(savedAt)}
          </p>
          <button
            type="button"
            onClick={onDiscard}
            className="mt-2 text-xs font-medium text-rose-600 transition hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
          >
            Descartar borrador
          </button>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-gray-400 transition hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
