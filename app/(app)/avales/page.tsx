"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

import AlertBanner from "@/components/ui/alert-banner";
import SearchInput from "@/components/ui/search-input";
import Pagination from "@/components/ui/pagination";
import { listAvales, type ListAvalesOptions } from "@/lib/api/avales";
import type { Aval, EtapaFlujo } from "@/types/aval";
import { useAuth } from "@/app/providers/auth-provider";
import {
  isAdminUser,
  isDTMUser,
  isMetodologoUser,
  isPdaUser,
  isControlPrevioUser,
  isComprasPublicasUser,
  isFinancieroUser,
  isSecretariaUser,
  isAvalReviewer,
  isTrainerUser,
} from "@/lib/auth/access";
import AvalListCard from "./_components/aval-list-card";
import { AVALES_PAGE_SIZE, TIPO_AVAL_OPTIONS } from "@/lib/constants";
import { useResourceList } from "@/lib/hooks/use-resource-list";
import { useUrlFilters } from "@/lib/hooks/use-url-filters";
import { useStatusToast } from "@/lib/hooks/use-status-toast";

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
  const { user } = useAuth();

  const isAdmin = isAdminUser(user);
  const isDTM = isDTMUser(user);
  const isMetodologo = isMetodologoUser(user);
  const isPda = isPdaUser(user);
  const isControlPrevio = isControlPrevioUser(user);
  const isFinanciero = isFinancieroUser(user);
  const isSecretaria = isSecretariaUser(user);
  const isComprasPublicas = isComprasPublicasUser(user);
  const isTrainer = isTrainerUser(user);
  const isReviewer = isAvalReviewer(user);
  const isReviewerWithDefaults = isMetodologo || isPda || isControlPrevio || isComprasPublicas || isFinanciero;

  const hasDisciplina =
    Boolean(user?.disciplinaCodigo) ||
    user?.disciplinaId != null ||
    Boolean(user?.disciplinas && user.disciplinas.length > 0);

  // etapa no se sincroniza a URL (comportamiento existente)
  const [etapa, setEtapa] = useState("");

  const { filters, page, setFilter, setPage } = useUrlFilters("/avales", {
    search: "",
    estado: "",
    tipoAval: "",
    mixto: "",
  });

  // Defaults por rol — se calculan una vez y entran en el queryKey
  const defaultEstado = isReviewerWithDefaults ? "SOLICITADO" : "";
  const defaultEtapa: EtapaFlujo | "" = isPda
    ? "SOLICITUD"
    : isMetodologo
    ? ""
    : isControlPrevio
    ? "REVISION_DTM"
    : isFinanciero
    ? "CONTROL_PREVIO"
    : isComprasPublicas
    ? "PDA"
    : "";

  const efectivoEstado = filters.estado || defaultEstado;
  const efectivoEtapa = etapa || defaultEtapa;

  const { items: avales, loading, error, pagination, totalPages, currentPage } =
    useResourceList<Aval>({
      queryKey: [
        "avales",
        filters.search,
        efectivoEstado,
        filters.tipoAval,
        filters.mixto,
        efectivoEtapa,
        page,
        user?.id,
      ],
      queryFn: () => {
        const options: ListAvalesOptions = {
          page,
          limit: AVALES_PAGE_SIZE,
          estado: efectivoEstado ? (efectivoEstado as Aval["estado"]) : undefined,
          etapa: efectivoEtapa ? (efectivoEtapa as EtapaFlujo) : undefined,
          search: filters.search.trim() || undefined,
        };
        return listAvales(options);
      },
      page,
      enabled: user !== undefined,
      // El cliente filtra localmente además del server filter para coincidencia exacta
      select: (res) => {
        const r = res as Record<string, unknown>;
        const items = (Array.isArray(r?.data) ? r.data : []) as Aval[];
        const term = filters.search.trim().toLowerCase();
        return items.filter((aval) => {
          const matchesTipoAval =
            !filters.tipoAval || aval.tipoAval === filters.tipoAval;
          if (!matchesTipoAval) return false;
          const hasSoloResultadoParticipant =
            (aval.avalTecnico?.deportistasAval ?? []).some(
              (deportista) =>
                deportista.modalidadParticipacion === "SOLO_RESULTADO",
            );
          const matchesMixto =
            !filters.mixto ||
            (filters.mixto === "SI" && hasSoloResultadoParticipant) ||
            (filters.mixto === "NO" && !hasSoloResultadoParticipant);
          if (!matchesMixto) return false;
          if (!term) return true;
          const candidates = [
            aval.evento?.nombre,
            aval.evento?.codigo,
            aval.evento?.disciplina?.nombre,
            aval.avalTecnico?.numeroAval ?? aval.numeroColeccion ?? aval.aval ?? String(aval.id),
          ];
          return candidates.some((c) => (c ?? "").toLowerCase().includes(term));
        });
      },
    });

  const { toast, setToast } = useStatusToast("/avales", {
    created: {
      variant: "success",
      message: "Aval solicitado correctamente.",
      description: "Tu solicitud está pendiente de aprobación.",
    },
    cancelled: { variant: "success", message: "Aval cancelado correctamente." },
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
              placeholder="Buscar por evento, disciplina, código o número de aval"
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
            <select
              className="form-select w-full sm:w-48"
              value={filters.tipoAval}
              onChange={(e) => setFilter("tipoAval", e.target.value)}
            >
              <option value="">Todos los tipos</option>
              {TIPO_AVAL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              className="form-select w-full sm:w-40"
              value={filters.mixto}
              onChange={(e) => setFilter("mixto", e.target.value)}
            >
              <option value="">Todos</option>
              <option value="SI">Mixtos</option>
              <option value="NO">Sin mixtos</option>
            </select>
            <select
              className="form-select w-full sm:w-56"
              value={etapa}
              onChange={(e) => {
                setEtapa(e.target.value);
                setPage(1);
              }}
            >
              {ETAPA_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {!isAdmin && !isReviewer && !isSecretaria &&
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

        {!isAdmin && !hasDisciplina && !isReviewer && !isSecretaria && (
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
                  contacta con el administrador para que te asigne una disciplina.
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
          isTrainer={isTrainer}
          userId={user?.id}
        />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-6">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-3 sm:mb-0">
            Página {currentPage} de {totalPages} (mostrando {avales.length} de{" "}
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
