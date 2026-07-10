"use client";

import Decimal from "decimal.js";
import { formatCurrency } from "@/lib/utils/formatters";

type Props = {
  totalCortado: number;
  totalAsignado: number;
};

type BalanceStatus = "empty" | "balanced" | "partial" | "mismatch";

function getStatus(cortado: Decimal, asignado: Decimal): BalanceStatus {
  if (cortado.isZero() && asignado.isZero()) return "empty";
  if (cortado.equals(asignado)) return "balanced";
  if (cortado.isZero() || asignado.isZero()) return "partial";
  return "mismatch";
}

const STYLES: Record<BalanceStatus, { dot: string; text: string; border: string; bg: string }> = {
  empty: {
    dot: "bg-gray-300 dark:bg-gray-600",
    text: "text-gray-600 dark:text-gray-300",
    border: "border-gray-200 dark:border-gray-700",
    bg: "bg-white dark:bg-gray-900",
  },
  balanced: {
    dot: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-900/50",
    bg: "bg-emerald-50 dark:bg-emerald-950/20",
  },
  partial: {
    dot: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-300 dark:border-amber-900/60",
    bg: "bg-amber-50 dark:bg-amber-950/20",
  },
  mismatch: {
    dot: "bg-rose-500",
    text: "text-rose-700 dark:text-rose-400",
    border: "border-rose-300 dark:border-rose-800",
    bg: "bg-rose-50 dark:bg-rose-950/20",
  },
};

/**
 * Balance de presupuesto, sticky cerca del botón enviar. No bloquea el envío
 * (el descuadre es válido cuando la plata sale de un rubro fuera de esta
 * reforma) pero explica en cada estado qué está pasando y qué hacer.
 */
export default function BalanceAdvisory({ totalCortado, totalAsignado }: Props) {
  const cortado = new Decimal(totalCortado || 0);
  const asignado = new Decimal(totalAsignado || 0);
  const status = getStatus(cortado, asignado);
  const diff = cortado.minus(asignado);
  const style = STYLES[status];

  const message = {
    empty: "Todavía no hay movimientos de presupuesto entre eventos.",
    balanced: "Balanceado: lo que bajaste en unos eventos cuadra con lo que subiste en otros.",
    partial:
      cortado.greaterThan(0)
        ? `Bajaste ${formatCurrency(cortado.toNumber())} pero todavía no lo subiste en ningún otro evento.`
        : `Subiste ${formatCurrency(asignado.toNumber())} pero todavía no bajaste esa plata de ningún otro evento.`,
    mismatch:
      diff.greaterThan(0)
        ? `Sobran ${formatCurrency(diff.abs().toNumber())} sin distribuir: subí presupuesto en otro evento o reducí el corte.`
        : `Faltan ${formatCurrency(diff.abs().toNumber())}: cortá más presupuesto en otro evento o reducí lo que subiste.`,
  }[status];

  return (
    <div
      className={`sticky bottom-4 z-10 rounded-xl border px-4 py-3 shadow-md backdrop-blur ${style.border} ${style.bg}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex items-start gap-2">
          <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`} />
          <div>
            <p className={`text-sm font-medium ${style.text}`}>{message}</p>
            {status === "mismatch" ? (
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Esto es normal solo si la diferencia sale de un presupuesto fuera de esta reforma. Si
                no, seguro falta reflejar un evento o un monto está mal escrito.
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span>
            Bajado:{" "}
            <strong className="font-semibold text-gray-700 dark:text-gray-200">
              {formatCurrency(cortado.toNumber())}
            </strong>
          </span>
          <span>
            Subido:{" "}
            <strong className="font-semibold text-gray-700 dark:text-gray-200">
              {formatCurrency(asignado.toNumber())}
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
}
