"use client";

import { Calendar, DollarSign, Tag, Building2 } from "lucide-react";
import type { PresupuestoItem } from "@/types/aval";
import { formatCurrency, formatMonth } from "@/lib/utils/formatters";

type AvalPresupuestoSectionProps = {
  presupuesto: PresupuestoItem[];
  totalPresupuesto: number;
};

export default function AvalPresupuestoSection({
  presupuesto,
  totalPresupuesto,
}: AvalPresupuestoSectionProps) {
  return (
    <div className="bg-white dark:bg-gray-950/60 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
      <div className="flex flex-col gap-2 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Presupuesto total
          </p>
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Items registrados
          </p>
        </div>
        <div className="flex items-end justify-between">
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {formatCurrency(totalPresupuesto)}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {presupuesto.length}
          </p>
        </div>
      </div>
      <div className="p-6 space-y-3">
        {presupuesto.map((item) => (
          <div
            key={item.id}
            className="flex flex-col gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {item.item.nombre}
              </h4>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {formatCurrency(parseFloat(item.presupuesto))}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-gray-600 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Tag className="w-3 h-3" />
                Item #{item.item.codigo ?? item.item.numero}
              </span>
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {item.item.actividad.nombre}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatMonth(item.mes)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
