"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";

import AlertBanner from "@/components/ui/alert-banner";
import SearchInput from "@/components/ui/search-input";
import Pagination from "@/components/ui/pagination";
import { listAvales, type ListAvalesOptions } from "@/lib/api/avales";
import type { Aval, EtapaFlujo } from "@/types/aval";
import { useAuth } from "@/app/providers/auth-provider";
import { isAdminUser } from "@/lib/auth/access";
import AvalListCard from "./_components/aval-list-card";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";

const STATUS_OPTIONS = [
  { label: "Todos los estados", value: "" },
  { label: "Disponible", value: "DISPONIBLE" },
  { label: "Solicitado", value: "SOLICITADO" },
  { label: "Aceptado", value: "ACEPTADO" },
  { label: "Rechazado", value: "RECHAZADO" },
];

const ETAPA_OPTIONS = [
  { label: "Todas las etapas", value: "" },
  { label: "Solicitud", value: "SOLICITUD" },
  { label: "PDA", value: "PDA" },
  { label: "Certificación Compras Públicas", value: "COMPRAS_PUBLICAS" },
  {
    label: "Aval aprobado metodólogo (Director técnico metodológico)",
    value: "REVISION_METODOLOGO",
  },
  { label: "Revisión DTM", value: "REVISION_DTM" },
  { label: "Control Previo", value: "CONTROL_PREVIO" },
  { label: "Secretaría", value: "SECRETARIA" },
  { label: "Financiero", value: "FINANCIERO" },
];

export default function AvalesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [avales, setAvales] = useState<Aval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const [estado, setEstado] = useState(() => searchParams.get("estado") ?? "");
  const [etapa, setEtapa] = useState(() => searchParams.get("etapa") ?? "");
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

  const pageSize = pagination.limit || DEFAULT_PAGE_SIZE;
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((pagination.total || 0) / pageSize)),
    [pagination.total, pageSize],
  );
  const currentPage = Math.min(page, totalPages);
  const showing = avales.length;

  const hasDisciplina =
    Boolean(user?.disciplinaCodigo) ||
    user?.disciplinaId != null ||
    Boolean(user?.disciplinas && user.disciplinas.length > 0);
  const isAdmin = isAdminUser(user);
  const isDTM = user?.roles?.some((role) => role === "DTM") ?? false;
  const isMetodologo =
    user?.roles?.some((role) => role === "METODOLOGO") ?? false;
  const isPda = user?.roles?.some((role) => role === "PDA") ?? false;
  const isControlPrevio =
    user?.roles?.some((role) => role === "CONTROL_PREVIO") ?? false;
  const isFinanciero =
    user?.roles?.some((role) => role === "FINANCIERO") ?? false;
  const isSecretaria =
    user?.roles?.some((role) => role === "SECRETARIA") ?? false;
  const isComprasPublicas =
    user?.roles?.some((role) => role === "COMPRAS_PUBLICAS") ?? false;
  const isReviewer =
    isDTM ||
    isMetodologo ||
    isPda ||
    isControlPrevio ||
    isComprasPublicas ||
    isFinanciero;

  const isReviewerWithDefaults =
    isMetodologo ||
    isPda ||
    isControlPrevio ||
    isComprasPublicas ||
    isFinanciero;

  useEffect(() => {
    if (page === currentPage) return;
    setPage(currentPage);
  }, [page, currentPage]);

  const fetchAvales = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Determinar los filtros efectivos (DTM ve todos, otros revisores tienen filtros por defecto)
      const defaultEstado = isReviewerWithDefaults ? "SOLICITADO" : undefined;
      const defaultEtapa: EtapaFlujo | undefined = isPda
        ? "SOLICITUD"
        : isMetodologo
          ? "COMPRAS_PUBLICAS"
          : isControlPrevio
            ? "REVISION_DTM"
            : isFinanciero
              ? "CONTROL_PREVIO"
            : isComprasPublicas
              ? "PDA"
              : undefined;
      const efectivoEstado = estado || defaultEstado;
      const efectivoEtapa = etapa || defaultEtapa;

      const options: ListAvalesOptions = {
        page: currentPage,
        limit: DEFAULT_PAGE_SIZE,
        estado: efectivoEstado ? (efectivoEstado as any) : undefined,
        etapa: efectivoEtapa ? (efectivoEtapa as EtapaFlujo) : undefined,
        search: search.trim() || undefined,
      };

      const res = await listAvales(options);
      const items = res.data ?? [];
      const meta = res.meta;
      setAvales(items);
      setPagination({
        page:
          typeof meta?.page === "number" && meta.page > 0
            ? meta.page
            : currentPage,
        limit:
          typeof meta?.limit === "number" && meta.limit > 0
            ? meta.limit
            : DEFAULT_PAGE_SIZE,
        total:
          typeof meta?.total === "number" && meta.total >= 0
            ? meta.total
            : items.length,
      });
    } catch (err: any) {
      const message = err?.message ?? "No se pudieron cargar los avales.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    estado,
    etapa,
    search,
    isReviewerWithDefaults,
    isControlPrevio,
    isMetodologo,
    isDTM,
    isPda,
    isComprasPublicas,
    isFinanciero,
  ]);

  useEffect(() => {
    void fetchAvales();
  }, [fetchAvales]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (estado) params.set("estado", estado);
    if (currentPage > 1) params.set("page", String(currentPage));

    router.replace(params.toString() ? `/avales?${params}` : "/avales", {
      scroll: false,
    });
  }, [search, estado, currentPage, router]);

  // Mostrar toast cuando viene status desde la creación
  useEffect(() => {
    const status = searchParams.get("status");
    if (!status) return;

    if (status === "created") {
      setToast({
        variant: "success",
        message: "Aval solicitado correctamente.",
        description: "Tu solicitud está pendiente de aprobación.",
      });
    } else if (status === "cancelled") {
      setToast({
        variant: "success",
        message: "Aval cancelado correctamente.",
      });
    } else if (status === "error") {
      setToast({
        variant: "error",
        message: "No se pudo procesar la solicitud.",
      });
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("status");
    router.replace(params.toString() ? `/avales?${params}` : "/avales", {
      scroll: false,
    });
  }, [searchParams, router]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

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
              {isAdmin ? "Gestión de Avales" : "Mis Avales"}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isAdmin
                ? "Visualiza todos los avales solicitados en el sistema."
                : "Gestiona tus solicitudes de avales para eventos deportivos."}
            </p>
          </div>

          <div className="grid grid-flow-row sm:grid-flow-col sm:auto-cols-max sm:justify-end gap-2 w-full sm:w-auto">
            <SearchInput
              className="w-full sm:w-64"
              placeholder="Buscar por evento o codigo"
              value={search}
              onChange={(v) => {
                setPage(1);
                setSearch(v);
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
            <select
              className="form-select w-full sm:w-56"
              value={etapa}
              onChange={(e) => {
                setPage(1);
                setEtapa(e.target.value);
              }}
            >
              {ETAPA_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {!isAdmin &&
              !isPda &&
              !isControlPrevio &&
              !isFinanciero &&
              !isMetodologo &&
              !isDTM &&
              !isComprasPublicas &&
              !isSecretaria &&
              (hasDisciplina ? (
                <Link
                  href="/avales/nuevo"
                  className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Crear aval
                </Link>
              ) : (
                <button
                  disabled
                  className="btn bg-gray-400 text-gray-100 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400"
                  title="Debes tener una disciplina asignada para crear avales"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Crear aval
                </button>
              ))}
          </div>
        </div>

        {!isAdmin &&
          !hasDisciplina &&
          !isPda &&
          !isControlPrevio &&
          !isFinanciero &&
          !isMetodologo &&
          !isDTM &&
          !isComprasPublicas &&
          !isSecretaria && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg
                    className="w-5 h-5 text-amber-600 dark:text-amber-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Disciplina requerida
                  </h3>
                  <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                    No tienes una disciplina asignada. Para poder crear avales,
                    debes tener una disciplina asociada a tu cuenta. Por favor,
                    contacta con el administrador para que te asigne una
                    disciplina.
                  </p>
                </div>
              </div>
            </div>
          )}

        <AvalListCard
          avales={avales}
          loading={loading}
          error={error}
          isAdmin={isAdmin}
          isSecretaria={isSecretaria}
          isPda={isPda}
          isDtm={isDTM}
          isMetodologo={isMetodologo}
          isControlPrevio={isControlPrevio}
          isFinanciero={isFinanciero}
          isComprasPublicas={isComprasPublicas}
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
    </>
  );
}
