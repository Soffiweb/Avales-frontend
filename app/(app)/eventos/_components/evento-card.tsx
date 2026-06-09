"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, CalendarDays, MapPin, Users, Pencil, Trash2, DollarSign } from "lucide-react";

import EventoIncompletoBadge from "@/components/ui/evento-incompleto-badge";
import type { Evento } from "@/types/evento";
import { calcularTotalEvento, isEventoIncompleto } from "@/types/evento";
import {
  formatCurrency,
  formatEventScheduleLabel,
  formatLocationWithProvince,
} from "@/lib/utils/formatters";
import { formatCategoryLabel } from "@/lib/utils/categories";

type Props = {
  eventos: Evento[];
  loading?: boolean;
  error?: string | null;
  onDelete?: (evento: Evento) => void;
  canManageEvents?: boolean;
};

const STATUS_STYLES: Record<string, string> = {
  DISPONIBLE:
    "bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-200",
  SOLICITADO:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200",
  RECHAZADO:
    "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200",
  ACEPTADO: "bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200",
};

function getStatusClasses(status?: string | null) {
  if (!status)
    return "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-200";
  return (
    STATUS_STYLES[status.toUpperCase()] ??
    "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-200"
  );
}

function getTotalParticipants(evento: Evento) {
  return (
    (evento.numAtletasHombres || 0) +
    (evento.numAtletasMujeres || 0) +
    (evento.numEntrenadoresHombres || 0) +
    (evento.numEntrenadoresMujeres || 0)
  );
}

function parseMonto(value?: string | null) {
  return Number.parseFloat(value ?? "0") || 0;
}

function getBudgetBySource(evento: Evento, fuente: "FONDOS_PUBLICOS" | "AUTOGESTION") {
  const totalFromItems = (evento.eventoItems ?? [])
    .filter((item) => item.fuente === fuente)
    .reduce((sum, item) => sum + parseMonto(item.presupuesto), 0);

  if (totalFromItems > 0) return totalFromItems;

  const presupuestoFuente = evento.presupuestosFuente?.find((item) => item.fuente === fuente);
  return parseMonto(presupuestoFuente?.montoAsignado);
}

export default function EventoCard({
  eventos,
  loading,
  error,
  onDelete,
  canManageEvents = true,
}: Props) {
  const router = useRouter();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 animate-pulse"
          >
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4" />
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl p-6 text-center">
        {error}
      </div>
    );
  }

  if (eventos.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
        <CalendarDays className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
        <p className="text-base text-gray-500 dark:text-gray-400">No hay eventos registrados.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {eventos.map((evento) => {
        const totalFondosPublicos = getBudgetBySource(evento, "FONDOS_PUBLICOS");
        const totalAutogestion = getBudgetBySource(evento, "AUTOGESTION");
        const totalPresupuesto = Math.max(
          calcularTotalEvento(evento),
          totalFondosPublicos + totalAutogestion,
        );
        const hasBudget = totalPresupuesto > 0;

        return (
          <div
            key={evento.id}
            onClick={() => router.push(`/eventos/${evento.id}`)}
            className="group cursor-pointer bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
          >
          {/* Header con estado */}
          <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusClasses(
                    evento.estado
                  )}`}
                >
                  {evento.estado || "Sin estado"}
                </span>
                {isEventoIncompleto(evento) ? <EventoIncompletoBadge compact /> : null}
                {evento.alcance && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {evento.alcance}
                  </span>
                )}
              </div>
              <h3
                className="font-semibold leading-snug text-gray-900 dark:text-gray-100"
                style={{
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: 2,
                  overflow: "hidden",
                }}
                title={evento.nombre}
              >
                {evento.nombre || "Sin nombre"}
              </h3>
              {evento.codigo && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {evento.codigo}
                </p>
              )}
            </div>
          </div>

          {/* Info principal */}
          <div className="px-5 pb-4 flex-1 space-y-3">
            {/* Tipo y disciplina */}
            <div className="flex flex-wrap gap-2">
              {evento.disciplina?.nombre && (
                <span className="inline-flex items-center rounded-md bg-purple-50 dark:bg-purple-900/30 px-2 py-1 text-xs font-medium text-purple-700 dark:text-purple-300">
                  {evento.disciplina.nombre}
                </span>
              )}
              {formatCategoryLabel(
                evento.categoria?.nombre ?? evento.categoriaCodigo,
                ""
              ) && (
                <span className="inline-flex items-center rounded-md bg-cyan-50 dark:bg-cyan-900/30 px-2 py-1 text-xs font-medium text-cyan-700 dark:text-cyan-300">
                  {formatCategoryLabel(
                    evento.categoria?.nombre ?? evento.categoriaCodigo
                  )}
                </span>
              )}
            </div>

            {/* Fecha y lugar */}
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                <span>{formatEventScheduleLabel(evento)}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                <span className="truncate" title={formatLocationWithProvince(evento)}>{formatLocationWithProvince(evento)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                <span>{getTotalParticipants(evento)} participantes</span>
              </div>
            </div>

            {/* Total presupuesto */}
            {hasBudget && (
              <div className="pt-3 border-t border-gray-100 dark:border-gray-700/60">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <DollarSign className="w-4 h-4" />
                    <span>Presupuesto</span>
                  </div>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(totalPresupuesto)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-700 dark:border-gray-700 dark:bg-gray-900/20 dark:text-gray-300">
                    <p className="font-medium">Fondos públicos</p>
                    <p className="mt-0.5 text-sm font-semibold">
                      {formatCurrency(totalFondosPublicos)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-700 dark:border-gray-700 dark:bg-gray-900/20 dark:text-gray-300">
                    <p className="font-medium">Autogestión</p>
                    <p className="mt-0.5 text-sm font-semibold">
                      {formatCurrency(totalAutogestion)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer con acciones */}
          <div className="px-5 py-3 bg-gray-50 dark:bg-gray-900/30 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between gap-2">
            <div>
              {evento.tieneReformaPendiente ? (
                <span className="inline-flex items-center rounded-md border border-amber-300 bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
                  Reforma pendiente
                </span>
              ) : null}
            </div>
            <div className="flex items-center justify-end gap-2">
            <Link
              href={`/eventos/${evento.id}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center justify-center rounded-lg border border-sky-200 px-3 py-1.5 text-sm font-medium text-sky-700 transition-colors hover:bg-sky-50 dark:border-sky-800 dark:text-sky-300 dark:hover:bg-sky-900/30"
            >
              Ver detalle
            </Link>
            {canManageEvents && (
              <>
                <Link
                  href={`/eventos/${evento.id}/editar`}
                  onClick={(e) => e.stopPropagation()}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-indigo-100 hover:text-indigo-600 dark:hover:bg-indigo-900/40 dark:hover:text-indigo-300 transition-colors"
                  title="Editar"
                  aria-label={`Editar evento ${evento.nombre || ""}`}
                >
                  <Pencil className="w-4 h-4" />
                </Link>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.(evento);
                  }}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-900/40 dark:hover:text-rose-300 transition-colors"
                  title="Eliminar"
                  aria-label={`Eliminar evento ${evento.nombre || ""}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            </div>
          </div>
          </div>
        );
      })}
    </div>
  );
}
