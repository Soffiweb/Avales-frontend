"use client";

import type { AvalTecnico } from "@/types/aval";
import { formatDateDMY, formatDateTime } from "@/lib/utils/formatters";

type AvalLogisticaSectionProps = {
  avalTecnico: AvalTecnico;
  fechaEmision?: string | null;
};

export default function AvalLogisticaSection({
  avalTecnico,
  fechaEmision,
}: AvalLogisticaSectionProps) {
  return (
    <div className="bg-white dark:bg-gray-950/60 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
      <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">
        Informacion de viaje
      </p>
      <div className="mb-4">
        <p className="text-xs uppercase tracking-wide text-gray-500">
          Fecha de emisión
        </p>
        <p className="font-semibold text-gray-900 dark:text-gray-100">
          {fechaEmision ? formatDateDMY(fechaEmision) : "-"}
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700 dark:text-gray-300">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Salida
          </p>
          <p className="font-semibold text-gray-900 dark:text-gray-100">
            {formatDateTime(avalTecnico.fechaHoraSalida)}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {avalTecnico.transporteSalida}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Retorno
          </p>
          <p className="font-semibold text-gray-900 dark:text-gray-100">
            {formatDateTime(avalTecnico.fechaHoraRetorno)}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {avalTecnico.transporteRetorno}
          </p>
        </div>
      </div>
      {avalTecnico.observaciones && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Observaciones
          </p>
          <p className="mt-1">{avalTecnico.observaciones}</p>
        </div>
      )}
    </div>
  );
}
