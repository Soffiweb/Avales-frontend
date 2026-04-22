"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import AlertBanner from "@/components/ui/alert-banner";
import Pagination from "@/components/ui/pagination";
import {
  listAvales,
  type EstadoHistorial,
  type ListAvalesOptions,
} from "@/lib/api/avales";
import type { Aval, EtapaFlujo } from "@/types/aval";
import { useAuth } from "@/app/providers/auth-provider";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import MiHistorialList from "./_components/mi-historial-list";

type FilterTab = "TODOS" | "ACEPTADO" | "RECHAZADO";

const TABS: Array<{ value: FilterTab; label: string }> = [
  { value: "TODOS", label: "Todos" },
  { value: "ACEPTADO", label: "Aprobados" },
  { value: "RECHAZADO", label: "Rechazados" },
];

const ETAPA_OPTIONS: Array<{ value: "" | EtapaFlujo; label: string }> = [
  { value: "", label: "Todas las etapas" },
  { value: "SOLICITUD", label: "Solicitud" },
  { value: "PDA", label: "PDA" },
  { value: "COMPRAS_PUBLICAS", label: "Compras Públicas" },
  { value: "REVISION_METODOLOGO", label: "Revisión Metodólogo" },
  { value: "REVISION_DTM", label: "Revisión DTM" },
  { value: "CONTROL_PREVIO", label: "Control Previo" },
  { value: "SECRETARIA", label: "Secretaría" },
  { value: "FINANCIERO", label: "Financiero" },
];

function parseTab(value: string | null): FilterTab {
  if (value === "ACEPTADO" || value === "RECHAZADO") return value;
  return "TODOS";
}

export default function MiHistorialPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [avales, setAvales] = useState<Aval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState<FilterTab>(() =>
    parseTab(searchParams.get("estadoHistorial")),
  );
  const [etapa, setEtapa] = useState<"" | EtapaFlujo>(() => {
    const raw = searchParams.get("etapaHistorial") ?? "";
    return raw as "" | EtapaFlujo;
  });
  const [page, setPage] = useState(() => {
    const value = Number(searchParams.get("page") ?? "1");
    return Number.isFinite(value) && value > 0 ? value : 1;
  });

  const [pagination, setPagination] = useState({
    page,
    limit: DEFAULT_PAGE_SIZE,
    total: 0,
  });

  const pageSize = pagination.limit || DEFAULT_PAGE_SIZE;
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((pagination.total || 0) / pageSize)),
    [pagination.total, pageSize],
  );
  const currentPage = Math.min(page, totalPages);
  const showing = avales.length;

  const fetchHistorial = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      setError(null);

      const estadoHistorial: EstadoHistorial | undefined =
        tab === "TODOS" ? undefined : tab;

      const options: ListAvalesOptions = {
        page: currentPage,
        limit: DEFAULT_PAGE_SIZE,
        procesadosPorUsuarioId: user.id,
        estadoHistorial,
        etapaHistorial: etapa || undefined,
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
      const message =
        err?.message ?? "No se pudo cargar tu historial de avales.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [user?.id, tab, etapa, currentPage]);

  useEffect(() => {
    void fetchHistorial();
  }, [fetchHistorial]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (tab !== "TODOS") params.set("estadoHistorial", tab);
    if (etapa) params.set("etapaHistorial", etapa);
    if (currentPage > 1) params.set("page", String(currentPage));

    router.replace(
      params.toString() ? `/mi-historial?${params}` : "/mi-historial",
      { scroll: false },
    );
  }, [tab, etapa, currentPage, router]);

  if (authLoading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-[96rem] mx-auto">
        <p className="text-sm text-gray-500 dark:text-gray-400">Cargando...</p>
      </div>
    );
  }

  return (
    <>
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
              Mi Historial
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Avales que aprobaste o rechazaste a lo largo del flujo.
            </p>
          </div>

          <div className="w-full sm:w-auto">
            <select
              className="form-select w-full sm:w-56"
              value={etapa}
              onChange={(e) => {
                setPage(1);
                setEtapa(e.target.value as "" | EtapaFlujo);
              }}
            >
              {ETAPA_OPTIONS.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex gap-6" aria-label="Filtro de historial">
            {TABS.map((t) => {
              const active = t.value === tab;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => {
                    setPage(1);
                    setTab(t.value);
                  }}
                  className={`whitespace-nowrap py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                    active
                      ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </nav>
        </div>

        <MiHistorialList
          avales={avales}
          currentUserId={user?.id ?? 0}
          loading={loading}
          error={error}
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
