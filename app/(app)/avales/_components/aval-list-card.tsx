"use client";

import Link from "next/link";
import {
  Calendar,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileEdit,
  FileText,
  Stamp,
  Trophy,
  Users,
  MapPin,
  User,
} from "lucide-react";

import type { Aval, EtapaFlujo } from "@/types/aval";
import {
  getApprovalStageBadgeStyles,
  getApprovalStageLabel,
  getTipoAvalLabel,
} from "@/lib/constants";
import {
  getAvalCurrentEtapa,
  getApprovalFlowStages,
  getPreviousApprovalStagesForAval,
} from "@/lib/approval-flow";
import {
  formatDate,
  formatLocationWithProvince,
  getResponsibleTrainerName,
} from "@/lib/utils/formatters";

type Props = {
  avales: Aval[];
  loading?: boolean;
  error?: string | null;
  isAdmin?: boolean;
  isSecretaria?: boolean;
  isPda?: boolean;
  isDtm?: boolean;
  isMetodologo?: boolean;
  isControlPrevio?: boolean;
  isFinanciero?: boolean;
  isComprasPublicas?: boolean;
};

const STATUS_ICONS: Record<string, typeof Clock> = {
  DISPONIBLE: AlertCircle,
  BORRADOR: FileEdit,
  SOLICITADO: Clock,
  ACEPTADO: CheckCircle,
  RECHAZADO: XCircle,
};

function getStatusIcon(status?: string | null) {
  if (!status) return AlertCircle;
  return STATUS_ICONS[status.toUpperCase()] ?? AlertCircle;
}

function getAvalNumber(aval: Aval) {
  return (
    aval.avalTecnico?.numeroAval ??
    aval.numeroColeccion ??
    aval.aval ??
    String(aval.id)
  );
}

export default function AvalListCard({
  avales,
  loading,
  error,
  isAdmin = false,
  isSecretaria = false,
  isPda = false,
  isDtm = false,
  isMetodologo = false,
  isControlPrevio = false,
  isFinanciero = false,
  isComprasPublicas = false,
}: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 animate-pulse"
          >
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4" />
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl p-6 text-center">
        {error}
      </div>
    );
  }

  if (avales.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
        <FileText className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
        <p className="text-base text-gray-500 dark:text-gray-400 mb-2">
          {isAdmin ? "No hay avales registrados en el sistema." : "No tienes avales registrados."}
        </p>
        {!isAdmin && (
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Haz clic en &quot;Crear aval&quot; para solicitar uno nuevo.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {avales.map((aval) => {
        const etapaParaMostrar = getAvalCurrentEtapa(aval) as EtapaFlujo;
        const flowStages = getApprovalFlowStages(aval);
        const metodologoSourceStage =
          getPreviousApprovalStagesForAval(aval, "REVISION_METODOLOGO").at(-1) ??
          ("SOLICITUD" as EtapaFlujo);

        // Solo se puede actuar si el aval está SOLICITADO y la etapa actual
        // matchea con el rol del usuario. Además, si el último evento del
        // historial fue RECHAZADO, no mostrar acción (el aval volvió a una
        // etapa anterior por rechazo y debe ser re-procesado por otro rol).
        const isProcessable = aval.estado === "SOLICITADO";
        // El historial viene ordenado DESC (más nuevo primero) → [0] es el último evento.
        const lastHistorial = aval.historial?.[0];
        const wasRecentlyRejected = lastHistorial?.estado === "RECHAZADO";
        const stageMatchesRole = (role: EtapaFlujo) =>
          isProcessable && !wasRecentlyRejected && etapaParaMostrar === role;
        const canPdaAct = isPda && stageMatchesRole("SOLICITUD" as EtapaFlujo);
        const canComprasAct =
          flowStages.includes("COMPRAS_PUBLICAS") &&
          isComprasPublicas &&
          stageMatchesRole("PDA" as EtapaFlujo);
        const canMetodologoAct =
          isMetodologo &&
          stageMatchesRole(metodologoSourceStage);
        const canDtmAct =
          isDtm && stageMatchesRole("REVISION_METODOLOGO" as EtapaFlujo);
        const canControlPrevioAct =
          flowStages.includes("CONTROL_PREVIO") &&
          isControlPrevio &&
          stageMatchesRole("REVISION_DTM" as EtapaFlujo);
        const canFinancieroAct =
          isFinanciero &&
          stageMatchesRole(
            flowStages.includes("CONTROL_PREVIO")
              ? ("CONTROL_PREVIO" as EtapaFlujo)
              : ("REVISION_DTM" as EtapaFlujo),
          );
        const statusStyles = getApprovalStageBadgeStyles(
          aval.estado,
          etapaParaMostrar,
        );
        const StatusIcon = getStatusIcon(aval.estado);
        const stageLabel = getApprovalStageLabel(etapaParaMostrar);
        const evento = aval.evento;
        const totalDeportistas =
          (evento?.numAtletasHombres || 0) + (evento?.numAtletasMujeres || 0);
        const totalEntrenadores =
          (evento?.numEntrenadoresHombres || 0) +
          (evento?.numEntrenadoresMujeres || 0);
        const numeroAval = getAvalNumber(aval);
        const ubicacionEvento = formatLocationWithProvince(evento);
        const responsableAval = getResponsibleTrainerName(aval, "Por definir");

        return (
          <div
            key={aval.id}
            className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
          >
            {/* Header con estado */}
            <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles.bg} ${statusStyles.text}`}
                  >
                    <StatusIcon className="w-3 h-3" />
                    {stageLabel}
                  </span>
                  {aval.tipoAval && (
                    <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                      {getTipoAvalLabel(aval.tipoAval)}
                    </span>
                  )}
                  {!isAdmin && aval.estado === "BORRADOR" && (
                    <span className="relative inline-flex">
                      <AlertCircle
                        className="peer h-4 w-4 cursor-help text-amber-500"
                        aria-label="Aval incompleto"
                      />
                      <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-64 -translate-x-1/2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 shadow-lg peer-hover:block dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                        Aval incompleto: solo se subió la convocatoria y el
                        certificado médico.
                      </span>
                    </span>
                  )}
                </div>
                <h3
                  className="font-semibold text-gray-900 dark:text-gray-100 leading-5 line-clamp-2 min-h-10"
                  title={aval.evento?.nombre}
                >
                  {aval.evento?.nombre || "Sin evento"}
                </h3>
                <p className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                  <Trophy className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {evento?.disciplina?.nombre || "Sin disciplina"}
                  </span>
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  Aval
                </p>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {numeroAval}
                </p>
              </div>
            </div>

            {/* Info del evento */}
            <div className="px-5 pb-4 flex-1 space-y-3">
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
                  <span>Emisión: {aval.fechaEmision ? formatDate(aval.fechaEmision) : "-"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
                  <span className="truncate">Responsable: {responsableAval}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
                  <span className="truncate">Ubicación: {ubicacionEvento}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 border-t border-gray-100 pt-3 text-sm dark:border-gray-700/60">
                <div className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-900/40">
                  <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                    <Users className="h-3.5 w-3.5" />
                    <span className="text-xs">Deportistas</span>
                  </div>
                  <p className="mt-1 font-semibold text-gray-900 dark:text-gray-100">
                    {totalDeportistas}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-900/40">
                  <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                    <Users className="h-3.5 w-3.5" />
                    <span className="text-xs">Entrenadores</span>
                  </div>
                  <p className="mt-1 font-semibold text-gray-900 dark:text-gray-100">
                    {totalEntrenadores}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer con acción */}
            <div className="px-5 py-3 bg-gray-50 dark:bg-gray-900/30 border-t border-gray-100 dark:border-gray-700/60 flex flex-col gap-2">
              <div className="flex items-center justify-end gap-2">
                {!isAdmin && aval.estado === "BORRADOR" ? (
                  <>
                    <Link
                      href={`/avales/${aval.id}`}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300 dark:hover:bg-sky-950/50 transition-colors"
                      aria-label={`Ver detalle del aval de ${aval.evento?.nombre || "evento"}`}
                    >
                      <Eye className="w-4 h-4" />
                      Ver detalles
                    </Link>
                    {!isSecretaria && (
                      <Link
                        href={`/avales/${aval.id}/crear-solicitud`}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"
                      >
                        <FileEdit className="w-4 h-4" />
                        Editar solicitud
                      </Link>
                    )}
                  </>
                ) : (
                  <>
                    <Link
                      href={`/avales/${aval.id}`}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300 dark:hover:bg-sky-950/50 transition-colors"
                      aria-label={`Ver detalle del aval de ${aval.evento?.nombre || "evento"}`}
                    >
                      <Eye className="w-4 h-4" />
                      Ver detalles
                    </Link>
                    {canPdaAct && (
                      <Link
                        href={`/avales/${aval.id}/certificar-pda`}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-cyan-600 text-white hover:bg-cyan-700 transition-colors"
                      >
                        <Stamp className="w-4 h-4" />
                        Certificar
                      </Link>
                    )}
                    {canComprasAct && (
                      <Link
                        href={`/avales/${aval.id}/certificar-compras-publicas`}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                      >
                        <Stamp className="w-4 h-4" />
                        Certificar
                      </Link>
                    )}
                    {canDtmAct && (
                      <Link
                        href={`/avales/${aval.id}/revision-dtm`}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        Revisar
                      </Link>
                    )}
                    {canMetodologoAct && (
                      <Link
                        href={`/avales/${aval.id}/revision-metodologo`}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        Revisar
                      </Link>
                    )}
                    {canControlPrevioAct && (
                      <Link
                        href={`/avales/${aval.id}/revision-control-previo`}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        Revisar
                      </Link>
                    )}
                    {canFinancieroAct && (
                      <Link
                        href={`/avales/${aval.id}/certificacion-financiera`}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                      >
                        <Stamp className="w-4 h-4" />
                        Certificar
                      </Link>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
