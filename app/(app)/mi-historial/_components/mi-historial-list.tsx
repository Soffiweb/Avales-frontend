"use client";

import Link from "next/link";
import {
  Calendar,
  CheckCircle,
  Eye,
  MapPin,
  XCircle,
} from "lucide-react";

import type { Aval, Historial } from "@/types/aval";
import { getApprovalStageLabel } from "@/lib/constants";
import { formatDate, formatLocationWithProvince } from "@/lib/utils/formatters";

type Props = {
  avales: Aval[];
  currentUserId: number;
  loading?: boolean;
  error?: string | null;
};

function pickLatestHistorialEntry(
  aval: Aval,
  userId: number,
): Historial | undefined {
  const entries = aval.historial.filter(
    (h) =>
      h.usuario?.id === userId &&
      (h.estado === "ACEPTADO" || h.estado === "RECHAZADO"),
  );
  if (entries.length === 0) return undefined;
  return entries.reduce((latest, current) =>
    new Date(current.createdAt).getTime() >
    new Date(latest.createdAt).getTime()
      ? current
      : latest,
  );
}

export default function MiHistorialList({
  avales,
  currentUserId,
  loading,
  error,
}: Props) {
  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
        Cargando tu historial...
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center text-sm text-rose-600 dark:text-rose-400">
        {error}
      </div>
    );
  }

  if (avales.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
        No hay avales en tu historial para este filtro.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {avales.map((aval) => {
        const entry = pickLatestHistorialEntry(aval, currentUserId);
        if (!entry) return null;

        const aprobado = entry.estado === "ACEPTADO";
        const BadgeIcon = aprobado ? CheckCircle : XCircle;
        const badgeClasses = aprobado
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
          : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300";
        const badgeLabel = aprobado ? "Aprobaste" : "Rechazaste";
        const evento = aval.evento;

        return (
          <li
            key={aval.id}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 sm:p-5 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1 ${badgeClasses}`}
                  >
                    <BadgeIcon className="w-3.5 h-3.5" />
                    {badgeLabel}
                  </span>
                  <span className="inline-flex items-center text-xs font-medium rounded-full px-2.5 py-1 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                    {getApprovalStageLabel(entry.etapa)}
                  </span>
                </div>

                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 truncate">
                  {evento?.nombre ?? "Evento sin nombre"}
                </h3>
                {evento?.codigo && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {evento.codigo}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(entry.createdAt)}
                  </span>
                  {evento && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {formatLocationWithProvince({
                        ciudad: evento.ciudad,
                        provincia: evento.provincia,
                        pais: evento.pais,
                      })}
                    </span>
                  )}
                </div>

                {entry.comentario && (
                  <p className="mt-2 text-xs text-gray-600 dark:text-gray-300 italic">
                    “{entry.comentario}”
                  </p>
                )}
              </div>

              <div className="flex-shrink-0">
                <Link
                  href={`/avales/${aval.id}`}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  <Eye className="w-4 h-4" />
                  Ver aval
                </Link>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
