"use client";

import Link from "next/link";
import { DollarSign, FileEdit, Eye, Layers3, Trash2 } from "lucide-react";

import { getApprovalStageLabel, getTipoAvalLabel } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils/formatters";
import {
  getAvalBudgetBySource,
  getCollectionIdentifier,
  isAvalCollectionDeletableRequest,
  isAvalCollectionEditableRequest,
} from "@/lib/utils/aval-collections";
import type { Aval } from "@/types/aval";

type Props = {
  avales: Aval[];
  canManageRequestActions?: boolean;
  emptyMessage?: string;
};

function getStatusBadgeClass(status?: string | null) {
  if (status === "ACEPTADO") {
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
  }
  if (status === "RECHAZADO") {
    return "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300";
  }
  if (status === "BORRADOR") {
    return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  }
  return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
}

export default function AvalCollectionList({
  avales,
  canManageRequestActions = false,
  emptyMessage = "No hay avales registrados para este evento.",
}: Props) {
  if (avales.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {avales.map((aval) => {
        const budget = getAvalBudgetBySource(aval);
        const canEdit = canManageRequestActions && isAvalCollectionEditableRequest(aval);
        const canDelete = canManageRequestActions && isAvalCollectionDeletableRequest(aval);

        return (
          <div
            key={aval.id}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-900/60 dark:text-gray-300">
                    <Layers3 className="h-3.5 w-3.5" />
                    {getCollectionIdentifier(aval)}
                  </span>
                  <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                    {getTipoAvalLabel(aval.tipoAval)}
                  </span>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(
                      aval.estado,
                    )}`}
                  >
                    {aval.estado}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {getApprovalStageLabel(aval.etapaActual ?? "SOLICITUD")}
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {aval.resumenCupos
                    ? `${aval.resumenCupos.total} deportistas en el aval`
                    : "Aval asociado al evento"}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/avales/${aval.id}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-100 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300 dark:hover:bg-sky-950/50"
                >
                  <Eye className="h-4 w-4" />
                  Ver detalle
                </Link>
                {canEdit && (
                  <Link
                    href={`/avales/${aval.id}/crear-solicitud`}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
                  >
                    <FileEdit className="h-4 w-4" />
                    Editar solicitud
                  </Link>
                )}
                {canDelete && (
                  <Link
                    href={`/avales/${aval.id}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-950/50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Eliminar
                  </Link>
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <div className="rounded-lg bg-gray-50 px-3 py-3 dark:bg-gray-900/40">
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Fuente
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {getTipoAvalLabel(budget.fuente)}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 px-3 py-3 dark:bg-gray-900/40">
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Solicitado
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {formatCurrency(budget.solicitado)}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 px-3 py-3 dark:bg-gray-900/40">
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Asignado
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {formatCurrency(budget.asignado)}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 px-3 py-3 dark:bg-gray-900/40">
                <p className="flex items-center gap-1 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <DollarSign className="h-3.5 w-3.5" />
                  Disponible
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {formatCurrency(budget.disponible)}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
