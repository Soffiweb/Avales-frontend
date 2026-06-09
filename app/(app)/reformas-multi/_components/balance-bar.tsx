"use client";

import Decimal from "decimal.js";
import { formatCurrency } from "@/lib/utils/formatters";

type Props = {
  totalCortado: number;
  totalAsignado: number;
};

export default function BalanceBar({ totalCortado, totalAsignado }: Props) {
  const cortado = new Decimal(totalCortado || 0);
  const asignado = new Decimal(totalAsignado || 0);
  const balanced = cortado.equals(asignado);
  const diff = cortado.minus(asignado).toNumber();

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Total cortado
          </p>
          <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
            {formatCurrency(cortado.toNumber())}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Total a distribuir
          </p>
          <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
            {formatCurrency(asignado.toNumber())}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Balance
          </p>
          <p
            className={`mt-1 text-lg font-semibold ${
              balanced
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {balanced ? "✓ Balanceado" : `✗ ${diff > 0 ? "+" : ""}${formatCurrency(diff)}`}
          </p>
        </div>
      </div>
      {!balanced && (
        <p className="mt-3 text-center text-xs text-rose-500 dark:text-rose-400">
          La suma de montos de origen debe ser igual a la de destino para poder
          enviar la solicitud.
        </p>
      )}
    </div>
  );
}

/** Returns true when totalCortado and totalAsignado are equal to cent precision. */
export function isBalanced(
  totalCortado: number,
  totalAsignado: number,
): boolean {
  const cortado = new Decimal(totalCortado || 0);
  const asignado = new Decimal(totalAsignado || 0);
  return cortado.equals(asignado);
}
