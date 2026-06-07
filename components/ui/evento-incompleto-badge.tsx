"use client";

type Props = {
  compact?: boolean;
};

export default function EventoIncompletoBadge({ compact = false }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-amber-300 bg-amber-100 font-medium text-amber-800 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-200 ${
        compact ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
      }`}
    >
      Datos faltantes
    </span>
  );
}
