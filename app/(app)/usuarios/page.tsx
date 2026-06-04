"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Upload } from "lucide-react";

import AlertBanner from "@/components/ui/alert-banner";
import SearchInput from "@/components/ui/search-input";
import ConfirmModal from "@/components/ui/confirm-modal";
import Pagination from "@/components/ui/pagination";
import UsuarioTable from "./_components/usuario-table";
import UploadUsersExcelModal from "@/components/users/upload-excel-users-modal";
import { softDeleteUser, listUsers } from "@/lib/api/user";
import type { User } from "@/types/user";
import { CONFIRM_CLEANUP_DELAY, DEFAULT_PAGE_SIZE } from "@/lib/constants";
import { useResourceList } from "@/lib/hooks/use-resource-list";
import { useUrlFilters } from "@/lib/hooks/use-url-filters";
import { useStatusToast } from "@/lib/hooks/use-status-toast";

const MIN_QUERY_LENGTH = 2;

export default function Usuarios() {
  const { filters, page, setFilter, setPage } = useUrlFilters("/usuarios", {
    query: "",
  });

  const normalizedQuery = useMemo(() => filters.query.trim(), [filters.query]);
  const effectiveQuery =
    normalizedQuery.length >= MIN_QUERY_LENGTH ? normalizedQuery : undefined;
  const shouldFetchUsers =
    normalizedQuery.length === 0 || normalizedQuery.length >= MIN_QUERY_LENGTH;

  const { items: users, loading, error, pagination, totalPages, currentPage, refetch } =
    useResourceList<User>({
      queryKey: ["usuarios", effectiveQuery, page],
      queryFn: (signal) =>
        listUsers({ query: effectiveQuery, page, limit: DEFAULT_PAGE_SIZE }, signal),
      page,
      enabled: shouldFetchUsers,
    });

  const { toast, setToast } = useStatusToast("/usuarios", {
    created: {
      variant: "success",
      message: "Usuario creado correctamente.",
      description: "El listado se actualiza automaticamente.",
    },
    updated: {
      variant: "success",
      message: "Usuario actualizado correctamente.",
      description: "El listado se actualiza automaticamente.",
    },
    error: { variant: "error", message: "Ocurrio un problema al procesar tu solicitud." },
  });

  const [confirmUser, setConfirmUser] = useState<User | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  useEffect(() => {
    if (page !== currentPage) setPage(currentPage);
  }, [page, currentPage, setPage]);

  useEffect(() => {
    if (confirmOpen) return;
    const t = setTimeout(() => setConfirmUser(null), CONFIRM_CLEANUP_DELAY);
    return () => clearTimeout(t);
  }, [confirmOpen]);

  const handleDelete = (user: User) => {
    setConfirmUser(user);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!confirmUser) return;
    try {
      setDeleting(true);
      await softDeleteUser(confirmUser.id);
      setToast({ variant: "success", message: "Usuario eliminado correctamente." });
      refetch();
    } catch (err: unknown) {
      setToast({
        variant: "error",
        message:
          err instanceof Error ? err.message : "No se pudo eliminar el usuario.",
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

      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-[96rem] mx-auto space-y-6">
        <div className="sm:flex sm:justify-between sm:items-center">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">
              Usuarios
            </h1>
          </div>

          <div className="grid grid-flow-col sm:auto-cols-max justify-start sm:justify-end gap-2">
            <SearchInput
              className="w-full sm:w-64"
              placeholder="Buscar por nombre, email, cedula..."
              value={filters.query}
              debounceMs={400}
              onChange={(v) => {
                setFilter("query", v);
                setPage(1);
              }}
            />
            <button
              onClick={() => setUploadModalOpen(true)}
              className="btn bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              Cargar Excel
            </button>
            <Link
              href="/usuarios/nuevo"
              className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white"
            >
              Nuevo usuario
            </Link>
          </div>
        </div>

        <UsuarioTable users={users} loading={loading} error={error} onDelete={handleDelete} />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-6">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-3 sm:mb-0">
            Pagina {currentPage} de {totalPages} (mostrando {users.length} de{" "}
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
        title="Eliminar usuario"
        description={
          confirmUser
            ? `Seguro que quieres eliminar a ${confirmUser.nombre ?? confirmUser.email}?`
            : ""
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => {
          if (deleting) return;
          setConfirmOpen(false);
        }}
      />

      <UploadUsersExcelModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={() => refetch()}
      />
    </>
  );
}
