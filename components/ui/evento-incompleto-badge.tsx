"use client";

type Props = {
  compact?: boolean;
};

export default function EventoIncompletoBadge({ compact = false }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-amber-200 bg-amber-50 font-medium text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 ${
        compact ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
      }`}
    >
      Datos faltantes
    </span>
  );
}
