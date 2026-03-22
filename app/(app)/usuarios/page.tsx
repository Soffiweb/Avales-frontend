"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Upload } from "lucide-react";

import AlertBanner from "@/components/ui/alert-banner";
import SearchInput from "@/components/ui/search-input";
import ConfirmModal from "@/components/ui/confirm-modal";
import Pagination from "@/components/ui/pagination";
import UsuarioTable from "./_components/usuario-table";
import UploadUsersExcelModal from "@/components/users/upload-excel-users-modal";
import { softDeleteUser, listUsers } from "@/lib/api/user";
import type { User } from "@/types/user";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
const SEARCH_DEBOUNCE_MS = 400;
const MIN_QUERY_LENGTH = 2;

export default function Usuarios() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState(() => searchParams.get("query") ?? "");
  const [debouncedQ, setDebouncedQ] = useState(() =>
    searchParams.get("query") ?? ""
  );
  const [page, setPage] = useState(() => {
    const value = Number(searchParams.get("page") ?? "1");
    return Number.isFinite(value) && value > 0 ? value : 1;
  });
  const [pagination, setPagination] = useState({
    page,
    limit: DEFAULT_PAGE_SIZE,
    total: 0,
  });
  const [toast, setToast] = useState<{
    variant: "success" | "error";
    message: string;
    description?: string;
  } | null>(null);
  const [confirmUser, setConfirmUser] = useState<User | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const pageSize = pagination.limit || DEFAULT_PAGE_SIZE;
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((pagination.total || 0) / pageSize)),
    [pagination.total, pageSize]
  );
  const currentPage = Math.min(page, totalPages);
  const showing = users.length;

  useEffect(() => {
    if (page === currentPage) return;
    setPage(currentPage);
  }, [page, currentPage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQ(q);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [q]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const query = debouncedQ.trim();
      const effectiveQuery =
        query.length >= MIN_QUERY_LENGTH ? query : undefined;

      const res = await listUsers({
        query: effectiveQuery,
        page: currentPage,
        limit: pageSize,
      });
      const items = res.data ?? [];
      const apiPagination = res.pagination;
      const meta = res.meta;
      const apiPage = apiPagination?.current_page ?? apiPagination?.page;
      const apiLimit = apiPagination?.per_page ?? apiPagination?.limit;
      const apiTotal = apiPagination?.total;
      setUsers(items);
      setPagination({
        page:
          typeof apiPage === "number" && apiPage > 0
            ? apiPage
            : typeof meta?.page === "number" && meta.page > 0
            ? meta.page
            : currentPage,
        limit:
          typeof apiLimit === "number" && apiLimit > 0
            ? apiLimit
            : typeof meta?.limit === "number" && meta.limit > 0
            ? meta.limit
            : pageSize,
        total:
          typeof apiTotal === "number" && apiTotal >= 0
            ? apiTotal
            : typeof meta?.total === "number" && meta.total >= 0
            ? meta.total
            : items.length ?? 0,
      });
    } catch (err: any) {
      const msg = err?.message ?? "No se pudo cargar la lista de usuarios.";
      setError(msg);
      setToast({
        variant: "error",
        message: msg,
      });
    } finally {
      setLoading(false);
    }
  }, [debouncedQ, currentPage, pageSize]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    const query = debouncedQ.trim();
    const effectiveQuery = query.length >= MIN_QUERY_LENGTH ? query : "";
    const params = new URLSearchParams();
    if (effectiveQuery) params.set("query", effectiveQuery);
    if (currentPage > 1) params.set("page", String(currentPage));

    router.replace(params.toString() ? `/usuarios?${params}` : "/usuarios", {
      scroll: false,
    });
  }, [debouncedQ, currentPage, router]);

  // leer mensaje de exito desde querystring y limpiar la URL
  useEffect(() => {
    const status = searchParams.get("status");
    if (!status) return;

    if (status === "created") {
      setToast({
        variant: "success",
        message: "Usuario creado correctamente.",
        description: "El listado se actualiza automaticamente.",
      });
    } else if (status === "updated") {
      setToast({
        variant: "success",
        message: "Usuario actualizado correctamente.",
        description: "El listado se actualiza automaticamente.",
      });
    } else if (status === "error") {
      setToast({
        variant: "error",
        message: "Ocurrio un problema al procesar tu solicitud.",
      });
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("status");
    router.replace(params.toString() ? `/usuarios?${params}` : "/usuarios", {
      scroll: false,
    });
  }, [searchParams, router]);

  useEffect(() => {
    if (!toast) return;

    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleDelete = (user: User) => {
    setConfirmUser(user);
    setConfirmOpen(true);
  };

  useEffect(() => {
    if (confirmOpen) return;
    const t = setTimeout(() => setConfirmUser(null), 180);
    return () => clearTimeout(t);
  }, [confirmOpen]);

  const confirmDelete = async () => {
    if (!confirmUser) return;
    try {
      setDeleting(true);
      await softDeleteUser(confirmUser.id);
      setToast({
        variant: "success",
        message: "Usuario eliminado correctamente.",
      });
      await fetchUsers();
    } catch (err: any) {
      setToast({
        variant: "error",
        message: err?.message ?? "No se pudo eliminar el usuario.",
      });
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  };

  return (
    <>
      {/* Toast flotante arriba a la derecha (estilo Mosaic) */}
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
              value={q}
              onChange={(v) => {
                setPage(1);
                setQ(v);
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

        <UsuarioTable
          users={users}
          loading={loading}
          error={error}
          onDelete={handleDelete}
        />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-6">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-3 sm:mb-0">
            Pagina {currentPage} de {totalPages} (mostrando {showing} de{" "}
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
            ? `Seguro que quieres eliminar a ${
                confirmUser.nombre ?? confirmUser.email
              }?`
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
        onSuccess={() => {
          fetchUsers();
        }}
      />
    </>
  );
}
