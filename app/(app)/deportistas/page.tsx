"use client";

import { useEffect } from "react";

import AlertBanner from "@/components/ui/alert-banner";
import SearchInput from "@/components/ui/search-input";
import Pagination from "@/components/ui/pagination";
import DeportistaTable from "./_components/deportista-table";
import { listDeportistas } from "@/lib/api/deportistas";
import type { Deportista } from "@/types/deportista";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import { useResourceList } from "@/lib/hooks/use-resource-list";
import { useUrlFilters } from "@/lib/hooks/use-url-filters";
import { useStatusToast } from "@/lib/hooks/use-status-toast";

export default function DeportistasPage() {
  const { filters, page, setFilter, setPage } = useUrlFilters("/deportistas", {
    query: "",
    genero: "",
  });

  const { items: deportistas, loading, error, pagination, totalPages, currentPage } =
    useResourceList<Deportista>({
      queryKey: ["deportistas", filters.query, filters.genero, page],
      queryFn: () =>
        listDeportistas({
          query: filters.query.trim() || undefined,
          genero: filters.genero || undefined,
          page,
          limit: DEFAULT_PAGE_SIZE,
        }),
      page,
    });

  const { toast, setToast } = useStatusToast("/deportistas", {
    error: { variant: "error", message: "No se pudo procesar la solicitud." },
  });

  useEffect(() => {
    if (page !== currentPage) setPage(currentPage);
  }, [page, currentPage, setPage]);

  return (
    <>
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm w-full drop-shadow-lg">
          <AlertBanner
            variant={toast.variant}
            message={toast.message}
            description={toast.description}
            onClose={() => setToast(null)}
          />
        </div>
      )}

      {error && !loading && (
        <div className="fixed top-4 right-4 z-50 max-w-sm w-full drop-shadow-lg">
          <AlertBanner variant="error" message={error} onClose={() => {}} />
        </div>
      )}

      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-[96rem] mx-auto space-y-6">
        <div className="sm:flex sm:justify-between sm:items-center gap-4">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">
              Deportistas
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Vista principal con el listado de deportistas afiliados.
            </p>
          </div>

          <div className="grid grid-flow-row sm:grid-flow-col sm:auto-cols-max sm:justify-end gap-2 w-full sm:w-auto">
            <SearchInput
              className="w-full sm:w-64"
              placeholder="Buscar por nombres, apellidos o cedula"
              value={filters.query}
              onChange={(v) => setFilter("query", v)}
            />
            <select
              className="form-select w-full sm:w-40"
              value={filters.genero}
              onChange={(e) => setFilter("genero", e.target.value)}
            >
              <option value="">Todos</option>
              <option value="MASCULINO">Masculino</option>
              <option value="FEMENINO">Femenino</option>
            </select>
          </div>
        </div>

        <DeportistaTable deportistas={deportistas} loading={loading} error={error} />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-6">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-3 sm:mb-0">
            Pagina {currentPage} de {totalPages} (mostrando {deportistas.length}{" "}
            de {pagination.total})
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      </div>
    </>
  );
}
