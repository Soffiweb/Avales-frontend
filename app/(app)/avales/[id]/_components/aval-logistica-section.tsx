"use client";

import type { AvalTecnico } from "@/types/aval";
import { SectionLabel } from "@/components/ui/section-card";
import { formatDateDMY, formatDateTime } from "@/lib/utils/formatters";

type AvalLogisticaSectionProps = {
  avalTecnico: AvalTecnico;
  fechaEmision?: string | null;
};

/**
 * Panel de viaje dentro de la sección "Solicitud del aval".
 *
 * Va con el fondo tenue de los paneles internos y no como tarjeta blanca con
 * sombra: vive dentro de una tarjeta, y dos tarjetas anidadas con el mismo
 * relieve hacen perder de vista cuál contiene a cuál.
 */
export default function AvalLogisticaSection({
  avalTecnico,
  fechaEmision,
}: AvalLogisticaSectionProps) {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-4 dark:border-slate-700/60 dark:bg-slate-900/40">
      <SectionLabel className="mb-3">Información de viaje</SectionLabel>

      <dl>
        <div className="mb-4">
          <SectionLabel as="dt">Fecha de emisión</SectionLabel>
          <dd className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">
            {fechaEmision ? formatDateDMY(fechaEmision) : "-"}
          </dd>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <SectionLabel as="dt">Salida</SectionLabel>
            <dd className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">
              {formatDateTime(avalTecnico.fechaHoraSalida)}
            </dd>
            <dd className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {avalTecnico.transporteSalida}
            </dd>
          </div>
          <div>
            <SectionLabel as="dt">Retorno</SectionLabel>
            <dd className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">
              {formatDateTime(avalTecnico.fechaHoraRetorno)}
            </dd>
            <dd className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {avalTecnico.transporteRetorno}
            </dd>
          </div>
        </div>
      </dl>

      {avalTecnico.observaciones && (
        <div className="mt-4 border-t border-slate-200/80 pt-4 dark:border-slate-700/60">
          <SectionLabel>Observaciones</SectionLabel>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
            {avalTecnico.observaciones}
          </p>
        </div>
      )}
    </div>
  );
}
