"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentType,
} from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type React from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ClipboardCheck,
  MapPin,
  Users,
  Trophy,
  FileText,
  DollarSign,
  Download,
  HeartPulse,
  Loader2,
  Pencil,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import type { LucideProps } from "lucide-react";

import AlertBanner from "@/components/ui/alert-banner";
import { ensureFreshAccessToken } from "@/lib/api/client";
import ApprovalFlowCard from "../_components/approval-flow-card";
import ConfirmModal from "@/components/ui/confirm-modal";
import AvalPresupuestoSection from "./_components/aval-presupuesto-section";
import AvalDeportistasSection from "./_components/aval-deportistas-section";
import AvalLogisticaSection from "./_components/aval-logistica-section";
import AvalPdfComposerModal from "./_components/aval-pdf-composer-modal";
import Breadcrumb from "@/components/ui/breadcrumb";
import { useAuth } from "@/app/providers/auth-provider";
import {
  aprobarAval,
  deleteAvalRequest,
  deleteAdjuntoSolicitud,
  getAval,
  rechazarAval,
  regenerarAvalPdfs,
  replaceAdjuntoSolicitud,
  uploadCertificadoMedico,
  uploadConvocatoriaPrincipal,
  uploadPronosticoDeportistas,
} from "@/lib/api/avales";
import type {
  AdjuntoSolicitud,
  Aval,
  EtapaFlujo,
  Historial,
} from "@/types/aval";
import {
  formatDate,
  formatDateInput,
  formatEventScheduleLabel,
  formatCurrency,
  formatGenero,
  getCalendarDayDiff,
} from "@/lib/utils/formatters";
import { formatCategoryLabel } from "@/lib/utils/categories";
import {
  getEventoTipoParticipacionLabel,
  getTipoAvalLabel,
  getApprovalStageLabel,
} from "@/lib/constants";
import { getNormalizedRoles, isTrainerUser } from "@/lib/auth/access";
import {
  getApprovalFlowStages,
  getAvalCurrentEtapa,
  getFinalApprovalStageForAval,
  getNextApprovalStageForAval,
  getPreviousApprovalStagesForAval,
  isAvalFlowApproved,
} from "@/lib/approval-flow";
import { getActionConfig } from "@/lib/aval-form-config";
import { getSectionConfig } from "@/lib/aval-form-config";
import { useAvalFormConfig } from "@/lib/hooks/use-aval-form-config";

function getDaysUntilEvent(fechaInicio?: string | null) {
  if (!fechaInicio) return null;
  return getCalendarDayDiff(formatDateInput(new Date().toISOString()), fechaInicio);
}

function getEventDuration(
  fechaInicio?: string | null,
  fechaFin?: string | null,
) {
  if (!fechaInicio || !fechaFin) return null;
  const diff = getCalendarDayDiff(fechaInicio, fechaFin);
  return diff === null ? null : diff + 1;
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
          <p className="text-[0.65rem] uppercase tracking-wide text-gray-500 dark:text-gray-500">
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
  flowStages: EtapaFlujo[];
};

const STAGE_SHORT_LABELS: Record<EtapaFlujo, string> = {
  SOLICITUD: "Solicitud",
  PDA: "PDA",
  COMPRAS_PUBLICAS: "Compras Públicas",
  REVISION_METODOLOGO: "Metodólogo",
  REVISION_DTM: "DTM",
  CONTROL_PREVIO: "Control Previo",
  FINANCIERO: "Aprobado",
  SECRETARIA: "Secretaría",
};

function StageTimeline({ currentStage, flowStages }: StageTimelineProps) {
  const finalStage = flowStages[flowStages.length - 1] ?? currentStage;
  const isFlowApproved = currentStage === finalStage;
  const stages = flowStages
    .filter((etapa) => etapa !== "SECRETARIA")
    .map((etapa) => ({
    etapa,
    label:
      isFlowApproved && etapa === finalStage
        ? "Aprobado"
        : getApprovalStageLabel(etapa),
    shortLabel:
      isFlowApproved && etapa === finalStage
        ? "Aprobado"
        : (STAGE_SHORT_LABELS[etapa] ?? etapa),
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
  const progressPercent = isFlowApproved
    ? 100
    : stages.length > 1
      ? (currentIndex / Math.max(stages.length - 1, 1)) * 100
      : 0;

  const currentStageInfo = stages[currentIndex];

  return (
    <div className="space-y-5">
      {/* Header con paso actual */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Paso {currentIndex + 1} de {stages.length}
          </p>
          <h2 className="mt-0.5 text-lg font-semibold text-gray-900 dark:text-gray-100">
            {isFlowApproved
              ? "Aval aprobado"
              : `En: ${currentStageInfo?.label ?? "—"}`}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
            {Math.round(progressPercent)}%
          </span>
          <div className="h-2 w-32 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isFlowApproved ? "bg-emerald-500" : "bg-blue-600"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stepper visual */}
      <div className="relative pt-4 pb-2">
        <div className="absolute inset-x-6 top-9 h-0.5 bg-gray-200 dark:bg-gray-700 rounded-full" />
        <div
          className="absolute left-6 top-9 h-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-blue-600 transition-all duration-500"
          style={{
            width: `calc((100% - 3rem) * ${progressPercent / 100})`,
          }}
        />
        <div className="relative flex justify-between gap-1">
          {stages.map((stage, idx) => {
            const isStageCompleted = idx < currentIndex || isFlowApproved;
            const isCurrentStage = idx === currentIndex && !isFlowApproved;
            const status = isStageCompleted
              ? "done"
              : isCurrentStage
                ? "current"
                : "upcoming";

            const circleClasses =
              status === "done"
                ? "bg-emerald-500 border-emerald-500 text-white shadow-sm"
                : status === "current"
                  ? "border-blue-600 bg-white text-blue-600 ring-4 ring-blue-100 dark:ring-blue-900/40 shadow-md"
                  : "border-gray-300 bg-white text-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-500";

            const labelClasses =
              status === "done"
                ? "text-emerald-700 dark:text-emerald-300"
                : status === "current"
                  ? "text-blue-700 dark:text-blue-300 font-semibold"
                  : "text-gray-500 dark:text-gray-400";

            return (
              <div
                key={stage.etapa}
                className="flex flex-col items-center text-center flex-1 min-w-0"
              >
                <div
                  className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${circleClasses}`}
                  title={stage.label}
                >
                  {status === "done" ? (
                    <Check className="w-5 h-5" strokeWidth={3} />
                  ) : (
                    <span className="text-sm font-bold">{idx + 1}</span>
                  )}
                </div>
                <p
                  className={`mt-3 text-[11px] leading-tight px-1 transition-colors ${labelClasses}`}
                >
                  {stage.shortLabel}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const HISTORIAL_STATE_STYLES: Record<string, string> = {
  SOLICITADO: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  RECHAZADO: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  ACEPTADO: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  BORRADOR: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  DISPONIBLE: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

function HistorialTimeline({
  historial,
  flowStages,
}: {
  historial: Historial[];
  flowStages: EtapaFlujo[];
}) {
  const sorted = historial.slice().sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return (
    <div className="space-y-3 pt-2">
      {sorted.map((entry, idx) => {
        const stageLabel = flowStages.includes(entry.etapa)
          ? getApprovalStageLabel(entry.etapa)
          : entry.etapa;
        const stateStyle =
          HISTORIAL_STATE_STYLES[entry.estado] ??
          "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
        const isLast = idx === sorted.length - 1;

        return (
          <div key={entry.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
                  entry.estado === "RECHAZADO"
                    ? "border-rose-400 bg-rose-50 text-rose-600 dark:border-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
                    : entry.estado === "ACEPTADO"
                      ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                      : "border-blue-400 bg-blue-50 text-blue-600 dark:border-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
                }`}
              >
                {idx + 1}
              </div>
              {!isLast && (
                <div className="mt-1 w-0.5 flex-1 bg-gray-200 dark:bg-gray-700" />
              )}
            </div>
            <div className="min-w-0 flex-1 pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {stageLabel}
                </p>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${stateStyle}`}
                >
                  {entry.estado}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {entry.usuario.nombre} {entry.usuario.apellido} ·{" "}
                {formatDate(entry.createdAt)}
              </p>
              {entry.comentario ? (
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-300 italic">
                  {entry.comentario}
                </p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

type DocumentAction = {
  label: string;
  url?: string | null;
  icon: ComponentType<LucideProps>;
  replaceHandler?: (file: File) => Promise<Aval>;
  replaceLabel?: string;
};

type DocumentActionRowProps = {
  item: DocumentAction;
  onReplaced: (aval: Aval) => void;
  onError: (message: string) => void;
  acceptedTypes: string;
  canEdit: boolean;
};

function DocumentActionRow({
  item,
  onReplaced,
  onError,
  acceptedTypes,
  canEdit,
}: DocumentActionRowProps) {
  const [replacing, setReplacing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const Icon = item.icon;
  const hasFile = Boolean(item.url);
  const canUpload = canEdit && Boolean(item.replaceHandler);

  const handleReplaceClick = () => {
    if (replacing) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !item.replaceHandler) return;
    try {
      setReplacing(true);
      const updated = await item.replaceHandler(file);
      onReplaced(updated);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "No se pudo subir el archivo";
      onError(message);
    } finally {
      setReplacing(false);
    }
  };

  // Caso: sin archivo y sin posibilidad de subir (ej. "Solicitud del aval"
  // que se autogenera). Botón único disabled, como antes.
  if (!hasFile && !canUpload) {
    return (
      <button
        type="button"
        disabled
        className="btn w-full justify-center border border-gray-200 bg-gray-100 text-gray-400 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500"
      >
        <Icon className="w-4 h-4 mr-2" />
        {item.label}
      </button>
    );
  }

  // Caso: sin archivo PERO se puede subir → un solo botón "Subir X" clickeable
  // que abre el file picker directamente.
  if (!hasFile && canUpload) {
    const uploadLabel =
      item.replaceLabel?.replace(/^Reemplazar/i, "Subir") ??
      item.label.replace(/^Descargar/i, "Subir");
    return (
      <div>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={acceptedTypes}
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={handleReplaceClick}
          disabled={replacing}
          className="btn w-full justify-center bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50"
        >
          {replacing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Upload className="w-4 h-4 mr-2" />
          )}
          {replacing ? "Subiendo..." : uploadLabel}
        </button>
      </div>
    );
  }

  // Caso: archivo cargado → botón Descargar + botón ✏️ Reemplazar al lado.
  return (
    <div className="flex gap-2">
      <a
        href={item.url ?? "#"}
        target="_blank"
        rel="noreferrer noopener"
        download
        className="btn flex-1 justify-center bg-indigo-500 text-white hover:bg-indigo-600"
      >
        <Icon className="w-4 h-4 mr-2" />
        {item.label}
      </a>
      {canUpload && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={acceptedTypes}
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={handleReplaceClick}
            disabled={replacing}
            title={item.replaceLabel ?? "Reemplazar archivo"}
            aria-label={item.replaceLabel ?? "Reemplazar archivo"}
            className="btn shrink-0 border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {replacing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Pencil className="w-4 h-4" />
            )}
          </button>
        </>
      )}
    </div>
  );
}

const DOCUMENT_ACTION_ACCEPTED_TYPES =
  ".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.csv";

type AdjuntoExtraRowProps = {
  avalId: number;
  adjunto: AdjuntoSolicitud;
  onUpdated: (aval: Aval) => void;
  onError: (message: string) => void;
  canEdit: boolean;
};

function AdjuntoExtraRow({
  avalId,
  adjunto,
  onUpdated,
  onError,
  canEdit,
}: AdjuntoExtraRowProps) {
  const [busy, setBusy] = useState<"replace" | "delete" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleReplaceClick = () => {
    if (busy) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setBusy("replace");
      const updated = await replaceAdjuntoSolicitud(
        avalId,
        adjunto.id,
        file,
      ).then((r) => r.data);
      onUpdated(updated);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "No se pudo reemplazar el archivo";
      onError(message);
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async () => {
    if (busy) return;
    if (
      !window.confirm(`¿Eliminar el archivo "${adjunto.nombreOriginal}"?`)
    ) {
      return;
    }
    try {
      setBusy("delete");
      const updated = await deleteAdjuntoSolicitud(avalId, adjunto.id).then(
        (r) => r.data,
      );
      onUpdated(updated);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "No se pudo eliminar el archivo";
      onError(message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <li className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800">
      <a
        href={adjunto.url}
        target="_blank"
        rel="noreferrer noopener"
        download
        className="flex-1 min-w-0 flex items-center gap-2 hover:text-indigo-600 dark:hover:text-indigo-400"
        title={`Descargar ${adjunto.nombreOriginal}`}
      >
        <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
        <span className="truncate font-medium text-gray-900 dark:text-gray-100">
          {adjunto.nombreOriginal}
        </span>
      </a>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={DOCUMENT_ACTION_ACCEPTED_TYPES}
        onChange={handleFileChange}
      />
      {canEdit && (
        <>
          <button
            type="button"
            onClick={handleReplaceClick}
            disabled={busy !== null}
            title="Reemplazar"
            aria-label="Reemplazar"
            className="p-1 text-gray-500 hover:text-indigo-600 disabled:opacity-50 dark:text-gray-400 dark:hover:text-indigo-400"
          >
            {busy === "replace" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Pencil className="w-4 h-4" />
            )}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy !== null}
            title="Eliminar"
            aria-label="Eliminar"
            className="p-1 text-gray-500 hover:text-rose-600 disabled:opacity-50 dark:text-gray-400 dark:hover:text-rose-400"
          >
            {busy === "delete" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        </>
      )}
    </li>
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
  const [deletingRequest, setDeletingRequest] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regenerationProgress, setRegenerationProgress] = useState(0);
  const [downloadingAval, setDownloadingAval] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);

  const userRoles = getNormalizedRoles(user);
  const isAdminLike =
    userRoles.includes("ADMIN") || userRoles.includes("SUPER_ADMIN");
  const canEditAvalFiles = isTrainerUser(user);

  const handleRegeneratePdfs = useCallback(async () => {
    if (!aval || regenerating) return;
    const avalId = aval.id;
    const initialUpdatedAt = aval.updatedAt ?? null;

    setRegenerating(true);
    setRegenerationProgress(0);

    try {
      await regenerarAvalPdfs(avalId);
    } catch (err: unknown) {
      setRegenerating(false);
      setRegenerationProgress(0);
      setToast({
        variant: "error",
        message:
          err instanceof Error
            ? err.message
            : "No se pudo iniciar la regeneración de PDFs.",
      });
      return;
    }

    // Polling client-side: la barra de progreso avanza con cada intento
    // y se completa cuando detectamos cambio en updatedAt o vencen los 90s.
    const TOTAL_DURATION_MS = 90_000;
    const POLL_INTERVAL_MS = 3_000;
    const MAX_ATTEMPTS = Math.floor(TOTAL_DURATION_MS / POLL_INTERVAL_MS);

    const startedAt = Date.now();
    let attempts = 0;
    let finished = false;

    const finish = (success: boolean, message: string) => {
      if (finished) return;
      finished = true;
      setRegenerationProgress(100);
      setToast({
        variant: success ? "success" : "error",
        message,
      });
      // Pequeña pausa visual para que el usuario vea el 100% antes de cerrar.
      setTimeout(() => {
        setRegenerating(false);
        setRegenerationProgress(0);
      }, 600);
    };

    const poll = async () => {
      if (finished) return;
      attempts += 1;
      const elapsedRatio = Math.min(
        (Date.now() - startedAt) / TOTAL_DURATION_MS,
        0.95,
      );
      setRegenerationProgress(Math.round(elapsedRatio * 100));

      try {
        const res = await getAval(avalId);
        const next = res.data;
        if (next && next.updatedAt && next.updatedAt !== initialUpdatedAt) {
          setAval(next);
          finish(true, "PDFs actualizados.");
          return;
        }
      } catch {
        // Si falla el polling, reintentamos.
      }

      if (attempts < MAX_ATTEMPTS) {
        setTimeout(() => {
          void poll();
        }, POLL_INTERVAL_MS);
      } else {
        finish(
          true,
          "La regeneración tarda más de lo esperado. Recargá la página en unos minutos para ver los PDFs nuevos.",
        );
      }
    };

    setTimeout(() => {
      void poll();
    }, POLL_INTERVAL_MS);
  }, [aval, regenerating]);

  const currentEtapa = getAvalCurrentEtapa(aval);
  const flowStages = getApprovalFlowStages(aval);
  const previousToFinanciero = flowStages.includes("CONTROL_PREVIO")
    ? "CONTROL_PREVIO"
    : "REVISION_DTM";
  const isControlPrevioStage =
    flowStages.includes("CONTROL_PREVIO") && currentEtapa === "REVISION_DTM";
  const isFinancieroStage = currentEtapa === previousToFinanciero;
  const nextEtapa = getNextApprovalStageForAval(aval, currentEtapa);
  const showFinancieroPanel =
    userRoles.includes("FINANCIERO") && isFinancieroStage;
  const resolvedNextEtapa: EtapaFlujo | undefined = showFinancieroPanel
    ? "FINANCIERO"
    : nextEtapa;
  const approvalEtapa = resolvedNextEtapa ?? currentEtapa;
  const currentStageLabel = isAvalFlowApproved(aval)
    ? "Aprobado"
    : getApprovalStageLabel(currentEtapa);
  const nextStageLabel = getApprovalStageLabel(
    resolvedNextEtapa ?? currentEtapa,
  );
  const arrowCurrentLabel = currentStageLabel;
  const arrowNextLabel = nextStageLabel;
  const hasNextAfterApproval = Boolean(
    getNextApprovalStageForAval(aval, resolvedNextEtapa ?? currentEtapa),
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
    } catch (err: any) {
      setError(err?.message ?? "No se pudo cargar el aval.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchAval();
  }, [fetchAval]);

  const handleDeleteRequest = async () => {
    if (!aval) return;
    try {
      setDeletingRequest(true);
      await deleteAvalRequest(aval.id);
      router.push("/avales?status=deleted");
    } catch (err: any) {
      setError(err?.message ?? "No se pudo eliminar la solicitud del aval.");
      setConfirmOpen(false);
    } finally {
      setDeletingRequest(false);
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

  const { config: formConfig } = useAvalFormConfig(aval);

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
        formatCategoryLabel(
          evento.categoria?.nombre ?? evento.categoriaCodigo,
          "",
        ),
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
    aval.avalTecnico?.numeroAval || aval.numeroColeccion
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
  const isAvalCompleto = isAvalFlowApproved(aval);
  const displayCurrentEtapa = isAvalCompleto
    ? getFinalApprovalStageForAval(aval)
    : currentEtapa;
  const canDownloadAvalCompleto = Boolean(aval.aval) || isAvalCompleto;
  const isAvalOwner =
    isTrainerUser(user) &&
    user?.id !== undefined &&
    aval.entrenadores.some((e) => e.entrenadorId === user.id);
  const canEditSolicitud =
    isAvalOwner &&
    (aval.estado === "BORRADOR" ||
      (aval.estado === "SOLICITADO" && currentEtapa === "SOLICITUD"));
  const canDeleteSolicitud =
    isAvalOwner &&
    (aval.estado === "BORRADOR" ||
      (aval.estado === "SOLICITADO" && currentEtapa === "SOLICITUD"));
  const canDeleteAsAdmin = isAdminLike;
  // Endpoint ZIP: incluye el PDF mergeado + cualquier adjunto NO-PDF/NO-imagen
  // (Excel, CSV) suelto dentro del archivo.
  const avalCompletoPdfUrl = `/api/v1/avales/${aval.id}/aval-completo-zip`;

  // La descarga del aval completo es un endpoint protegido del backend. Un <a href>
  // plano NO envía el header Authorization (el token vive en localStorage, no en
  // cookie), por eso fallaba con 401. Se descarga vía fetch autenticado -> blob.
  const handleDownloadAvalCompleto = async () => {
    try {
      setDownloadingAval(true);
      const token = await ensureFreshAccessToken();
      const res = await fetch(avalCompletoPdfUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `aval-${aval.id}-completo.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      setToast({
        variant: "error",
        message:
          "No se pudo descargar el aval completo. Volvé a iniciar sesión e intentá de nuevo.",
      });
    } finally {
      setDownloadingAval(false);
    }
  };

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
  const solicitudAvalUrl =
    aval.solicitudUrl ?? aval.avalTecnicoPdfUrl ?? aval.avalTecnico?.archivo;
  const documentActions: DocumentAction[] = [
    {
      label: "Descargar solicitud del aval",
      url: solicitudAvalUrl,
      icon: FileText,
    },
    {
      label: "Descargar convocatoria",
      url: aval.convocatoriaUrl,
      icon: Download,
      replaceHandler: (file) =>
        uploadConvocatoriaPrincipal(aval.id, file).then((r) => r.data),
      replaceLabel: "Reemplazar convocatoria",
    },
    {
      label: "Descargar certificado médico",
      url: aval.certificadoMedicoUrl,
      icon: HeartPulse,
      replaceHandler: (file) =>
        uploadCertificadoMedico(aval.id, file).then((r) => r.data),
      replaceLabel: "Reemplazar certificado médico",
    },
    {
      label: "Descargar pronóstico de deportistas",
      url: aval.pronosticoDeportistasUrl,
      icon: ClipboardCheck,
      replaceHandler: (file) =>
        uploadPronosticoDeportistas(aval.id, file).then((r) => r.data),
      replaceLabel: "Reemplazar pronóstico de deportistas",
    },
  ];
  const canShowPresupuestoSalida =
    isAvalCompleto && Boolean(evento?.presupuesto?.length);
  const approveAction = getActionConfig(formConfig, "APROBAR");
  const rejectAction = getActionConfig(formConfig, "RECHAZAR");
  const participantesSection = getSectionConfig(formConfig, "PARTICIPANTES");
  const presupuestoSection = getSectionConfig(formConfig, "PRESUPUESTO");
  const hasMixedParticipants = deportistasList.some(
    (deportista) => deportista.modalidadParticipacion === "SOLO_RESULTADO",
  );

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
        {regenerating ? (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 dark:border-indigo-800 dark:bg-indigo-950/40">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2 text-sm text-indigo-900 dark:text-indigo-200">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="font-medium">Regenerando PDFs…</span>
                <span className="text-indigo-700 dark:text-indigo-300 hidden sm:inline">
                  Esto puede tardar hasta 90 segundos. No cierres esta página.
                </span>
              </div>
              <span className="text-xs font-mono tabular-nums text-indigo-700 dark:text-indigo-300">
                {regenerationProgress}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-indigo-100 dark:bg-indigo-900/50">
              <div
                className="h-full bg-indigo-600 transition-all duration-300 ease-out"
                style={{ width: `${regenerationProgress}%` }}
              />
            </div>
          </div>
        ) : null}
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="mb-2">
              <Breadcrumb
                items={[
                  { label: "Avales", href: "/avales" },
                  { label: "Detalle del Aval" },
                ]}
              />
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

          <div className="flex flex-col sm:flex-row gap-2">
            {canEditSolicitud && (
              <Link
                href={`/avales/${aval.id}/crear-solicitud`}
                className="btn border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-300 dark:hover:bg-indigo-950/50"
              >
                <Pencil className="w-4 h-4 mr-2" />
                Editar solicitud
              </Link>
            )}
            {(canDeleteSolicitud || canDeleteAsAdmin) && (
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="btn border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-950/50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {canDeleteAsAdmin ? "Eliminar aval" : "Eliminar solicitud"}
              </button>
            )}
            {isAdminLike && (
              <button
                type="button"
                onClick={handleRegeneratePdfs}
                disabled={regenerating}
                className="btn border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed"
                title="Regenera todos los PDFs ya emitidos (PDA, Compras, Metodólogo, DTM, Control Previo, Financiero, Aval Técnico, Aval Completo)"
              >
                {regenerating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                {regenerating
                  ? `Regenerando… ${regenerationProgress}%`
                  : "Regenerar PDFs"}
              </button>
            )}
            <button
              type="button"
              onClick={() => setComposerOpen(true)}
              className="btn border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              title="Vista previa o descarga combinada de documentos"
            >
              <FileText className="w-4 h-4 mr-2" />
              Documentos del aval
            </button>
            {canDownloadAvalCompleto ? (
              <button
                type="button"
                onClick={handleDownloadAvalCompleto}
                disabled={downloadingAval}
                className="btn bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {downloadingAval ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                {downloadingAval ? "Descargando…" : "Descargar aval completo"}
              </button>
            ) : (
              <button
                type="button"
                disabled
                title="El aval completo estará disponible una vez aprobado en todas las etapas."
                className="btn bg-indigo-500 text-white opacity-50 cursor-not-allowed"
              >
                <Download className="w-4 h-4 mr-2" />
                Descargar aval completo
              </button>
            )}
          </div>
        </div>

        {/* Estado del aval */}
        <div className="space-y-4">
          <StageTimeline currentStage={displayCurrentEtapa} flowStages={flowStages} />
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
                <div className="space-y-5">
                  {/* Header: nombre completo + tags rápidos */}
                  <div className="space-y-3">
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 break-words">
                        {evento.nombre}
                      </h3>
                      {evento.codigo ? (
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                          Evento {evento.codigo}
                        </p>
                      ) : null}
                    </div>
                    {eventBadges.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {eventBadges.map((badge, index) => (
                          <span
                            key={`${badge}-${index}`}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900"
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
                          getEventoTipoParticipacionLabel(
                            evento.tipoParticipacion,
                          ) ?? "",
                      },
                      { label: "Disciplina", value: evento.disciplina?.nombre },
                      {
                        label: "Categoría",
                        value: formatCategoryLabel(
                          evento.categoria?.nombre ?? evento.categoriaCodigo,
                        ),
                      },
                      { label: "Alcance", value: evento.alcance },
                      {
                        label: "Género",
                        value: evento.genero ? formatGenero(evento.genero) : "",
                      },
                    ]}
                  />

                  {/* Programación */}
                  <div className="space-y-2">
                    <p className="text-[0.65rem] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-400">
                      Programación
                    </p>
                    {hasRealDates ? (
                      <FactGrid
                        items={[
                          {
                            label: "Inicio",
                            value: evento.fechaInicio
                              ? formatDate(evento.fechaInicio)
                              : "",
                          },
                          {
                            label: "Fin",
                            value: evento.fechaFin
                              ? formatDate(evento.fechaFin)
                              : "",
                          },
                          {
                            label: "Duración",
                            value: duration
                              ? `${duration} día${duration === 1 ? "" : "s"}`
                              : "",
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
                            label: "Mes programado",
                            value: formatEventScheduleLabel(evento),
                          },
                        ]}
                      />
                    )}
                  </div>

                  {/* Ubicación */}
                  <div className="space-y-2">
                    <p className="text-[0.65rem] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                      <MapPin className="w-3 h-3" />
                      Ubicación
                    </p>
                    <FactGrid
                      items={[
                        { label: "Lugar", value: evento.lugar },
                        { label: "Ciudad", value: evento.ciudad },
                        { label: "Provincia", value: evento.provincia },
                        { label: "País", value: evento.pais },
                      ]}
                    />
                  </div>

                  {/* Cupos */}
                  <div className="space-y-2">
                    <p className="text-[0.65rem] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-400">
                      Cupos
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950/40 px-3 py-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/40">
                          <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[0.65rem] uppercase tracking-wide text-gray-500 dark:text-gray-500">
                            Total entrenadores
                          </p>
                          <p className="mt-0.5 text-base font-semibold text-gray-900 dark:text-gray-100">
                            {totalEntrenadores ?? "—"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950/40 px-3 py-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/40">
                          <Trophy className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[0.65rem] uppercase tracking-wide text-gray-500 dark:text-gray-500">
                            Deportistas seleccionados
                          </p>
                          <p className="mt-0.5 text-base font-semibold text-gray-900 dark:text-gray-100">
                            {deportistasList.length || "—"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {aval.resumenCupos ? (
                      <div className="grid grid-cols-3 gap-2 rounded-lg border border-gray-200 bg-gray-50/70 px-3 py-3 dark:border-gray-700 dark:bg-gray-800/60">
                        <div className="text-center">
                          <p className="text-[0.65rem] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Total
                          </p>
                          <p className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {aval.resumenCupos.total}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-[0.65rem] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Cubiertos
                          </p>
                          <p className="mt-0.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                            {aval.resumenCupos.cubiertos}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-[0.65rem] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Solo resultado
                          </p>
                          <p className="mt-0.5 text-sm font-semibold text-indigo-700 dark:text-indigo-400">
                            {aval.resumenCupos.soloResultado}
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>
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
                      value: aval.fechaEmision
                        ? formatDate(aval.fechaEmision)
                        : "",
                    },
                    {
                      label: "Creado",
                      value: aval.createdAt ? formatDate(aval.createdAt) : "",
                    },
                    {
                      label: "Actualizado",
                      value: aval.updatedAt ? formatDate(aval.updatedAt) : "",
                    },
                    {
                      label: "N° solicitud",
                      value: formatSolicitudNumber(
                        aval.avalTecnico?.numeroAval ?? aval.numeroColeccion,
                      ),
                    },
                  ]}
                />

                {aval.descripcion ? (
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-4 py-3">
                    <p className="text-[0.65rem] uppercase tracking-wide text-gray-500">
                      Descripción
                    </p>
                    <p className="mt-1 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line">
                      {aval.descripcion}
                    </p>
                  </div>
                ) : null}

                {aval.comentario ? (
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-4 py-3">
                    <p className="text-[0.65rem] uppercase tracking-wide text-gray-500">
                      Comentario
                    </p>
                    <p className="mt-1 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line">
                      {aval.comentario}
                    </p>
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

                    {(getSectionConfig(formConfig, "DOCUMENTOS")?.visible ?? true) && (
                      <AvalLogisticaSection
                        avalTecnico={aval.avalTecnico}
                        fechaEmision={aval.fechaEmision}
                      />
                    )}

                    {(aval.avalTecnico.objetivos?.length ||
                      aval.avalTecnico.criterios?.length) && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {aval.avalTecnico.objetivos?.length ? (
                          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950/40 p-4">
                            <p className="text-[0.65rem] uppercase tracking-wide text-gray-500 mb-2">
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
                            <p className="text-[0.65rem] uppercase tracking-wide text-gray-500 mb-2">
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

                    {deportistasList.length > 0 &&
                    (participantesSection?.visible ?? true) ? (
                      <AvalDeportistasSection deportistas={deportistasList} />
                    ) : null}
                    {hasMixedParticipants ? (
                      <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-200">
                        Este aval incluye participantes solo por resultados dentro del mismo expediente.
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </CollapsibleSection>

            {canShowPresupuestoSalida && (presupuestoSection?.visible ?? true) ? (
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
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950/60 p-4 shadow-sm">
              <p className="text-[0.65rem] uppercase tracking-wide text-gray-500 mb-3">
                Contrato aval
              </p>
              <div className="grid gap-3">
                <div>
                  <p className="text-[0.65rem] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Tipo
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {getTipoAvalLabel(aval.tipoAval)}
                  </p>
                </div>
                {typeof aval.montoSolicitado === "number" ? (
                  <div>
                    <p className="text-[0.65rem] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Monto solicitado
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {formatCurrency(aval.montoSolicitado)}
                    </p>
                  </div>
                ) : null}
                {typeof aval.montoAsignado === "number" ? (
                  <div>
                    <p className="text-[0.65rem] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Monto asignado
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {formatCurrency(aval.montoAsignado)}
                    </p>
                  </div>
                ) : null}
                {aval.presupuesto ? (
                  <div className="rounded-lg bg-gray-50 px-3 py-3 dark:bg-gray-900/60">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Presupuesto por fuente
                    </p>
                    <div className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-400">
                      <p>Fuente: {getTipoAvalLabel(aval.presupuesto.fuente ?? aval.tipoAval)}</p>
                      <p>Asignado: {formatCurrency(aval.presupuesto.asignado)}</p>
                      <p>Comprometido: {formatCurrency(aval.presupuesto.comprometido)}</p>
                      <p>Disponible: {formatCurrency(aval.presupuesto.disponible)}</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {summaryLines.length > 0 ? (
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950/60 p-4 shadow-sm">
                <p className="text-[0.65rem] uppercase tracking-wide text-gray-500 mb-2">
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

            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950/60 p-4 shadow-sm">
              <div className="space-y-2">
                {documentActions.map((item) => (
                  <DocumentActionRow
                    key={item.label}
                    item={item}
                    canEdit={canEditAvalFiles}
                    acceptedTypes={DOCUMENT_ACTION_ACCEPTED_TYPES}
                    onReplaced={(updated) => {
                      setAval(updated);
                      setToast({
                        variant: "success",
                        message: "Archivo reemplazado correctamente.",
                      });
                    }}
                    onError={(message) =>
                      setToast({ variant: "error", message })
                    }
                  />
                ))}
              </div>

              {/* Adicionales de convocatoria — editables individualmente */}
              {(aval.convocatoriaAdjuntos?.length ?? 0) > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                    Convocatorias adicionales
                  </p>
                  <ul className="space-y-2">
                    {aval.convocatoriaAdjuntos?.map((adj) => (
                      <AdjuntoExtraRow
                        key={adj.id}
                        avalId={aval.id}
                        adjunto={adj}
                        canEdit={canEditAvalFiles}
                        onUpdated={(updated) => {
                          setAval(updated);
                          setToast({
                            variant: "success",
                            message: "Archivo actualizado correctamente.",
                          });
                        }}
                        onError={(message) =>
                          setToast({ variant: "error", message })
                        }
                      />
                    ))}
                  </ul>
                </div>
              )}

              {/* Adicionales de pronóstico — editables individualmente */}
              {(aval.pronosticoDeportistasAdjuntos?.length ?? 0) > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                    Pronósticos de deportistas adicionales
                  </p>
                  <ul className="space-y-2">
                    {aval.pronosticoDeportistasAdjuntos?.map((adj) => (
                      <AdjuntoExtraRow
                        key={adj.id}
                        avalId={aval.id}
                        adjunto={adj}
                        canEdit={canEditAvalFiles}
                        onUpdated={(updated) => {
                          setAval(updated);
                          setToast({
                            variant: "success",
                            message: "Archivo actualizado correctamente.",
                          });
                        }}
                        onError={(message) =>
                          setToast({ variant: "error", message })
                        }
                      />
                    ))}
                  </ul>
                </div>
              )}
            </div>

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
                approveVisible={approveAction?.visible ?? true}
                approveEnabled={approveAction?.enabled ?? true}
                rejectVisible={rejectAction?.visible ?? true}
                rejectEnabled={rejectAction?.enabled ?? true}
                etapaDestinoOptions={getPreviousApprovalStagesForAval(
                  aval,
                  currentEtapa,
                ).map((e) => ({ value: e, label: getApprovalStageLabel(e) }))}
                etapaDestinoValue={etapaDestino}
                onEtapaDestinoChange={setEtapaDestino}
              />
            ) : null}
          </div>
        </div>
      </div>

      {aval.historial.length > 0 ? (
        <div className="px-4 sm:px-6 lg:px-8 pb-8 w-full max-w-7xl mx-auto">
          <CollapsibleSection
            title="Historial de aprobación"
            icon={
              <FileText className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            }
            meta={
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {aval.historial.length}{" "}
                {aval.historial.length === 1 ? "evento" : "eventos"}
              </p>
            }
          >
            <HistorialTimeline
              historial={aval.historial}
              flowStages={flowStages}
            />
          </CollapsibleSection>
        </div>
      ) : null}

      {composerOpen ? (
        <AvalPdfComposerModal
          avalId={aval.id}
          availableDocs={{
            avalTecnico: aval.avalTecnicoPdfUrl,
            comprasPublicas: aval.comprasPublicasPdfUrl,
            revisionMetodologo: aval.revisionMetodologoUrl,
            revisionDtm: aval.revisionDtmUrl,
            presupuestoSalida: aval.presupuestoSalidaUrl,
            certificacionPresupuestaria: aval.certificacionPresupuestariaUrl,
            escuelaIniciacion: aval.escuelaIniciacionPdfUrl,
            convocatoria: aval.convocatoriaUrl,
            certificadoMedico: aval.certificadoMedicoUrl,
            pronosticoDeportistas: aval.pronosticoDeportistasUrl,
          }}
          onClose={() => setComposerOpen(false)}
        />
      ) : null}

      <ConfirmModal
        open={confirmOpen}
        title={canDeleteAsAdmin ? "Eliminar aval completo" : "Eliminar solicitud de aval"}
        description={
          canDeleteAsAdmin
            ? "¿Seguro que quieres eliminar este aval? Se borrarán todos los datos, archivos en storage y el evento quedará disponible para crear un nuevo aval. Esta acción no se puede deshacer."
            : "¿Seguro que quieres eliminar esta solicitud de aval? Esta acción no se puede deshacer."
        }
        confirmLabel={canDeleteAsAdmin ? "Eliminar aval" : "Eliminar solicitud"}
        cancelLabel="Volver"
        loading={deletingRequest}
        onConfirm={handleDeleteRequest}
        onClose={() => {
          if (deletingRequest) return;
          setConfirmOpen(false);
        }}
      />
    </>
  );
}
