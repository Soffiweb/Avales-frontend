"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardEdit, Clock3, Search } from "lucide-react";

import AlertBanner from "@/components/ui/alert-banner";
import { listReforms, type ReformResponse } from "@/lib/api/reforms";

const STATUS_STYLES: Record<string, string> = {
  PENDIENTE:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  APROBADA:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  RECHAZADA:
    "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
};

function getStatusClasses(status?: string | null) {
  if (!status) {
    return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  }
  return (
    STATUS_STYLES[status.toUpperCase()] ??
    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
  );
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ReformasPage() {
  const [reforms, setReforms] = useState<ReformResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchReforms() {
      try {
        setLoading(true);
        setError(null);
        const response = await listReforms();
        setReforms(response.data ?? []);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "No se pudieron cargar las reformas.",
        );
      } finally {
        setLoading(false);
      }
    }

    void fetchReforms();
  }, []);

  const filteredReforms = useMemo(() => {
    const term = search.trim().toLowerCase();

    return reforms.filter((reform) => {
      const matchesStatus = statusFilter ? reform.estado === statusFilter : true;
      const matchesSearch = term
        ? [
            reform.motivo,
            reform.evento?.nombre,
            reform.evento?.codigo,
            String(reform.id),
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(term))
        : true;

      return matchesStatus && matchesSearch;
    });
  }, [reforms, search, statusFilter]);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-7xl mx-auto">
      {error ? (
        <div className="mb-6">
          <AlertBanner
            variant="error"
            message={error}
            onClose={() => setError(null)}
          />
        </div>
      ) : null}

      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Reformas
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Revisa las solicitudes de reforma registradas para los eventos.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por evento, código o motivo"
                className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-9 pr-4 text-sm text-gray-900 outline-none transition focus:border-gray-900 sm:w-72 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-gray-300"
              />
            </label>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-gray-300"
            >
              <option value="">Todos los estados</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="APROBADA">Aprobada</option>
              <option value="RECHAZADA">Rechazada</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="mb-3 h-4 w-28 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="mb-2 h-5 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="mb-4 h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="space-y-2">
                  <div className="h-3 w-full rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="h-3 w-5/6 rounded bg-gray-200 dark:bg-gray-700" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredReforms.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300">
              <ClipboardEdit className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
              No hay reformas para mostrar
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Ajusta los filtros o espera nuevas solicitudes de reforma.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredReforms.map((reform) => (
              <article
                key={reform.id}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Reforma #{reform.id}
                    </p>
                    <h2 className="mt-1 truncate text-lg font-semibold text-gray-900 dark:text-gray-100" title={reform.evento?.nombre}>
                      {reform.evento?.nombre || "Evento sin nombre"}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {reform.evento?.codigo || "Sin código"}
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusClasses(
                      reform.estado,
                    )}`}
                  >
                    {reform.estado}
                  </span>
                </div>

                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Motivo</dt>
                    <dd className="mt-1 text-gray-900 dark:text-gray-100">
                      {reform.motivo || "-"}
                    </dd>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <dt className="text-gray-500 dark:text-gray-400">
                        Estado del evento
                      </dt>
                      <dd className="mt-1 text-gray-900 dark:text-gray-100">
                        {reform.evento?.estado || "-"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500 dark:text-gray-400">
                        Fecha de solicitud
                      </dt>
                      <dd className="mt-1 inline-flex items-center gap-1.5 text-gray-900 dark:text-gray-100">
                        <Clock3 className="h-3.5 w-3.5 text-gray-400" />
                        {formatDate(reform.createdAt)}
                      </dd>
                    </div>
                  </div>

                  {reform.observacion ? (
                    <div>
                      <dt className="text-gray-500 dark:text-gray-400">
                        Observación
                      </dt>
                      <dd className="mt-1 text-gray-700 dark:text-gray-300">
                        {reform.observacion}
                      </dd>
                    </div>
                  ) : null}
                </dl>

                <div className="mt-5 border-t border-gray-100 pt-4 dark:border-gray-700/60">
                  <Link
                    href={`/reformas/${reform.id}`}
                    className="inline-flex items-center text-sm font-medium text-indigo-600 transition hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                  >
                    Ver detalle
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
