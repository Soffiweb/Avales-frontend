"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Calendar, ClipboardList, Plus } from "lucide-react";

import { useAuth } from "@/app/providers/auth-provider";
import AlertBanner from "@/components/ui/alert-banner";
import Pagination from "@/components/ui/pagination";
import SearchInput from "@/components/ui/search-input";
import { useResourceList } from "@/lib/hooks/use-resource-list";
import {
  listReformasMulti,
  ESTADO_REFORMA_MULTI_LABELS,
  FUENTE_REFORMA_LABELS,
  MES_NOMBRES,
  MES_OPCIONES,
} from "@/lib/api/reforms-multi";
import { canAccessReforms, canCreateReforma, getNormalizedRoles } from "@/lib/auth/access";
import { formatDateTimeShort } from "@/lib/utils/formatters";
import type { EstadoReformaMulti, ReformaMultiSummary } from "@/types/reforma-multi";

const STATUS_STYLES: Record<string, string> = {
  PENDIENTE:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  APROBADA:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  RECHAZADA:
    "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
};

function getStatusClasses(status?: string | null) {
  if (!status) return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  return (
    STATUS_STYLES[status.toUpperCase()] ??
    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
  );
}

const FUENTE_STYLES: Record<string, string> = {
  FONDOS_PUBLICOS:
    "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
  AUTOGESTION:
    "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200",
};

const LIMIT = 12;

export default function ReformasMultiPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState<EstadoReformaMulti | "">("");
  const [mesEjecucion, setMesEjecucion] = useState<number | "">("");

  const canAccess = canAccessReforms(user);
  const canCreate = canCreateReforma(user);
  const roles = getNormalizedRoles(user);
  const isPda = roles.includes("PDA");

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const {
    items: reforms,
    loading: isLoading,
    error,
    totalPages,
  } = useResourceList<ReformaMultiSummary>({
    queryKey: ["reformas-multi", page, search, estado, mesEjecucion],
    queryFn: () =>
      listReformasMulti({
        page,
        limit: LIMIT,
        search: search || undefined,
        estado: estado || undefined,
        mesEjecucion: mesEjecucion || undefined,
      }),
    page,
    limit: LIMIT,
    enabled: canAccess,
  });

  if (!canAccess) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-7xl mx-auto">
        <AlertBanner
          variant="error"
          message="No tienes permisos para ver reformas multi-evento."
        />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-7xl mx-auto">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Reformas Multi-Evento
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Solicitudes de transferencia presupuestaria entre múltiples eventos (N→M).
            </p>
          </div>
          {(canCreate || isPda) && (
            <Link
              href="/reformas-multi/nueva"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 transition"
            >
              <Plus className="h-4 w-4" />
              Nueva solicitud
            </Link>
          )}
        </div>

        {error ? (
          <AlertBanner
            variant="error"
            message={error ?? "Error al cargar reformas."}
          />
        ) : null}

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={handleSearch}
            placeholder="Buscar por motivo o número..."
            className="sm:w-72"
          />
          <select
            value={estado}
            onChange={(e) => {
              setEstado((e.target.value as EstadoReformaMulti) || "");
              setPage(1);
            }}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-gray-300"
          >
            <option value="">Todos los estados</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="APROBADA">Aprobada</option>
            <option value="RECHAZADA">Rechazada</option>
          </select>
          <select
            value={mesEjecucion}
            onChange={(e) => {
              setMesEjecucion(e.target.value ? Number(e.target.value) : "");
              setPage(1);
            }}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-gray-300"
          >
            <option value="">Todos los meses</option>
            {MES_OPCIONES.map((mes) => (
              <option key={mes.value} value={mes.value}>
                {mes.label}
              </option>
            ))}
          </select>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="mb-3 h-4 w-28 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="mb-2 h-5 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            ))}
          </div>
        ) : reforms.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300">
              <ClipboardList className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
              No hay reformas para mostrar
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Ajusta los filtros o crea una nueva solicitud.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {reforms.map((reform) => {
              const disciplinas = Array.from(
                new Set([
                  ...reform.origenes.map((o) => o.evento.disciplina?.nombre).filter(Boolean),
                  ...reform.destinos.map((d) => d.evento.disciplina?.nombre).filter(Boolean),
                ]),
              ) as string[];
              return (
              <article
                key={reform.id}
                className="flex flex-col h-full rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Reforma Multi #{reform.id}
                    </p>
                    <h2
                      className="mt-1 line-clamp-2 text-sm font-semibold text-gray-900 dark:text-gray-100"
                      title={reform.motivo}
                    >
                      {reform.motivo}
                    </h2>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusClasses(reform.estado)}`}
                    >
                      {ESTADO_REFORMA_MULTI_LABELS[reform.estado] ?? reform.estado}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                        FUENTE_STYLES[reform.fuente] ??
                        "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                      }`}
                    >
                      {FUENTE_REFORMA_LABELS[reform.fuente] ?? reform.fuente}
                    </span>
                    {disciplinas.length > 0 && (
                      <span className="inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-medium bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200">
                        {disciplinas.join(", ")}
                      </span>
                    )}
                  </div>
                </div>

                <dl className="flex-1 space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <dt className="text-xs text-gray-500 dark:text-gray-400">Orígenes</dt>
                      <dd className="mt-0.5 font-medium text-gray-900 dark:text-gray-100">
                        {reform.origenes.length} evento{reform.origenes.length !== 1 ? "s" : ""}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500 dark:text-gray-400">Destinos</dt>
                      <dd className="mt-0.5 font-medium text-gray-900 dark:text-gray-100">
                        {reform.destinos.length} evento{reform.destinos.length !== 1 ? "s" : ""}
                      </dd>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <dt className="text-xs text-gray-500 dark:text-gray-400">Mes</dt>
                      <dd className="mt-0.5 inline-flex items-center gap-1 font-medium text-gray-900 dark:text-gray-100">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        {MES_NOMBRES[reform.mesEjecucion] ?? `Mes ${reform.mesEjecucion}`}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500 dark:text-gray-400">Solicitante</dt>
                      <dd className="mt-0.5 truncate font-medium text-gray-900 dark:text-gray-100">
                        {reform.solicitante.nombre} {reform.solicitante.apellido}
                      </dd>
                    </div>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500 dark:text-gray-400">Fecha</dt>
                    <dd className="mt-0.5 text-gray-700 dark:text-gray-300">
                      {formatDateTimeShort(reform.createdAt)}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-700/60">
                  <Link
                    href={`/reformas-multi/${reform.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 px-3 py-1.5 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50 hover:text-indigo-700 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-300"
                  >
                    Ver detalle
                  </Link>
                </div>
              </article>
            );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  );
}
