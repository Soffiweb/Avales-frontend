"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Upload } from "lucide-react";

import AlertBanner from "@/components/ui/alert-banner";
import SearchInput from "@/components/ui/search-input";
import ConfirmModal from "@/components/ui/confirm-modal";
import EventoCard from "./_components/evento-card";
import Pagination from "@/components/ui/pagination";
import UploadEventsExcelModal from "@/components/events/upload-excel-events-modal";
import { useAuth } from "@/app/providers/auth-provider";
import { getNormalizedRoles, isAdminUser, isDTMUser, isPdaUser } from "@/lib/auth/access";
import { getDisciplinas } from "@/lib/api/catalog";
import { listEventos, softDeleteEvento } from "@/lib/api/eventos";
import type { CatalogItem } from "@/types/catalog";
import type { Evento } from "@/types/evento";
import { CONFIRM_CLEANUP_DELAY, EVENTOS_PAGE_SIZE } from "@/lib/constants";
import { useResourceList } from "@/lib/hooks/use-resource-list";
import { useUrlFilters } from "@/lib/hooks/use-url-filters";
import { useStatusToast } from "@/lib/hooks/use-status-toast";

const STATUS_OPTIONS = [
  { label: "Todos los estados", value: "" },
  { label: "Disponible", value: "DISPONIBLE" },
  { label: "Solicitado", value: "SOLICITADO" },
  { label: "Rechazado", value: "RECHAZADO" },
  { label: "Aceptado", value: "ACEPTADO" },
];

export default function EventosPage() {
  const { user } = useAuth();
  const userRoles = getNormalizedRoles(user);
  const canManageEvents = isAdminUser(user);
  const isDTM = isDTMUser(user);
  const isEntrenador = userRoles.includes("ENTRENADOR") && !canManageEvents;
  // El filtro de disciplina lo ven admins y PDA (item 4: PDA no tenía filtro en eventos).
  const canFilterByDisciplina = canManageEvents || isPdaUser(user);

  const { filters, page, setFilter, setPage } = useUrlFilters("/eventos", {
    search: "",
    estado: "",
    disciplinaId: "",
  });

  const disciplinaIdFilter =
    filters.disciplinaId && !isEntrenador
      ? Number(filters.disciplinaId)
      : undefined;

  const { items: eventos, loading, error, pagination, totalPages, currentPage, refetch } =
    useResourceList<Evento>({
      queryKey: ["eventos", filters.search, filters.estado, disciplinaIdFilter, page],
      queryFn: () =>
        listEventos({
          page,
          limit: EVENTOS_PAGE_SIZE,
          estado: filters.estado || undefined,
          search: filters.search.trim() || undefined,
          disciplinaId: disciplinaIdFilter,
        }),
      page,
    });

  const { toast, setToast } = useStatusToast("/eventos", {
    created: {
      variant: "success",
      message: "Evento creado correctamente.",
      description: "El listado se actualiza automaticamente.",
    },
    updated: { variant: "success", message: "Evento actualizado correctamente." },
    error: { variant: "error", message: "No se pudo procesar la solicitud." },
  });

  const [disciplinas, setDisciplinas] = useState<CatalogItem[]>([]);
  const [disciplinasLoading, setDisciplinasLoading] = useState(false);
  const [confirmEvento, setConfirmEvento] = useState<Evento | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  useEffect(() => {
    if (page !== currentPage) setPage(currentPage);
  }, [page, currentPage, setPage]);

  useEffect(() => {
    if (!canFilterByDisciplina) return;
    setDisciplinasLoading(true);
    getDisciplinas()
      .then((res) => setDisciplinas(res.data ?? []))
      .catch(() => setDisciplinas([]))
      .finally(() => setDisciplinasLoading(false));
  }, [canFilterByDisciplina]);

  useEffect(() => {
    if (confirmOpen) return;
    const t = setTimeout(() => setConfirmEvento(null), CONFIRM_CLEANUP_DELAY);
    return () => clearTimeout(t);
  }, [confirmOpen]);

  const handleDelete = (evento: Evento) => {
    setConfirmEvento(evento);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!confirmEvento) return;
    try {
      setDeleting(true);
      await softDeleteEvento(confirmEvento.id);
      setToast({ variant: "success", message: "Evento eliminado correctamente." });
      refetch();
    } catch (err: unknown) {
      setToast({
        variant: "error",
        message:
          err instanceof Error ? err.message : "No se pudo eliminar el evento.",
      });
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  };

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
              Eventos
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Gestión paginada y filtrada de eventos activos.
            </p>
          </div>

          <div className="grid grid-flow-row sm:grid-flow-col sm:auto-cols-max sm:justify-end gap-2 w-full sm:w-auto">
            <SearchInput
              className="w-full sm:w-64"
              placeholder="Buscar por nombre, lugar o codigo"
              value={filters.search}
              onChange={(v) => setFilter("search", v)}
            />
            <select
              className="form-select w-full sm:w-48"
              value={filters.estado}
              onChange={(e) => setFilter("estado", e.target.value)}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {canFilterByDisciplina && !isDTM && (
              <select
                className="form-select w-full sm:w-56"
                value={filters.disciplinaId}
                onChange={(e) => setFilter("disciplinaId", e.target.value)}
                disabled={disciplinasLoading}
              >
                <option value="">Todas las disciplinas</option>
                {disciplinas.map((d) => (
                  <option key={d.id} value={String(d.id)}>
                    {d.nombre}
                  </option>
                ))}
              </select>
            )}
            {canManageEvents && !isDTM && (
              <>
                <button
                  onClick={() => setUploadModalOpen(true)}
                  className="btn bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Importar Excel
                </button>
                <Link
                  href="/eventos/nuevo"
                  className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white"
                >
                  Nuevo evento
                </Link>
              </>
            )}
          </div>
        </div>

        <EventoCard
          eventos={eventos}
          loading={loading}
          error={error}
          onDelete={canManageEvents && !isDTM ? handleDelete : undefined}
          canManageEvents={canManageEvents && !isDTM}
        />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-6">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-3 sm:mb-0">
            Página {currentPage} de {totalPages} (mostrando {eventos.length} de{" "}
            {pagination.total})
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Eliminar evento"
        description={`Seguro que quieres eliminar el evento "${
          confirmEvento?.nombre ?? confirmEvento?.codigo ?? ""
        }"?`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => {
          if (deleting) return;
          setConfirmOpen(false);
        }}
      />

      <UploadEventsExcelModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={() => refetch()}
      />
    </>
  );
}
