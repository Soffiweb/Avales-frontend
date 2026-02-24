"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type React from "react";
import {
  ArrowLeft,
  Calendar,
  Check,
  MapPin,
  Users,
  Trophy,
  Tag,
  FileText,
  Clock,
  UserCheck,
  DollarSign,
  User,
  Target,
  Plane,
  Building2,
  Eye,
} from "lucide-react";

import AlertBanner from "@/components/ui/alert-banner";
import ApprovalFlowCard from "../_components/approval-flow-card";
import ConfirmModal from "@/components/ui/confirm-modal";
import { useAuth } from "@/app/providers/auth-provider";
import { aprobarAval, getAval, rechazarAval } from "@/lib/api/avales";
import type { Aval, EtapaFlujo, Historial } from "@/types/aval";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
} from "@/lib/utils/formatters";
import {
  getApprovalStageLabel,
  getNextApprovalStage,
  getPreviousApprovalStages,
  APPROVAL_STAGE_FLOW,
} from "@/lib/constants";
import { getCurrentEtapa } from "@/lib/utils/aval-historial";

function formatGenero(genero?: string | null) {
  if (!genero) return "-";
  const map: Record<string, string> = {
    MASCULINO: "Masculino",
    FEMENINO: "Femenino",
    MASCULINO_FEMENINO: "Mixto",
  };
  return map[genero.toUpperCase()] ?? genero;
}

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

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function formatMes(mes: number) {
  return MESES[mes - 1] || `Mes ${mes}`;
}

type SectionHeaderProps = {
  title: string;
  description?: string;
  icon?: React.ReactNode;
};

function SectionHeader({ title, description, icon }: SectionHeaderProps) {
  return (
    <div className="space-y-1">
      <p className="text-[0.65rem] uppercase tracking-[0.4em] text-gray-400 dark:text-gray-500">
        Sección
      </p>
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h2>
      </div>
      {description && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {description}
        </p>
      )}
    </div>
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

  const userRoles = user?.roles ?? [];
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
      console.log(res.data);
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
          <div className="grid grid-cols-2 gap-4">
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
        evento.tipoParticipacion,
        evento.disciplina?.nombre,
        evento.categoria?.nombre,
        evento.alcance,
        generoEtiqueta,
      ].filter(Boolean)
    : [];
  const daysUntil = evento ? getDaysUntilEvent(evento.fechaInicio) : null;
  const duration = evento
    ? getEventDuration(evento.fechaInicio, evento.fechaFin)
    : null;
  const summaryLines = [
    evento?.codigo ? `Evento ${evento.codigo}.` : null,
    aval.numeroColeccion ? `Colección ${aval.numeroColeccion}.` : null,
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
  const groupedDeportistas = deportistasList.reduce(
    (acc, item) => {
      const genero = item.deportista?.genero?.toUpperCase();
      if (genero === "FEMENINO") {
        acc.mujeres.push(item);
      } else if (genero === "MASCULINO") {
        acc.hombres.push(item);
      } else {
        acc.otros.push(item);
      }
      return acc;
    },
    {
      hombres: [] as typeof deportistasList,
      mujeres: [] as typeof deportistasList,
      otros: [] as typeof deportistasList,
    },
  );

  const formatDeportistaName = (item: (typeof deportistasList)[number]) => {
    const nombre = item.deportista?.nombre?.trim();
    if (nombre) return nombre;
    return `Deportista #${item.id}`;
  };

  const getDeportistaCedula = (item: (typeof deportistasList)[number]) => {
    return item.deportista?.cedula ?? "Cédula no disponible";
  };

  const renderDeportistasGroup = (
    title: string,
    list: typeof deportistasList,
    options?: { showEmpty?: boolean; emptyMessage?: string },
  ) => {
    const showEmpty = options?.showEmpty ?? false;
    if (!list.length && !showEmpty) return null;
    return (
      <section className="space-y-3 px-4 py-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </p>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {list.length} {list.length === 1 ? "registro" : "registros"}
          </span>
        </div>
        <div className="space-y-3">
          {list.length > 0 ? (
            list.map((deportista) => (
              <div
                key={deportista.id}
                className="flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 px-3 py-2"
              >
                <div className="w-10 h-10 rounded-full border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800/60 flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {formatDeportistaName(deportista)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {deportista.rol}
                    {" · "}
                    {getDeportistaCedula(deportista)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-600 bg-white/60 dark:bg-gray-900/40 px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
              {options?.emptyMessage ??
                `No hay ${title.toLowerCase()} registrados aún.`}
            </div>
          )}
        </div>
      </section>
    );
  };

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
            <Link
              href="/avales"
              className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver a mis avales
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
              Detalle del Aval
            </h1>
            {evento?.codigo && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Código del evento: {evento.codigo}
              </p>
            )}
          </div>

          {/* Botón de crear solicitud si está en borrador */}
          {aval.estado === "BORRADOR" && (
            <Link
              href={`/avales/${aval.id}/crear-solicitud`}
              className="btn bg-indigo-500 hover:bg-indigo-600 text-white"
            >
              <FileText className="w-4 h-4 mr-2" />
              Crear solicitud
            </Link>
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

        {/* Información del evento */}
        {evento && (
          <>
            <section className="space-y-4">
              <SectionHeader
                icon={
                  <Trophy className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                }
                title="Información del evento"
                description="Datos esenciales para ubicar el aval de forma rápida, tal como en un PDF."
              />
              <div className="bg-white dark:bg-gray-950/60 border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-4 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.4em] text-gray-400 dark:text-gray-500">
                      Evento
                    </p>
                    <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                      {evento.nombre}
                    </h3>
                    {evento.codigo && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Código: {evento.codigo}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-300">
                    {eventBadges.map((badge, index) => (
                      <span
                        key={`${badge}-${index}`}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-gray-300 bg-gray-50 dark:bg-gray-900/40"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-sm text-gray-700 dark:text-gray-300">
                  {[
                    { label: "Tipo de evento", value: evento.tipoEvento },
                    { label: "Participación", value: evento.tipoParticipacion },
                    { label: "Disciplina", value: evento.disciplina?.nombre },
                    { label: "Categoría", value: evento.categoria?.nombre },
                    { label: "Alcance", value: evento.alcance },
                    {
                      label: "Género",
                      value: evento.genero ? formatGenero(evento.genero) : "-",
                    },
                  ].map((fact) => (
                    <div key={fact.label}>
                      <p className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-500">
                        {fact.label}
                      </p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {fact.value || "-"}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-3 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em]">Inicio</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {formatDate(evento.fechaInicio)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em]">Fin</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {formatDate(evento.fechaFin)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em]">
                      Duración
                    </p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {duration
                        ? `${duration} ${duration === 1 ? "día" : "días"}`
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em]">
                      Tiempo restante
                    </p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {daysUntil === null
                        ? "-"
                        : daysUntil < 0
                          ? "Evento pasado"
                          : daysUntil === 0
                            ? "Hoy"
                            : daysUntil === 1
                              ? "Mañana"
                              : `Faltan ${daysUntil} días`}
                    </p>
                  </div>
                </div>
              </div>
            </section>
            <section className="space-y-4">
              <SectionHeader
                icon={
                  <MapPin className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                }
                title="Ubicación"
                description="Dirección exacta y jurisdicción para los documentos."
              />
              <div className="bg-white dark:bg-gray-950/60 border border-gray-200 dark:border-gray-700 rounded-xl p-6 text-sm text-gray-700 dark:text-gray-300 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { label: "Lugar", value: evento.lugar },
                    { label: "Ciudad", value: evento.ciudad },
                    { label: "Provincia", value: evento.provincia },
                    { label: "País", value: evento.pais },
                  ].map((field) => (
                    <div key={field.label}>
                      <p className="text-xs uppercase tracking-[0.3em] text-gray-500">
                        {field.label}
                      </p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {field.value || "-"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
            <section className="space-y-4">
              <SectionHeader
                icon={
                  <Users className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                }
                title="Participantes"
                description="Distribución por género y totales como lo verías en la planilla PDF."
              />
              <div className="bg-white dark:bg-gray-950/60 border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    {
                      label: "Atletas (H)",
                      value: evento.numAtletasHombres || 0,
                    },
                    {
                      label: "Atletas (M)",
                      value: evento.numAtletasMujeres || 0,
                    },
                    {
                      label: "Entrenadores (H)",
                      value: evento.numEntrenadoresHombres || 0,
                    },
                    {
                      label: "Entrenadores (M)",
                      value: evento.numEntrenadoresMujeres || 0,
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 px-3 py-3 text-center text-gray-700 dark:text-gray-200"
                    >
                      <p className="text-xs uppercase tracking-[0.3em] text-gray-500">
                        {item.label}
                      </p>
                      <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3 border-t border-gray-200 dark:border-gray-700 pt-4 text-center">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-gray-500">
                      Total atletas
                    </p>
                    <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                      {totalAtletas}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-gray-500">
                      Total entrenadores
                    </p>
                    <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                      {totalEntrenadores}
                    </p>
                  </div>
                </div>
              </div>
            </section>
            {evento.presupuesto && evento.presupuesto.length > 0 && (
              <section className="space-y-4">
                <SectionHeader
                  icon={
                    <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  }
                  title="Presupuesto del evento"
                  description="Lista de partidas y montos para cotejar con los anexos del PDF."
                />
                <div className="bg-white dark:bg-gray-950/60 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
                  <div className="flex flex-col gap-2 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-[0.3em] text-gray-500">
                        Presupuesto total
                      </p>
                      <p className="text-xs uppercase tracking-[0.3em] text-gray-500">
                        Items registrados
                      </p>
                    </div>
                    <div className="flex items-end justify-between">
                      <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                        {formatCurrency(totalPresupuesto)}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {evento.presupuesto.length}
                      </p>
                    </div>
                  </div>
                  <div className="p-6 space-y-3">
                    {evento.presupuesto.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {item.item.nombre}
                          </h4>
                          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                            {formatCurrency(parseFloat(item.presupuesto))}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-gray-600 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            Item #{item.item.numero}
                          </span>
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {item.item.actividad.nombre}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatMes(item.mes)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}
            {aval.avalTecnico && (
              <section className="space-y-4">
                <SectionHeader
                  icon={
                    <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  }
                  title="Aval técnico"
                  description="Logística, objetivos y deportistas organizados como en el PDF impreso."
                />
                <div className="space-y-4">
                  <div className="bg-white dark:bg-gray-950/60 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                    <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-2">
                      Información de viaje
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700 dark:text-gray-300">
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-gray-500">
                          Salida
                        </p>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {formatDateTime(aval.avalTecnico.fechaHoraSalida)}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {aval.avalTecnico.transporteSalida}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-gray-500">
                          Retorno
                        </p>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {formatDateTime(aval.avalTecnico.fechaHoraRetorno)}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {aval.avalTecnico.transporteRetorno}
                        </p>
                      </div>
                    </div>
                    {aval.avalTecnico.observaciones && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300">
                        <p className="text-xs uppercase tracking-[0.3em] text-gray-500">
                          Observaciones
                        </p>
                        <p className="mt-1">{aval.avalTecnico.observaciones}</p>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {aval.avalTecnico.objetivos &&
                      aval.avalTecnico.objetivos.length > 0 && (
                        <div className="bg-white dark:bg-gray-950/60 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                          <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-3">
                            Objetivos
                          </p>
                          <ol className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                            {aval.avalTecnico.objetivos
                              .sort((a, b) => a.orden - b.orden)
                              .map((objetivo) => (
                                <li
                                  key={objetivo.id}
                                  className="flex gap-3 text-sm text-gray-700 dark:text-gray-300"
                                >
                                  <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-xs font-semibold">
                                    {objetivo.orden}
                                  </span>
                                  <span className="flex-1">
                                    {objetivo.descripcion}
                                  </span>
                                </li>
                              ))}
                          </ol>
                        </div>
                      )}
                    {aval.avalTecnico.criterios &&
                      aval.avalTecnico.criterios.length > 0 && (
                        <div className="bg-white dark:bg-gray-950/60 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                          <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-3">
                            Criterios de selección
                          </p>
                          <ol className="space-y-3">
                            {aval.avalTecnico.criterios
                              .sort((a, b) => a.orden - b.orden)
                              .map((criterio) => (
                                <li
                                  key={criterio.id}
                                  className="flex gap-3 text-sm text-gray-700 dark:text-gray-300"
                                >
                                  <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-xs font-semibold">
                                    {criterio.orden}
                                  </span>
                                  <span className="flex-1">
                                    {criterio.descripcion}
                                  </span>
                                </li>
                              ))}
                          </ol>
                        </div>
                      )}
                  </div>
                  {deportistasList.length > 0 && (
                    <div className="bg-white dark:bg-gray-950/60 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                      <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-3">
                        Deportistas seleccionados ({deportistasList.length})
                      </p>
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-6 rounded-3xl bg-gray-50/60 dark:bg-gray-900/40 p-1 divide-y divide-gray-200 dark:divide-gray-700 lg:grid-cols-2 lg:divide-y-0 lg:divide-x">
                          {renderDeportistasGroup(
                            "Hombres",
                            groupedDeportistas.hombres,
                          )}
                          {renderDeportistasGroup(
                            "Mujeres",
                            groupedDeportistas.mujeres,
                            {
                              showEmpty: true,
                              emptyMessage:
                                "No hay deportistas mujeres registradas.",
                            },
                          )}
                        </div>
                        {groupedDeportistas.otros.length > 0 && (
                          <div className="pt-6 border-t border-dashed border-gray-200 dark:border-gray-700/60">
                            {renderDeportistasGroup(
                              "Otros géneros",
                              groupedDeportistas.otros,
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}
          </>
        )}
        {showApprovalPanel && (
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
        )}
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
