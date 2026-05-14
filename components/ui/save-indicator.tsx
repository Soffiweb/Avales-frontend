"use client";

import { Check, Loader2 } from "lucide-react";
import type { AutosaveStatus } from "@/lib/hooks/use-autosave-draft";

type SaveIndicatorProps = {
  status: AutosaveStatus;
  lastSavedAt: Date | null;
  className?: string;
};

function formatRelative(date: Date | null): string {
  if (!date) return "";
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 5) return "ahora";
  if (diffSec < 60) return `hace ${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `hace ${diffH}h`;
  return date.toLocaleDateString();
}

export default function SaveIndicator({
  status,
  lastSavedAt,
  className = "",
}: SaveIndicatorProps) {
  if (status === "idle") return null;

  if (status === "saving") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 ${className}`}
      >
        <Loader2 className="w-3 h-3 animate-spin" />
        Guardando...
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 ${className}`}
    >
      <Check className="w-3 h-3" />
      Guardado {formatRelative(lastSavedAt)}
    </span>
  );
}
