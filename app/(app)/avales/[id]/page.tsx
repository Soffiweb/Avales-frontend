"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type React from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  MapPin,
  Users,
  Trophy,
  FileText,
  DollarSign,
  Download,
} from "lucide-react";

import AlertBanner from "@/components/ui/alert-banner";
import ApprovalFlowCard from "../_components/approval-flow-card";
import ConfirmModal from "@/components/ui/confirm-modal";
import AvalPresupuestoSection from "./_components/aval-presupuesto-section";
import AvalDeportistasSection from "./_components/aval-deportistas-section";
import AvalLogisticaSection from "./_components/aval-logistica-section";
import Breadcrumb from "@/components/ui/breadcrumb";
import { useAuth } from "@/app/providers/auth-provider";
import { aprobarAval, getAval, rechazarAval } from "@/lib/api/avales";
import type { Aval, EtapaFlujo, Historial } from "@/types/aval";
import {
  formatDate,
  formatEventScheduleLabel,
  formatGenero,
} from "@/lib/utils/formatters";
import {
  getEventoTipoParticipacionLabel,
  getApprovalStageLabel,
  getNextApprovalStage,
  getPreviousApprovalStages,
  APPROVAL_STAGE_FLOW,
} from "@/lib/constants";
import { getNormalizedRoles } from "@/lib/auth/access";
import { getCurrentEtapa } from "@/lib/utils/aval-historial";

function getDaysUntilEvent(fechaInicio?: string | null) {
  if (!fechaInicio) return null;
  const start = new Date(fechaInicio);
  if (Number.isNaN(start.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  const diff = Math.ceil(
    (start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  return diff;
}

function getEventDuration(
  fechaInicio?: string | null,
  fechaFin?: string | null,
) {
  if (!fechaInicio || !fechaFin) return null;
  const start = new Date(fechaInicio);
  const end = new Date(fechaFin);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const diff =
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return diff;
}

function formatSolicitudNumber(value?: string | number | null) {
  if (value === null || value === undefined) return "";
  const raw = String(value).trim();
  if (raw.length === 0) return "";
  const numeric = Number.parseInt(raw, 10);
  if (Number.isNaN(numeric)) return raw;
  return String(numeric).padStart(3, "0");
}

type FactItem = {
  label: string;
  value: string | number | null | undefined;
};

function isEmptyValue(value: FactItem["value"]) {
  if (value === null || value === undefined) return true;
  if (typeof value === "number") return false;
  return value.trim().length === 0;
}

function FactGrid({ items }: { items: FactItem[] }) {
  const visible = items.filter((item) => !isEmptyValue(item.value));
  if (visible.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {visible.map((item) => (
        <div key={item.label} className="min-w-0">
          <p className="text-[0.65rem] uppercase tracking-[0.3em] text-gray-500 dark:text-gray-500">
            {item.label}
          </p>
          <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {String(item.value)}
          </p>
        </div>
      ))}
    </div>
  );
}

type CollapsibleSectionProps = {
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  meta?: React.ReactNode;
  children: React.ReactNode;
};

function CollapsibleSection({
  title,
  icon,
  defaultOpen = false,
  meta,
  children,
}: CollapsibleSectionProps) {
  return (
    <details
      open={defaultOpen}
      className="group overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950/60 shadow-sm transition-colors group-open:border-indigo-300 dark:group-open:border-indigo-500"
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-4 py-3 bg-gray-50 dark:bg-gray-900/30 hover:bg-gray-100 dark:hover:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {icon}
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
              {title}
            </h2>
          </div>
          {meta ? <div className="mt-1">{meta}</div> : null}
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-1">
          <span className="text-[0.7rem] text-gray-400 dark:text-gray-500 group-open:hidden">
            Desplegar
          </span>
          <span className="hidden text-[0.7rem] text-gray-400 dark:text-gray-500 group-open:inline">
            Ocultar
          </span>
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 transition-transform group-open:rotate-180" />
        </div>
      </summary>
      <div className="px-4 pb-4 pt-1">{children}</div>
    </details>
  );
}

type StageTimelineProps = {
  currentStage: EtapaFlujo;
};

function StageTimeline({ currentStage }: StageTimelineProps) {
  const stages = APPROVAL_STAGE_FLOW.filter(
    (etapa) => etapa !== "SECRETARIA",
  ).map((etapa) => ({
    etapa,
    label: getApprovalStageLabel(etapa),
  }));
  const timelineCurrentStage =
    stages.find((stage) => stage.etapa === currentStage)?.etapa ??
    stages[stages.length - 1]?.etapa ??
    currentStage;
  const rawIndex = stages.findIndex(
    (stage) => stage.etapa === timelineCurrentStage,
  );
  const currentIndex = Math.min(
    Math.max(rawIndex === -1 ? 0 : rawIndex, 0),
    Math.max(stages.length - 1, 0),
  );
  const progressPercent =
    stages.length > 1
      ? (currentIndex / Math.max(stages.length - 1, 1)) * 100
      : 100;

  return (
    <div className="space-y-3">
      <div className="relative py-6">
        <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-gray-200 dark:bg-gray-700 rounded-full" />
        <div
          className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-blue-600 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
        <div className="relative flex justify-between">
          {stages.map((stage, idx) => {
            const isStageCompleted = idx <= currentIndex;
            const isCurrentStage = idx === currentIndex;
            const isFinancieroCompleted =
              stage.etapa === "FINANCIERO" && currentStage === "FINANCIERO";
            const status =
              (isStageCompleted && !isCurrentStage) || isFinancieroCompleted
                ? "done"
                : isCurrentStage
                  ? "current"
                  : "upcoming";
            const circleClasses =
              status === "done"
                ? "bg-blue-600 border-blue-600 text-white"
                : status === "current"
                  ? "border-blue-600 bg-white text-blue-600 shadow"
                  : "border border-gray-200 dark:border-gray-700 bg-white text-gray-400";
            const showCheckIcon = status !== "upcoming";

            return (
              <div
                key={stage.etapa}
                className="flex flex-col items-center text-center flex-1"
              >
                <div
                  className={`relative flex h-11 w-11 items-center justify-center rounded-full border-2 transition-colors ${circleClasses}`}
                >
                  {showCheckIcon ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <span className="text-sm font-semibold">{idx + 1}</span>
                  )}
                </div>
                <p className="mt-3 text-xs font-semibold leading-snug text-gray-600 dark:text-gray-300 max-w-[80px]">
                  {stage.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function AvalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const { user } = useAuth();

  const [rechazoMotivo, setRechazoMotivo] = useState("");
  const [etapaDestino, setEtapaDestino] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    variant: "success" | "error";
    message: string;
  } | null>(null);

  const [aval, setAval] = useState<Aval | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const userRoles = getNormalizedRoles(user);
  const etapaActualResponse = aval?.etapaActual;
  const etapaActualHistorial = getCurrentEtapa(aval?.historial);
  const currentEtapa = (etapaActualResponse ??
    etapaActualHistorial ??
    "SOLICITUD") as EtapaFlujo;
  const isControlPrevioStage = currentEtapa === "REVISION_DTM";
  const isFinancieroStage = currentEtapa === "CONTROL_PREVIO";
  const nextEtapa = getNextApprovalStage(currentEtapa);
  const showFinancieroPanel =
    userRoles.includes("FINANCIERO") && isFinancieroStage;
  const resolvedNextEtapa: EtapaFlujo | undefined = showFinancieroPanel
    ? "FINANCIERO"
    : nextEtapa;
  const approvalEtapa = resolvedNextEtapa ?? currentEtapa;
  const currentStageLabel = getApprovalStageLabel(currentEtapa);
  const nextStageLabel = getApprovalStageLabel(
    resolvedNextEtapa ?? currentEtapa,
  );
  const arrowCurrentLabel = currentStageLabel;
  const arrowNextLabel = nextStageLabel;
  const hasNextAfterApproval = Boolean(
    getNextApprovalStage(resolvedNextEtapa ?? currentEtapa),
  );
  const isMetodologoStage = currentEtapa === "REVISION_METODOLOGO";
  const isDtmStage = currentEtapa === "REVISION_DTM";
  const isPdaStage = currentEtapa === "SOLICITUD";
  const showMetodologoPanel =
    userRoles.includes("METODOLOGO") && isMetodologoStage;
  const showDtmPanel = userRoles.includes("DTM") && isDtmStage;
  const showControlPrevioPanel =
    userRoles.includes("CONTROL_PREVIO") && isControlPrevioStage;
  const showApprovalPanel =
    aval?.estado === "SOLICITADO" &&
    (showDtmPanel || showControlPrevioPanel || showFinancieroPanel);

  const fetchAval = useCallback(async () => {
    if (!id || Number.isNaN(id)) {
      setError("ID de aval inválido");
      setLoading(false);
      setAval(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await getAval(id);
      setAval(res.data);
      console.log("[AvalDetail] getAval response:", res.data);
      console.log(
        "[AvalDetail] deportistasAval:",
        res.data?.avalTecnico?.deportistasAval ?? [],
      );
    } catch (err: any) {
      setError(err?.message ?? "No se pudo cargar el aval.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchAval();
  }, [fetchAval]);

  const handleCancel = async () => {
    if (!aval) return;
    try {
      setCancelling(true);
      router.push("/avales?status=cancelled");
    } catch (err: any) {
      setError(err?.message ?? "No se pudo cancelar el aval.");
      setConfirmOpen(false);
    } finally {
      setCancelling(false);
    }
  };

  const handleApprove = useCallback(async () => {
    if (!aval) return;
    if (!user?.id) {
      setActionError("No se pudo identificar el usuario.");
      return;
    }

    setActionError(null);
    setActionLoading(true);
    try {
      await aprobarAval(aval.id, user.id, approvalEtapa);
      setToast({ variant: "success", message: "Aval aprobado correctamente." });
      await fetchAval();
    } catch (err: any) {
      setActionError(err?.message ?? "No se pudo aprobar el aval.");
    } finally {
      setActionLoading(false);
    }
  }, [aval, user?.id, approvalEtapa, fetchAval]);

  const handleReject = useCallback(async () => {
    if (!aval) return;
    if (!user?.id) {
      setActionError("No se pudo identificar el usuario.");
      return;
    }
    if (!rechazoMotivo.trim()) {
      setActionError("Debes indicar un motivo para el rechazo.");
      return;
    }

    setActionError(null);
    setActionLoading(true);
    try {
      await rechazarAval(
        aval.id,
        user.id,
        currentEtapa,
        rechazoMotivo.trim(),
        etapaDestino ? (etapaDestino as EtapaFlujo) : undefined,
      );
      setToast({
        variant: "success",
        message: "Aval rechazado correctamente.",
      });
      setRechazoMotivo("");
      setEtapaDestino("");
      await fetchAval();
    } catch (err: any) {
      setActionError(err?.message ?? "No se pudo rechazar el aval.");
    } finally {
      setActionLoading(false);
    }
  }, [aval, user?.id, rechazoMotivo, etapaDestino, currentEtapa, fetchAval]);

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !aval) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-7xl mx-auto">
        <div className="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl p-6 text-center">
          {error ?? "Aval no encontrado"}
        </div>
        <div className="mt-4">
          <Link
            href="/avales"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a mis avales
          </Link>
        </div>
      </div>
    );
  }

  const evento = aval.evento;
  const stageDescription =
    aval.estado === "BORRADOR"
      ? "La convocatoria permanece en borrador hasta que completes el aval técnico."
      : `Está en ${currentStageLabel.toLowerCase()} (${aval.estado}).`;
  const generoEtiqueta = evento?.genero
    ? formatGenero(evento.genero)
    : undefined;
  const eventBadges = evento
    ? [
        evento.tipoEvento,
        getEventoTipoParticipacionLabel(evento.tipoParticipacion),
        evento.disciplina?.nombre,
        evento.categoria?.nombre,
        evento.alcance,
        generoEtiqueta,
      ].filter(Boolean)
    : [];
  const hasRealDates = Boolean(evento?.fechaInicio && evento?.fechaFin);
  const daysUntil =
    evento && hasRealDates ? getDaysUntilEvent(evento.fechaInicio) : null;
  const duration =
    evento && hasRealDates
      ? getEventDuration(evento.fechaInicio, evento.fechaFin)
      : null;
  const summaryLines = [
    evento?.codigo ? `Evento ${evento.codigo}.` : null,
    (aval.avalTecnico?.numeroAval || aval.numeroColeccion)
      ? `Solicitud ${formatSolicitudNumber(aval.avalTecnico?.numeroAval ?? aval.numeroColeccion)}.`
      : null,
    !hasRealDates && evento
      ? `Programación: ${formatEventScheduleLabel(evento)}.`
      : null,
    duration
      ? `Duración estimada: ${duration} ${duration === 1 ? "día" : "días"}.`
      : null,
    daysUntil !== null
      ? daysUntil < 0
        ? "La fecha del evento ya pasó."
        : daysUntil === 0
          ? "El evento inicia hoy."
          : `Faltan ${daysUntil} días para el inicio del evento.`
      : null,
  ].filter((line): line is string => Boolean(line));
  const isAvalCompleto =
    aval.estado === "ACEPTADO" || currentEtapa === "FINANCIERO";
  const canDownloadAvalCompleto = Boolean(aval.aval);
  const avalCompletoPdfUrl = `/api/v1/avales/${aval.id}/aval-completo-pdf`;

  const totalAtletas = evento
    ? (evento.numAtletasHombres || 0) + (evento.numAtletasMujeres || 0)
    : 0;
  const totalEntrenadores = evento
    ? (evento.numEntrenadoresHombres || 0) +
      (evento.numEntrenadoresMujeres || 0)
    : 0;

  const totalPresupuesto = evento
    ? evento.presupuesto.reduce((sum, item) => {
        const valor = parseFloat(item.presupuesto) || 0;
        return sum + valor;
      }, 0)
    : 0;

  const deportistasList = aval.avalTecnico?.deportistasAval ?? [];
  const adjuntosSolicitud = aval.adjuntosSolicitud ?? [];
  const solicitudAttachments = [
    { label: "Convocatoria", url: aval.convocatoriaUrl },
    { label: "Certificado médico", url: aval.solicitudUrl },
  ].filter((item): item is { label: string; url: string } => Boolean(item.url));
  const canShowPresupuestoSalida =
    isAvalCompleto && Boolean(evento?.presupuesto?.length);

  return (
    <>
      {error && (
        <div className="fixed top-4 right-4 z-50 max-w-sm w-full drop-shadow-lg">
          <AlertBanner
            variant="error"
            message={error}
            onClose={() => setError(null)}
          />
        </div>
      )}
      {toast && (
        <div className="fixed top-4 right-4 z-50 max-w-sm w-full drop-shadow-lg">
          <AlertBanner
            variant={toast.variant}
            message={toast.message}
            onClose={() => setToast(null)}
          />
        </div>
      )}

      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="mb-2">
              <Breadcrumb items={[
                { label: "Avales", href: "/avales" },
                { label: "Detalle del Aval" },
              ]} />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
              Detalle del Aval
            </h1>
            {evento?.codigo && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Código del evento: {evento.codigo}
              </p>
            )}
          </div>

          {canDownloadAvalCompleto && (
            <a
              href={avalCompletoPdfUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="btn bg-indigo-500 hover:bg-indigo-600 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Descargar aval completo
            </a>
          )}
        </div>

        {/* Estado del aval */}
        <div className="space-y-4">
          <StageTimeline currentStage={currentEtapa} />
          {/* <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
            <p>{stageDescription}</p>
            <div className="pt-3">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
              >
                <Eye className="w-4 h-4" />
                Ver aval en PDF
              </button>
            </div>
          </div> */}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {evento && (
              <CollapsibleSection
                title="Datos del evento"
                defaultOpen
                icon={
                  <Trophy className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                }
                meta={
                  evento.codigo ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      Código: {evento.codigo}
                    </p>
                  ) : null
                }
              >
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {evento.nombre}
                      </p>
                      {evento.codigo ? (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Evento {evento.codigo}
                        </p>
                      ) : null}
                    </div>
                    {eventBadges.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                        {eventBadges.slice(0, 6).map((badge, index) => (
                          <span
                            key={`${badge}-${index}`}
                            className="inline-flex items-center px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40"
                          >
                            {badge}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <FactGrid
                    items={[
                      { label: "Tipo", value: evento.tipoEvento },
                      {
                        label: "Participación",
                        value:
                          getEventoTipoParticipacionLabel(evento.tipoParticipacion) ??
                          "",
                      },
                      { label: "Disciplina", value: evento.disciplina?.nombre },
                      { label: "Categoría", value: evento.categoria?.nombre },
                      { label: "Alcance", value: evento.alcance },
                      {
                        label: "Género",
                        value: evento.genero ? formatGenero(evento.genero) : "",
                      },
                    ]}
                  />

                  {hasRealDates ? (
                    <FactGrid
                      items={[
                        {
                          label: "Inicio",
                          value: evento.fechaInicio ? formatDate(evento.fechaInicio) : "",
                        },
                        {
                          label: "Fin",
                          value: evento.fechaFin ? formatDate(evento.fechaFin) : "",
                        },
                        {
                          label: "Duración",
                          value: duration ? `${duration} día${duration === 1 ? "" : "s"}` : "",
                        },
                        {
                          label: "Tiempo",
                          value:
                            daysUntil === null
                              ? ""
                              : daysUntil < 0
                                ? "Evento pasado"
                                : daysUntil === 0
                                  ? "Hoy"
                                  : daysUntil === 1
                                    ? "Mañana"
                                    : `Faltan ${daysUntil} días`,
                        },
                      ]}
                    />
                  ) : (
                    <FactGrid
                      items={[
                        {
                          label: "Programación",
                          value: formatEventScheduleLabel(evento),
                        },
                      ]}
                    />
                  )}

                  {[evento.ciudad, evento.provincia, evento.pais].some(Boolean) ? (
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">
                        {[evento.ciudad, evento.provincia, evento.pais]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </div>
                  ) : null}

                  <FactGrid
                    items={[
                      { label: "Lugar", value: evento.lugar },
                      { label: "Ciudad", value: evento.ciudad },
                      { label: "Provincia", value: evento.provincia },
                      { label: "País", value: evento.pais },
                    ]}
                  />

                  <FactGrid
                    items={[
                      { label: "Total entrenadores", value: totalEntrenadores },
                      {
                        label: "Deportistas seleccionados",
                        value: deportistasList.length ? deportistasList.length : null,
                      },
                    ]}
                  />
                </div>
              </CollapsibleSection>
            )}

            <CollapsibleSection
              title="Solicitud del aval"
              defaultOpen
              icon={
                <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              }
              meta={
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {stageDescription}
                </p>
              }
            >
              <div className="space-y-4">
                <FactGrid
                  items={[
                    { label: "Estado", value: aval.estado },
                    { label: "Etapa", value: currentStageLabel },
                    {
                      label: "Emisión",
                      value: aval.fechaEmision ? formatDate(aval.fechaEmision) : "",
                    },
                    { label: "Creado", value: aval.createdAt ? formatDate(aval.createdAt) : "" },
                    { label: "Actualizado", value: aval.updatedAt ? formatDate(aval.updatedAt) : "" },
                    {
                      label: "N° solicitud",
                      value: formatSolicitudNumber(aval.avalTecnico?.numeroAval ?? aval.numeroColeccion),
                    },
                  ]}
                />

                {aval.descripcion ? (
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-4 py-3">
                    <p className="text-[0.65rem] uppercase tracking-[0.3em] text-gray-500">
                      Descripción
                    </p>
                    <p className="mt-1 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line">
                      {aval.descripcion}
                    </p>
                  </div>
                ) : null}

                {aval.comentario ? (
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-4 py-3">
                    <p className="text-[0.65rem] uppercase tracking-[0.3em] text-gray-500">
                      Comentario
                    </p>
                    <p className="mt-1 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line">
                      {aval.comentario}
                    </p>
                  </div>
                ) : null}

                {solicitudAttachments.length > 0 || adjuntosSolicitud.length > 0 ? (
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/30">
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                      <p className="text-[0.65rem] uppercase tracking-[0.3em] text-gray-500">
                        Archivos adjuntos
                      </p>
                    </div>
                    <div className="p-2 space-y-1">
                      {solicitudAttachments.map((item) => (
                        <a
                          key={item.label}
                          href={item.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="flex items-start justify-between gap-3 rounded-lg px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-900/40"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                              {item.label}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Documento del evento
                            </p>
                          </div>
                          <Download className="w-4 h-4 shrink-0 text-gray-400 mt-1" />
                        </a>
                      ))}

                      {adjuntosSolicitud.map((adjunto) => (
                        <a
                          key={adjunto.id}
                          href={adjunto.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="flex items-start justify-between gap-3 rounded-lg px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-900/40"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                              {adjunto.nombreOriginal || adjunto.nombreArchivo}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Archivo adjunto del entrenador · {formatDate(adjunto.createdAt)}
                            </p>
                          </div>
                          <Download className="w-4 h-4 shrink-0 text-gray-400 mt-1" />
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}

                {aval.avalTecnico ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Aval técnico
                      </p>
                    </div>

                    <AvalLogisticaSection
                      avalTecnico={aval.avalTecnico}
                      fechaEmision={aval.fechaEmision}
                    />

                    {(aval.avalTecnico.objetivos?.length ||
                      aval.avalTecnico.criterios?.length) && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {aval.avalTecnico.objetivos?.length ? (
                          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950/40 p-4">
                            <p className="text-[0.65rem] uppercase tracking-[0.3em] text-gray-500 mb-2">
                              Objetivos
                            </p>
                            <ol className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                              {aval.avalTecnico.objetivos
                                .slice()
                                .sort((a, b) => a.orden - b.orden)
                                .map((objetivo) => (
                                  <li key={objetivo.id} className="flex gap-2">
                                    <span className="w-5 h-5 flex items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-900 dark:text-gray-100 shrink-0">
                                      {objetivo.orden}
                                    </span>
                                    <span className="flex-1">
                                      {objetivo.descripcion}
                                    </span>
                                  </li>
                                ))}
                            </ol>
                          </div>
                        ) : null}
                        {aval.avalTecnico.criterios?.length ? (
                          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950/40 p-4">
                            <p className="text-[0.65rem] uppercase tracking-[0.3em] text-gray-500 mb-2">
                              Criterios
                            </p>
                            <ol className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                              {aval.avalTecnico.criterios
                                .slice()
                                .sort((a, b) => a.orden - b.orden)
                                .map((criterio) => (
                                  <li key={criterio.id} className="flex gap-2">
                                    <span className="w-5 h-5 flex items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-900 dark:text-gray-100 shrink-0">
                                      {criterio.orden}
                                    </span>
                                    <span className="flex-1">
                                      {criterio.descripcion}
                                    </span>
                                  </li>
                                ))}
                            </ol>
                          </div>
                        ) : null}
                      </div>
                    )}

                    {deportistasList.length > 0 ? (
                      <AvalDeportistasSection deportistas={deportistasList} />
                    ) : null}
                  </div>
                ) : null}
              </div>
            </CollapsibleSection>

            {canShowPresupuestoSalida ? (
              <CollapsibleSection
                title="Presupuesto de salida"
                icon={
                  <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                }
                meta={
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Visible cuando finaliza aprobación financiera.
                  </p>
                }
              >
                <AvalPresupuestoSection
                  presupuesto={evento!.presupuesto}
                  totalPresupuesto={totalPresupuesto}
                />
              </CollapsibleSection>
            ) : null}
          </div>

          <div className="space-y-4 lg:sticky lg:top-6 self-start">
            {summaryLines.length > 0 ? (
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950/60 p-4 shadow-sm">
                <p className="text-[0.65rem] uppercase tracking-[0.3em] text-gray-500 mb-2">
                  Resumen
                </p>
                <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  {summaryLines.slice(0, 5).map((line) => (
                    <li key={line} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-gray-300 dark:bg-gray-600 shrink-0" />
                      <span className="flex-1">{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {showApprovalPanel ? (
              <ApprovalFlowCard
                title="Este aval necesita aprobación"
                currentStageLabel={arrowCurrentLabel}
                nextStageLabel={arrowNextLabel}
                reasonValue={rechazoMotivo}
                onReasonChange={setRechazoMotivo}
                actionError={actionError}
                actionLoading={actionLoading}
                onApprove={handleApprove}
                onReject={handleReject}
                etapaDestinoOptions={getPreviousApprovalStages(currentEtapa).map(
                  (e) => ({ value: e, label: getApprovalStageLabel(e) }),
                )}
                etapaDestinoValue={etapaDestino}
                onEtapaDestinoChange={setEtapaDestino}
              />
            ) : null}
          </div>
        </div>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Cancelar solicitud de aval"
        description="¿Seguro que quieres cancelar esta solicitud de aval? Esta acción no se puede deshacer."
        confirmLabel="Cancelar solicitud"
        cancelLabel="Volver"
        loading={cancelling}
        onConfirm={handleCancel}
        onClose={() => {
          if (cancelling) return;
          setConfirmOpen(false);
        }}
      />
    </>
  );
}
