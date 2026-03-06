"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import Link from "next/link";
import { Upload } from "lucide-react";

import AlertBanner from "@/components/ui/alert-banner";
import ConfirmModal from "@/components/ui/confirm-modal";
import EventoCard from "./_components/evento-card";
import Pagination from "@/components/ui/pagination";
import UploadEventsExcelModal from "@/components/events/upload-excel-events-modal";
import { useAuth } from "@/app/providers/auth-provider";
import { getDisciplinas } from "@/lib/api/catalog";
import { listEventos, softDeleteEvento, type ListEventosOptions } from "@/lib/api/eventos";
import type { CatalogItem } from "@/types/catalog";
import type { Evento } from "@/types/evento";

const PAGE_SIZE = 9;

const STATUS_OPTIONS = [
  { label: "Todos los estados", value: "" },
  { label: "Disponible", value: "DISPONIBLE" },
  { label: "Solicitado", value: "SOLICITADO" },
  { label: "Rechazado", value: "RECHAZADO" },
  { label: "Aceptado", value: "ACEPTADO" },
];

export default function EventosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const [estado, setEstado] = useState(() => searchParams.get("estado") ?? "");
  const [disciplinaId, setDisciplinaId] = useState(
    () => searchParams.get("disciplinaId") ?? ""
  );
  const [page, setPage] = useState(() => {
    const value = Number(searchParams.get("page") ?? "1");
    return Number.isFinite(value) && value > 0 ? value : 1;
  });
  const [pagination, setPagination] = useState({
    page,
    limit: PAGE_SIZE,
    total: 0,
  });
  const [toast, setToast] = useState<{
    variant: "success" | "error";
    message: string;
    description?: string;
  } | null>(null);
  const { user } = useAuth();
  const userRoles = user?.roles ?? [];
  const canManageEvents =
    userRoles.includes("SUPER_ADMIN") || userRoles.includes("ADMIN");
  const isEntrenador =
    userRoles.includes("ENTRENADOR") && !canManageEvents;
  const entrenadorDisciplinaId =
    user?.disciplinaId ?? user?.disciplinas?.[0];
  const [disciplinas, setDisciplinas] = useState<CatalogItem[]>([]);
  const [disciplinasLoading, setDisciplinasLoading] = useState(false);
  const [confirmEvento, setConfirmEvento] = useState<Evento | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const pageSize = pagination.limit || PAGE_SIZE;
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((pagination.total || 0) / pageSize)),
    [pagination.total, pageSize]
  );
  const currentPage = Math.min(page, totalPages);
  const showing = eventos.length;

  useEffect(() => {
    if (page === currentPage) return;
    setPage(currentPage);
  }, [page, currentPage]);

  useEffect(() => {
    if (!canManageEvents) return;

    const loadDisciplinas = async () => {
      try {
        setDisciplinasLoading(true);
        const res = await getDisciplinas();
        setDisciplinas(res.data ?? []);
      } catch {
        setDisciplinas([]);
      } finally {
        setDisciplinasLoading(false);
      }
    };

    void loadDisciplinas();
  }, [canManageEvents]);

  const fetchEventos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      if (isEntrenador && !entrenadorDisciplinaId) {
        setEventos([]);
        setPagination({
          page: currentPage,
          limit: PAGE_SIZE,
          total: 0,
        });
        setError("Tu usuario no tiene una disciplina asignada.");
        return;
      }
      const options: ListEventosOptions = {
        page: currentPage,
        limit: PAGE_SIZE,
        estado: estado || undefined,
        search: search.trim() || undefined,
        disciplinaId: isEntrenador
          ? entrenadorDisciplinaId
          : disciplinaId
            ? Number(disciplinaId)
            : undefined,
      };
      const res = await listEventos(options);
      const items = res.data ?? [];
      const meta = res.meta;
      setEventos(items);
      setPagination({
        page:
          typeof meta?.page === "number" && meta.page > 0
            ? meta.page
            : currentPage,
        limit:
          typeof meta?.limit === "number" && meta.limit > 0
            ? meta.limit
            : PAGE_SIZE,
        total:
          typeof meta?.total === "number" && meta.total >= 0
            ? meta.total
            : items.length,
      });
    } catch (err: any) {
      const message = err?.message ?? "No se pudieron cargar los eventos.";
      setError(message);
      setToast({ variant: "error", message });
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    estado,
    search,
    isEntrenador,
    entrenadorDisciplinaId,
    disciplinaId,
  ]);

  useEffect(() => {
    void fetchEventos();
  }, [fetchEventos]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (estado) params.set("estado", estado);
    if (disciplinaId) params.set("disciplinaId", disciplinaId);
    if (currentPage > 1) params.set("page", String(currentPage));

    router.replace(
      params.toString() ? `/eventos?${params}` : "/eventos",
      { scroll: false }
    );
  }, [search, estado, disciplinaId, currentPage, router]);

  // mostrar toast cuando viene status desde la creacion/edicion
  useEffect(() => {
    const status = searchParams.get("status");
    if (!status) return;

    if (status === "created") {
      setToast({
        variant: "success",
        message: "Evento creado correctamente.",
        description: "El listado se actualiza automaticamente.",
      });
    } else if (status === "updated") {
      setToast({
        variant: "success",
        message: "Evento actualizado correctamente.",
      });
    } else if (status === "error") {
      setToast({
        variant: "error",
        message: "No se pudo procesar la solicitud.",
      });
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("status");
    router.replace(
      params.toString() ? `/eventos?${params}` : "/eventos",
      { scroll: false }
    );
  }, [searchParams, router]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (confirmOpen) return;
    const timer = setTimeout(() => setConfirmEvento(null), 180);
    return () => clearTimeout(timer);
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
      setToast({
        variant: "success",
        message: "Evento eliminado correctamente.",
      });
      await fetchEventos();
    } catch (err: any) {
      setToast({
        variant: "error",
        message: err?.message ?? "No se pudo eliminar el evento.",
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
          <AlertBanner
            variant="error"
            message={error}
            onClose={() => setError(null)}
          />
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
            <input
              className="form-input w-full sm:w-64"
              placeholder="Buscar por nombre, lugar o código"
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
            />
            <select
              className="form-select w-full sm:w-48"
              value={estado}
              onChange={(e) => {
                setPage(1);
                setEstado(e.target.value);
              }}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {canManageEvents && (
              <select
                className="form-select w-full sm:w-56"
                value={disciplinaId}
                onChange={(e) => {
                  setPage(1);
                  setDisciplinaId(e.target.value);
                }}
                disabled={disciplinasLoading}
              >
                <option value="">Todas las disciplinas</option>
                {disciplinas.map((disciplina) => (
                  <option key={disciplina.id} value={String(disciplina.id)}>
                    {disciplina.nombre}
                  </option>
                ))}
              </select>
            )}
            {canManageEvents && (
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
          onDelete={canManageEvents ? handleDelete : undefined}
          canManageEvents={canManageEvents}
        />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-6">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-3 sm:mb-0">
            Página {currentPage} de {totalPages} (mostrando {showing} de{" "}
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
        onSuccess={() => {
          fetchEventos(); // Refrescar la lista
          // No cerramos el modal automáticamente para que vean el resultado, 
          // pero si el usuario cierra, ya estará refrescado.
        }}
      />
    </>
  );
}
