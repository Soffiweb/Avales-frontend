"use client";

import { useState } from "react";
import { useAuth } from "@/app/providers/auth-provider";
import { isAdminUser } from "@/lib/auth/access";
import { useResourceList } from "@/lib/hooks/use-resource-list";
import { useUrlFilters } from "@/lib/hooks/use-url-filters";
import { getRegistrosError, getReportesProblema, actualizarEstadoReporte } from "@/lib/api/monitoreo";
import type { RegistroError, ReporteProblema, EstadoReporte } from "@/types/monitoreo";
import AlertBanner from "@/components/ui/alert-banner";
import SearchInput from "@/components/ui/search-input";
import Pagination from "@/components/ui/pagination";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";

type Tab = "errores" | "reportes";

const ESTADO_OPTIONS: { label: string; value: EstadoReporte | "" }[] = [
  { label: "Todos los estados", value: "" },
  { label: "Nuevo", value: "NUEVO" },
  { label: "Visto", value: "VISTO" },
  { label: "Resuelto", value: "RESUELTO" },
];

const ESTADO_LABELS: Record<EstadoReporte, string> = {
  NUEVO: "Nuevo",
  VISTO: "Visto",
  RESUELTO: "Resuelto",
};

const ESTADO_COLORS: Record<EstadoReporte, string> = {
  NUEVO: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  VISTO: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  RESUELTO: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
};

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-EC", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MonitoreoPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("errores");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  if (!isAdminUser(user)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
            Acceso restringido
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No tienes permisos para acceder a esta sección.
          </p>
        </div>
      </div>
    );
  }

  return (
    <MonitoreoAdminContent
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      actionError={actionError}
      setActionError={setActionError}
      actionSuccess={actionSuccess}
      setActionSuccess={setActionSuccess}
      updatingId={updatingId}
      setUpdatingId={setUpdatingId}
    />
  );
}

type ContentProps = {
  activeTab: Tab;
  setActiveTab: (t: Tab) => void;
  actionError: string | null;
  setActionError: (v: string | null) => void;
  actionSuccess: string | null;
  setActionSuccess: (v: string | null) => void;
  updatingId: number | null;
  setUpdatingId: (id: number | null) => void;
};

function MonitoreoAdminContent({
  activeTab,
  setActiveTab,
  actionError,
  setActionError,
  actionSuccess,
  setActionSuccess,
  updatingId,
  setUpdatingId,
}: ContentProps) {
  const { filters: erroresFilters, page: erroresPage, setFilter: setErrorFilter, setPage: setErrorPage } =
    useUrlFilters("/monitoreo", { requestId: "", desde: "", hasta: "" });

  const { filters: reportesFilters, page: reportesPage, setFilter: setReporteFilter, setPage: setReportePage } =
    useUrlFilters("/monitoreo", { requestId: "", estado: "", desde: "", hasta: "" });

  const {
    items: errores,
    loading: erroresLoading,
    error: erroresError,
    totalPages: erroresTotalPages,
    currentPage: erroresCurrentPage,
  } = useResourceList<RegistroError>({
    queryKey: ["monitoreo-errores", erroresFilters.requestId, erroresFilters.desde, erroresFilters.hasta, erroresPage],
    queryFn: () =>
      getRegistrosError({
        page: erroresPage,
        limit: DEFAULT_PAGE_SIZE,
        requestId: erroresFilters.requestId.trim() || undefined,
        desde: erroresFilters.desde || undefined,
        hasta: erroresFilters.hasta || undefined,
      }),
    page: erroresPage,
    enabled: activeTab === "errores",
    select: (res) => {
      const r = res as Record<string, unknown>;
      const data = r?.data;
      if (Array.isArray(data)) return data as RegistroError[];
      if (data && typeof data === "object") {
        const nested = data as Record<string, unknown>;
        return (Array.isArray(nested.items) ? nested.items : []) as RegistroError[];
      }
      return [];
    },
  });

  const {
    items: reportes,
    loading: reportesLoading,
    error: reportesError,
    totalPages: reportesTotalPages,
    currentPage: reportesCurrentPage,
    refetch: refetchReportes,
  } = useResourceList<ReporteProblema>({
    queryKey: ["monitoreo-reportes", reportesFilters.requestId, reportesFilters.estado, reportesFilters.desde, reportesFilters.hasta, reportesPage],
    queryFn: () =>
      getReportesProblema({
        page: reportesPage,
        limit: DEFAULT_PAGE_SIZE,
        requestId: reportesFilters.requestId.trim() || undefined,
        estado: (reportesFilters.estado as EstadoReporte) || undefined,
        desde: reportesFilters.desde || undefined,
        hasta: reportesFilters.hasta || undefined,
      }),
    page: reportesPage,
    enabled: activeTab === "reportes",
    select: (res) => {
      const r = res as Record<string, unknown>;
      const data = r?.data;
      if (Array.isArray(data)) return data as ReporteProblema[];
      if (data && typeof data === "object") {
        const nested = data as Record<string, unknown>;
        return (Array.isArray(nested.items) ? nested.items : []) as ReporteProblema[];
      }
      return [];
    },
  });

  const handleEstadoChange = async (id: number, estado: EstadoReporte) => {
    setUpdatingId(id);
    setActionError(null);
    setActionSuccess(null);
    try {
      await actualizarEstadoReporte(id, estado);
      setActionSuccess("Estado actualizado correctamente.");
      refetchReportes();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "No se pudo actualizar el estado.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-[96rem] mx-auto space-y-6">
      {(actionError || actionSuccess) && (
        <div className="fixed top-4 right-4 z-50 max-w-sm w-full drop-shadow-lg">
          {actionError && (
            <AlertBanner variant="error" message={actionError} onClose={() => setActionError(null)} />
          )}
          {actionSuccess && (
            <AlertBanner variant="success" message={actionSuccess} onClose={() => setActionSuccess(null)} />
          )}
        </div>
      )}

      <div className="mb-4">
        <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">
          Monitoreo
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Registro de errores automáticos y reportes de usuarios.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex gap-6">
          {(["errores", "reportes"] as Tab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors capitalize ${
                activeTab === tab
                  ? "border-gray-900 text-gray-900 dark:border-gray-100 dark:text-gray-100"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              {tab === "errores" ? "Errores automáticos" : "Reportes de usuarios"}
            </button>
          ))}
        </nav>
      </div>

      {/* Errores tab */}
      {activeTab === "errores" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <SearchInput
              className="w-full sm:w-64"
              placeholder="Buscar por request ID"
              value={erroresFilters.requestId}
              onChange={(v) => setErrorFilter("requestId", v)}
            />
            <input
              type="date"
              className="form-input w-full sm:w-44"
              value={erroresFilters.desde}
              onChange={(e) => setErrorFilter("desde", e.target.value)}
              aria-label="Desde"
            />
            <input
              type="date"
              className="form-input w-full sm:w-44"
              value={erroresFilters.hasta}
              onChange={(e) => setErrorFilter("hasta", e.target.value)}
              aria-label="Hasta"
            />
          </div>

          {erroresError && !erroresLoading && (
            <AlertBanner variant="error" message={erroresError} onClose={() => {}} />
          )}

          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-gray-800/60 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3">Request ID</th>
                  <th className="px-4 py-3">Método</th>
                  <th className="px-4 py-3">Ruta</th>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Detalle</th>
                  <th className="px-4 py-3">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {erroresLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      Cargando...
                    </td>
                  </tr>
                ) : errores.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      No hay registros.
                    </td>
                  </tr>
                ) : (
                  errores.map((e) => (
                    <tr key={e.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/40">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400 max-w-[12rem] truncate" title={e.requestId}>
                        {e.requestId}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">
                        {e.metodo ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-[14rem] truncate" title={e.ruta ?? ""}>
                        {e.ruta ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        {e.statusCode ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-[10rem] truncate" title={e.errorType ?? ""}>
                        {e.errorType ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-[16rem] truncate" title={e.detalle ?? ""}>
                        {e.detalle ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {formatDate(e.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-3 sm:mb-0">
              Página {erroresCurrentPage} de {erroresTotalPages}
            </div>
            <Pagination
              currentPage={erroresCurrentPage}
              totalPages={erroresTotalPages}
              onPageChange={setErrorPage}
            />
          </div>
        </div>
      )}

      {/* Reportes tab */}
      {activeTab === "reportes" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <SearchInput
              className="w-full sm:w-64"
              placeholder="Buscar por request ID"
              value={reportesFilters.requestId}
              onChange={(v) => setReporteFilter("requestId", v)}
            />
            <select
              className="form-select w-full sm:w-48"
              value={reportesFilters.estado}
              onChange={(e) => setReporteFilter("estado", e.target.value)}
            >
              {ESTADO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <input
              type="date"
              className="form-input w-full sm:w-44"
              value={reportesFilters.desde}
              onChange={(e) => setReporteFilter("desde", e.target.value)}
              aria-label="Desde"
            />
            <input
              type="date"
              className="form-input w-full sm:w-44"
              value={reportesFilters.hasta}
              onChange={(e) => setReporteFilter("hasta", e.target.value)}
              aria-label="Hasta"
            />
          </div>

          {reportesError && !reportesLoading && (
            <AlertBanner variant="error" message={reportesError} onClose={() => {}} />
          )}

          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-gray-800/60 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Descripción</th>
                  <th className="px-4 py-3">URL</th>
                  <th className="px-4 py-3">Request ID</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {reportesLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      Cargando...
                    </td>
                  </tr>
                ) : reportes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      No hay reportes.
                    </td>
                  </tr>
                ) : (
                  reportes.map((r) => (
                    <tr key={r.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/40">
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{r.id}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-[16rem] truncate" title={r.descripcion}>
                        {r.descripcion}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-[12rem] truncate" title={r.url ?? ""}>
                        {r.url ?? "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400 max-w-[10rem] truncate" title={r.requestId ?? ""}>
                        {r.requestId ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${ESTADO_COLORS[r.estado]}`}
                          value={r.estado}
                          disabled={updatingId === r.id}
                          onChange={(e) => handleEstadoChange(r.id, e.target.value as EstadoReporte)}
                          aria-label={`Estado del reporte ${r.id}`}
                        >
                          {(["NUEVO", "VISTO", "RESUELTO"] as EstadoReporte[]).map((s) => (
                            <option key={s} value={s}>
                              {ESTADO_LABELS[s]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {formatDate(r.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-3 sm:mb-0">
              Página {reportesCurrentPage} de {reportesTotalPages}
            </div>
            <Pagination
              currentPage={reportesCurrentPage}
              totalPages={reportesTotalPages}
              onPageChange={setReportePage}
            />
          </div>
        </div>
      )}
    </div>
  );
}
