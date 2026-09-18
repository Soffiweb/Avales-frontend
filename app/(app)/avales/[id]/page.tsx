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
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronDown,
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
import ConfirmModal from "@/components/ui/confirm-modal";
import CopyEventCodeButton from "@/components/ui/copy-event-code-button";
import AvalPresupuestoPdaSection from "./_components/aval-presupuesto-pda-section";
import AvalDeportistasSection from "./_components/aval-deportistas-section";
import AvalLogisticaSection from "./_components/aval-logistica-section";
import AvalPdfComposerModal from "./_components/aval-pdf-composer-modal";
import Breadcrumb from "@/components/ui/breadcrumb";
import {
  SectionCard,
  SectionCardHeaderTitle,
  SectionLabel,
  SECTION_CARD_CLASS,
  SECTION_CARD_HEADER_CLASS,
  type SectionIconTone,
} from "@/components/ui/section-card";
import { useAuth } from "@/app/providers/auth-provider";
import {
  deleteAvalRequest,
  deleteAdjuntoSolicitud,
  getAval,
  regenerarAvalPdfs,
  replaceAdjuntoSolicitud,
  uploadCertificadoMedico,
  uploadAdjuntosSolicitud,
  uploadConvocatoriaPrincipal,
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
import { getAvalCupos } from "@/lib/utils/aval-collections";
import {
  getEventoTipoParticipacionLabel,
  getTipoAvalLabel,
  getApprovalStageLabel,
} from "@/lib/constants";
import {
  getNormalizedRoles,
  isDTMUser,
  isMetodologoUser,
  isPdaUser,
  isTrainerUser,
} from "@/lib/auth/access";
import {
  getApprovalFlowStages,
  getAvalCurrentEtapa,
  getEtapasAprobadas,
  getFinalApprovalStageForAval,
  isAvalFlowApproved,
  normalizeEtapaFlujo,
} from "@/lib/approval-flow";
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

/**
 * Paleta pastel de los indicadores de estado de la página.
 *
 * Todo lo que informa un estado (chips del evento, badge de tiempo, estados
 * del historial) sale de acá en vez de escribir los tres colores a mano en
 * cada lugar. Con rellenos sólidos, media pantalla terminaba compitiendo por
 * atención y no se distinguía el dato del adorno; en pastel el estado se lee
 * igual por tono y el borde es lo que lo sigue leyendo como etiqueta sobre
 * fondo blanco.
 */
type PastelTone = "slate" | "indigo" | "emerald" | "sky" | "amber" | "rose";

const PASTEL_TONES: Record<PastelTone, string> = {
  slate:
    "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-500/30",
  indigo:
    "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/30",
  emerald:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  sky: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/30",
  amber:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  rose: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30",
};

function PastelBadge({
  tone,
  children,
  title,
}: {
  tone: PastelTone;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${PASTEL_TONES[tone]}`}
    >
      {children}
    </span>
  );
}

/**
 * Cuenta regresiva al evento, con el tono marcando la urgencia.
 *
 * Devuelve texto y tono juntos porque el dato aparece en dos lugares (la ficha
 * de programación y el resumen del sidebar) y con dos representaciones
 * distintas del mismo número el usuario cree que son dos cosas distintas.
 */
function getDaysUntilBadge(
  daysUntil: number | null,
): { text: string; tone: PastelTone } | null {
  if (daysUntil === null) return null;
  if (daysUntil < 0) return { text: "Evento pasado", tone: "rose" };
  if (daysUntil === 0) return { text: "Inicia hoy", tone: "rose" };
  if (daysUntil === 1) return { text: "Inicia mañana", tone: "amber" };
  if (daysUntil <= 3) return { text: `Faltan ${daysUntil} días`, tone: "amber" };
  return { text: `Faltan ${daysUntil} días`, tone: "slate" };
}

type FactItem = {
  label: string;
  value: string | number | null | undefined;
  /**
   * Render alternativo del valor (por ejemplo un badge).
   *
   * `value` se sigue pidiendo aunque haya `node`: es lo que decide si el dato
   * está vacío y por lo tanto si la celda se muestra. Sin él, una celda sin
   * dato aparecería igual con un badge vacío adentro.
   */
  node?: React.ReactNode;
};

function isEmptyValue(value: FactItem["value"]) {
  if (value === null || value === undefined) return true;
  if (typeof value === "number") return false;
  return value.trim().length === 0;
}

/**
 * Grilla de datos rotulados.
 *
 * Va sobre un panel propio y no suelta sobre la tarjeta: son pares
 * rótulo/valor y sin el panel se leen como texto corrido dentro de la sección.
 */
function FactGrid({ items }: { items: FactItem[] }) {
  const visible = items.filter((item) => !isEmptyValue(item.value));
  if (visible.length === 0) return null;

  return (
    <dl className="grid gap-4 rounded-xl border border-slate-200/70 bg-slate-50/60 p-4 sm:grid-cols-2 lg:grid-cols-3 dark:border-slate-700/60 dark:bg-slate-900/40">
      {visible.map((item) => (
        <div key={item.label} className="min-w-0">
          <SectionLabel as="dt">{item.label}</SectionLabel>
          <dd className="mt-1 truncate text-sm font-bold text-slate-800 dark:text-slate-200">
            {item.node ?? String(item.value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

type CollapsibleSectionProps = {
  title: string;
  icon?: React.ReactNode;
  iconTone?: SectionIconTone;
  defaultOpen?: boolean;
  meta?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * Sección plegable con la misma piel que `SectionCard`.
 *
 * Reutiliza las clases del primitivo en vez de copiarlas para que una tarjeta
 * plegable y una fija no se vean distintas. Sigue siendo `<details>/<summary>`
 * nativo a propósito: el desplegado no necesita estado en React, funciona sin
 * JavaScript y el navegador ya le da el rol y el foco correctos.
 */
function CollapsibleSection({
  title,
  icon,
  iconTone = "slate",
  defaultOpen = false,
  meta,
  children,
}: CollapsibleSectionProps) {
  return (
    <details open={defaultOpen} className={`group ${SECTION_CARD_CLASS}`}>
      <summary
        className={`${SECTION_CARD_HEADER_CLASS} cursor-pointer list-none transition-colors hover:bg-slate-100/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 dark:hover:bg-slate-900/70`}
      >
        <SectionCardHeaderTitle
          title={title}
          icon={icon}
          iconTone={iconTone}
          meta={meta}
        />
        <div className="mt-1 flex shrink-0 items-center gap-2">
          {/* Las dos leyendas conviven en el DOM y se alternan con
              `group-open:`: el estado del `<details>` no vive en React, así
              que no hay forma de elegir una sola al renderizar. */}
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 group-open:hidden dark:text-slate-500">
            Desplegar
          </span>
          <span className="hidden text-[11px] font-bold uppercase tracking-wider text-slate-400 group-open:inline dark:text-slate-500">
            Ocultar
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
        </div>
      </summary>
      <div className="p-6">{children}</div>
    </details>
  );
}

// Mapa etapa -> URL del formulario de ese paso. Admin clickea el circulo del
// stepper y entra a editar/ver. SECRETARIA no tiene pagina propia.
const ETAPA_TO_PATH: Partial<Record<string, string>> = {
  SOLICITUD: "crear-solicitud",
  PDA: "certificar-pda",
  COMPRAS_PUBLICAS: "certificar-compras-publicas",
  REVISION_METODOLOGO: "revision-metodologo",
  REVISION_DTM: "revision-dtm",
  CONTROL_PREVIO: "revision-control-previo",
  FINANCIERO: "certificacion-financiera",
};

type StageTimelineProps = {
  currentStage: EtapaFlujo;
  flowStages: EtapaFlujo[];
  historial?: Historial[];
  isAdmin?: boolean;
  avalId?: number;
  isDraft?: boolean;
  isApproved?: boolean;
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

function StageTimeline({
  currentStage,
  flowStages,
  historial,
  isAdmin = false,
  avalId,
  isDraft = false,
  isApproved = false,
}: StageTimelineProps) {
  const finalStage = flowStages[flowStages.length - 1] ?? currentStage;
  // El orden lo manda la configuracion del flujo, pero lo ya cumplido lo manda
  // el historial: un aval en curso pudo recorrer las etapas en otro orden.
  const etapasAprobadas = getEtapasAprobadas(historial);
  const hasHistorial = (historial?.length ?? 0) > 0;
  const stages = flowStages
    .filter((etapa) => etapa !== "SECRETARIA")
    .map((etapa) => ({
      etapa,
      label:
        isApproved && etapa === finalStage
          ? "Aprobado"
          : getApprovalStageLabel(etapa),
      shortLabel:
        isApproved && etapa === finalStage
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
  const progressPercent = isDraft
    ? 0
    : isApproved
      ? 100
      : stages.length > 1
        ? (currentIndex / Math.max(stages.length - 1, 1)) * 100
        : 0;

  const currentStageInfo = stages[currentIndex];

  // Etapas anteriores a la actual que nunca se aprobaron: pasa en avales que
  // arrancaron con un orden de flujo distinto al configurado hoy.
  const skippedStages = isApproved
    ? []
    : stages.filter(
        (stage, idx) =>
          idx < currentIndex &&
          hasHistorial &&
          !etapasAprobadas.has(stage.etapa),
      );

  return (
    <div className="space-y-5">
      {/* Header con paso actual */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <SectionLabel>
            Paso {currentIndex + 1} de {stages.length}
          </SectionLabel>
          <h2 className="mt-0.5 text-lg font-bold text-slate-900 dark:text-slate-100">
            {isApproved
              ? "Aval aprobado"
              : `En: ${currentStageInfo?.label ?? "—"}`}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold tabular-nums text-slate-600 dark:text-slate-300">
            {Math.round(progressPercent)}%
          </span>
          {/* La barra sí va con relleno sólido: es la única pieza sin texto
              encima y en pastel no se distinguiría de su propio riel. */}
          <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isApproved ? "bg-emerald-500" : "bg-indigo-500"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stepper visual */}
      <div className="relative pt-4 pb-2">
        <div className="absolute inset-x-6 top-9 h-0.5 bg-slate-200 dark:bg-slate-700 rounded-full" />
        <div
          // Mismo criterio que la barra de arriba: verde cuando el flujo está
          // aprobado, indigo mientras avanza. Con un degradado fijo el tramo
          // final se veía indigo incluso al 100%, y el aval aprobado quedaba
          // contradiciéndose con su propio porcentaje.
          className={`absolute left-6 top-9 h-0.5 rounded-full transition-all duration-500 ${
            isApproved ? "bg-emerald-400" : "bg-indigo-400"
          }`}
          style={{
            width: `calc((100% - 3rem) * ${progressPercent / 100})`,
          }}
        />
        <div className="relative flex justify-between gap-1">
          {stages.map((stage, idx) => {
            const isCurrentStage = idx === currentIndex && !isApproved;
            // Sin historial cargado se cae a la posicion; con historial, manda
            // lo aprobado (soporta etapas cumplidas fuera del orden actual).
            const isStageCompleted =
              isApproved ||
              (hasHistorial
                ? etapasAprobadas.has(stage.etapa)
                : idx < currentIndex);
            const isSkippedStage =
              !isCurrentStage && !isStageCompleted && idx < currentIndex;
            const isDraftStage = isDraft && isCurrentStage;
            const status = isCurrentStage
              ? "current"
              : isStageCompleted
                ? "done"
                : isSkippedStage
                  ? "skipped"
                  : "upcoming";

            // Círculos pastel, nunca sólidos: siete pasos rellenos de color
            // saturado tapan al resto de la página y el número de adentro
            // pierde contraste. El estado se sigue leyendo por tono, y "en
            // curso" se separa de "cumplida" con el halo, no con el relleno.
            const circleClasses =
              status === "done"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                : isDraftStage
                  ? "border-amber-200 bg-amber-50 text-amber-700 ring-4 ring-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20"
                  : status === "current"
                    ? "border-indigo-200 bg-indigo-50 text-indigo-700 ring-4 ring-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/20"
                    : status === "skipped"
                      ? "border-dashed border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300"
                      : "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-600 dark:bg-slate-500/10 dark:text-slate-400";

            const labelClasses =
              status === "done"
                ? "text-emerald-700 dark:text-emerald-300"
                : isDraftStage
                  ? "font-bold text-amber-700 dark:text-amber-300"
                  : status === "current"
                    ? "font-bold text-indigo-700 dark:text-indigo-300"
                    : status === "skipped"
                      ? "text-amber-700 dark:text-amber-400"
                      : "text-slate-500 dark:text-slate-400";

            const stageHref = ETAPA_TO_PATH[stage.etapa];
            const isClickable = isAdmin && avalId && stageHref;
            const stageTitle =
              status === "skipped"
                ? `${stage.label} · pendiente: no se aprobó en este orden`
                : stage.label;
            const titleText = isClickable
              ? `${stageTitle} · click para editar (modo admin)`
              : stageTitle;

            const circle = (
              <div
                className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${circleClasses} ${
                  isClickable
                    ? "cursor-pointer hover:scale-110 hover:shadow-md"
                    : ""
                }`}
                title={titleText}
              >
                {status === "done" ? (
                  <Check className="w-5 h-5" strokeWidth={3} />
                ) : (
                  <span className="text-sm font-bold">{idx + 1}</span>
                )}
              </div>
            );

            return (
              <div
                key={stage.etapa}
                className="flex flex-col items-center text-center flex-1 min-w-0"
              >
                {isClickable ? (
                  <Link href={`/avales/${avalId}/${stageHref}`}>{circle}</Link>
                ) : (
                  circle
                )}
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

      {skippedStages.length > 0 ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Este aval avanzó con un orden de flujo anterior al configurado hoy.
            Etapas sin aprobación registrada:{" "}
            <span className="font-semibold">
              {skippedStages.map((stage) => stage.shortLabel).join(", ")}
            </span>
            .
          </p>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Estado del historial → tono pastel.
 *
 * Guarda el tono y no las clases para que el chip y el punto numerado de la
 * misma fila no puedan quedar de colores distintos.
 */
const HISTORIAL_STATE_TONES: Record<string, PastelTone> = {
  SOLICITADO: "indigo",
  RECHAZADO: "rose",
  ACEPTADO: "emerald",
  BORRADOR: "slate",
  DISPONIBLE: "slate",
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
        const stateTone = HISTORIAL_STATE_TONES[entry.estado] ?? "slate";
        const isLast = idx === sorted.length - 1;

        return (
          <div key={entry.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${PASTEL_TONES[stateTone]}`}
              >
                {idx + 1}
              </div>
              {!isLast && (
                <div className="mt-1 w-0.5 flex-1 bg-slate-200 dark:bg-slate-700" />
              )}
            </div>
            <div className="min-w-0 flex-1 pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {stageLabel}
                </p>
                <PastelBadge tone={stateTone}>{entry.estado}</PastelBadge>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {entry.usuario.nombre} {entry.usuario.apellido} ·{" "}
                {formatDate(entry.createdAt)}
              </p>
              {entry.comentario ? (
                <p className="mt-1 text-xs italic text-slate-600 dark:text-slate-300">
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
  replaceHandler?: (files: File[]) => Promise<Aval>;
  replaceLabel?: string;
  allowMultiple?: boolean;
  /**
   * Marca la descarga principal del panel.
   *
   * Solo una la lleva: es la única que va con relleno sólido. Si las tres
   * descargas se pintaran igual, no habría jerarquía y el usuario tendría que
   * leer las tres etiquetas para saber cuál es "la" del aval.
   */
  primary?: boolean;
};

/** Botón secundario: contorno slate. Es el default de toda la página. */
const OUTLINE_BUTTON_CLASS =
  "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700";

/** Botón secundario con acento: para acciones de subida y de edición. */
const SOFT_INDIGO_BUTTON_CLASS =
  "border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20";

/** Botón primario: el único relleno sólido que se permite en la página. */
const PRIMARY_BUTTON_CLASS =
  "bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed";

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
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    if (files.length === 0 || !item.replaceHandler) return;
    try {
      setReplacing(true);
      const updated = await item.replaceHandler(files);
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
        className="btn w-full justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-500"
      >
        <Icon className="mr-2 h-4 w-4" />
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
          multiple={item.allowMultiple}
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={handleReplaceClick}
          disabled={replacing}
          className={`btn w-full justify-center rounded-xl disabled:opacity-50 ${SOFT_INDIGO_BUTTON_CLASS}`}
        >
          {replacing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
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
        className={`btn flex-1 justify-center rounded-xl ${
          item.primary ? PRIMARY_BUTTON_CLASS : SOFT_INDIGO_BUTTON_CLASS
        }`}
      >
        <Icon className="mr-2 h-4 w-4" />
        {item.label}
      </a>
      {canUpload && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={acceptedTypes}
            multiple={item.allowMultiple}
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={handleReplaceClick}
            disabled={replacing}
            title={item.replaceLabel ?? "Reemplazar archivo"}
            aria-label={item.replaceLabel ?? "Reemplazar archivo"}
            className={`btn shrink-0 rounded-xl disabled:opacity-50 ${OUTLINE_BUTTON_CLASS}`}
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
const MAX_ADJUNTOS_SOLICITUD = 10;

type AddAdjuntosSolicitudButtonProps = {
  avalId: number;
  currentCount: number;
  onUpdated: (aval: Aval) => void;
  onError: (message: string) => void;
};

function AddAdjuntosSolicitudButton({
  avalId,
  currentCount,
  onUpdated,
  onError,
}: AddAdjuntosSolicitudButtonProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const remaining = Math.max(MAX_ADJUNTOS_SOLICITUD - currentCount, 0);
  const canUpload = remaining > 0 && !uploading;

  const handleClick = () => {
    if (!canUpload) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    if (files.length === 0) return;
    if (files.length > remaining) {
      onError(
        `Solo puedes agregar ${remaining} archivo${remaining === 1 ? "" : "s"} más.`,
      );
      return;
    }

    try {
      setUploading(true);
      const updated = await uploadAdjuntosSolicitud(avalId, files).then(
        (r) => r.data,
      );
      onUpdated(updated);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "No se pudieron subir los adjuntos";
      onError(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mt-4">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={DOCUMENT_ACTION_ACCEPTED_TYPES}
        multiple
        onChange={handleFileChange}
      />
      <button
        type="button"
        onClick={handleClick}
        disabled={!canUpload}
        className={`btn w-full justify-center rounded-xl border-dashed disabled:cursor-not-allowed disabled:opacity-50 ${OUTLINE_BUTTON_CLASS}`}
      >
        {uploading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Upload className="mr-2 h-4 w-4" />
        )}
        {uploading ? "Subiendo adjuntos..." : "Agregar archivos adjuntos"}
      </button>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        {currentCount}/{MAX_ADJUNTOS_SOLICITUD} adjuntos de solicitud.
      </p>
    </div>
  );
}

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
    <li className="flex items-center gap-2 rounded-xl border border-slate-200/70 bg-slate-50/60 px-3 py-2 text-sm dark:border-slate-700/60 dark:bg-slate-900/40">
      <a
        href={adjunto.url}
        target="_blank"
        rel="noreferrer noopener"
        download
        className="flex-1 min-w-0 flex items-center gap-2 hover:text-indigo-600 dark:hover:text-indigo-400"
        title={`Descargar ${adjunto.nombreOriginal}`}
      >
        <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
        <span className="truncate font-medium text-slate-900 dark:text-slate-100">
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
            className="p-1 text-slate-500 hover:text-indigo-600 disabled:opacity-50 dark:text-slate-400 dark:hover:text-indigo-400"
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
            className="p-1 text-slate-500 hover:text-rose-600 disabled:opacity-50 dark:text-slate-400 dark:hover:text-rose-400"
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
  const canEditAvalFiles = isTrainerUser(user) || isAdminLike;
  const canRegeneratePdfs =
    isAdminLike || isPdaUser(user) || isMetodologoUser(user) || isDTMUser(user);

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
  const isAvalCompleto = isAvalFlowApproved(aval);
  const pendingEtapa = normalizeEtapaFlujo(aval?.siguienteEtapa);
  const displayCurrentEtapa = isAvalCompleto
    ? getFinalApprovalStageForAval(aval)
    : aval?.estado === "BORRADOR"
      ? currentEtapa
      : pendingEtapa ?? currentEtapa;
  const currentStageLabel = isAvalCompleto
    ? "Aprobado"
    : getApprovalStageLabel(displayCurrentEtapa);

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

  const { config: formConfig } = useAvalFormConfig(aval);

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-1/3 rounded-lg bg-slate-200 dark:bg-slate-700" />
          <div className="h-64 rounded-2xl bg-slate-200 dark:bg-slate-700" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="h-32 rounded-2xl bg-slate-200 dark:bg-slate-700" />
            <div className="h-32 rounded-2xl bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !aval) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-7xl mx-auto">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error ?? "Aval no encontrado"}
        </div>
        <div className="mt-4">
          <Link
            href="/avales"
            className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
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
  // Clasificación del evento. Se muestra solo acá, como fila de chips: antes
  // estaban además repetidos campo por campo en la grilla de datos de abajo, y
  // dos representaciones del mismo dato en la misma tarjeta se leen como si
  // fueran datos distintos.
  //
  // Cada chip conserva su rótulo en `title` y en texto solo para lectores de
  // pantalla, que es lo que la grilla aportaba de más.
  const eventBadges: Array<{ label: string; value: string; tone: PastelTone }> =
    evento
      ? (
          [
            { label: "Tipo", value: evento.tipoEvento, tone: "indigo" },
            {
              label: "Participación",
              value: getEventoTipoParticipacionLabel(evento.tipoParticipacion),
              tone: "sky",
            },
            {
              label: "Disciplina",
              value: evento.disciplina?.nombre,
              tone: "emerald",
            },
            {
              label: "Categoría",
              value: formatCategoryLabel(
                evento.categoria?.nombre ?? evento.categoriaCodigo,
                "",
              ),
              tone: "amber",
            },
            { label: "Alcance", value: evento.alcance, tone: "slate" },
            { label: "Género", value: generoEtiqueta, tone: "slate" },
          ] as Array<{
            label: string;
            value?: string | null;
            tone: PastelTone;
          }>
        )
          .filter((chip) => Boolean(chip.value?.trim()))
          .map((chip) => ({ ...chip, value: chip.value as string }))
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
    aval.numeroAval || aval.avalTecnico?.numeroAval || aval.numeroColeccion
      ? `Solicitud ${formatSolicitudNumber(
          aval.numeroAval ?? aval.avalTecnico?.numeroAval ?? aval.numeroColeccion,
        )}.`
      : null,
    !hasRealDates && evento
      ? `Programación: ${formatEventScheduleLabel(evento)}.`
      : null,
    duration
      ? `Duración estimada: ${duration} ${duration === 1 ? "día" : "días"}.`
      : null,
    // La cuenta regresiva NO va como frase acá: se muestra con el mismo badge
    // que la ficha de programación, para que el dato tenga una sola forma.
  ].filter((line): line is string => Boolean(line));
  const daysUntilBadge = getDaysUntilBadge(daysUntil);
  const canDownloadAvalCompleto = Boolean(aval.aval) || isAvalCompleto;
  const isAvalOwner =
    isTrainerUser(user) &&
    user?.id !== undefined &&
    (aval.userId === user.id ||
      aval.entrenadores.some((e) => e.entrenadorId === user.id));
  const canEditSolicitud =
    isAvalOwner &&
    (aval.estado === "BORRADOR" || currentEtapa === "SOLICITUD");
  const canDeleteSolicitud =
    isAvalOwner &&
    (aval.estado === "BORRADOR" ||
      (aval.estado === "SOLICITADO" && currentEtapa === "SOLICITUD"));
  const editSolicitudLabel = aval.avalTecnico ? "Editar aval" : "Crear aval";
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

  const cupos = getAvalCupos(aval);
  // `getAvalCupos` devuelve los campos crudos del evento o de la forma de
  // participación, y cualquiera puede venir sin definir. Sumarlos a secas da
  // NaN, y NaN no es nullish: un `?? "—"` en el render no lo atrapa nunca y
  // la tarjeta termina mostrando "NaN" al usuario.
  const totalEntrenadores =
    (cupos.numEntrenadoresHombres ?? 0) + (cupos.numEntrenadoresMujeres ?? 0);

  const deportistasList = aval.avalTecnico?.deportistasAval ?? [];
  const solicitudAvalUrl =
    aval.solicitudUrl ?? aval.avalTecnicoPdfUrl ?? aval.avalTecnico?.archivo;
  const documentActions: DocumentAction[] = [
    {
      label: "Descargar solicitud del aval",
      url: solicitudAvalUrl,
      icon: FileText,
      primary: true,
    },
    {
      label: "Descargar convocatoria",
      url: aval.convocatoriaUrl,
      icon: Download,
      replaceHandler: (files) =>
        uploadConvocatoriaPrincipal(aval.id, files[0]).then((r) => r.data),
      replaceLabel: "Reemplazar convocatoria",
    },
    {
      label: "Descargar certificado médico",
      url: aval.certificadoMedicoUrl,
      icon: HeartPulse,
      replaceHandler: (files) =>
        uploadCertificadoMedico(aval.id, files[0]).then((r) => r.data),
      replaceLabel: "Reemplazar certificado médico",
    },
    // El pronóstico no se ofrece acá: es la misma lista de deportistas que ya
    // se ve en su preview. Sigue disponible en el modal de armar PDF.
  ];
  const canShowPresupuestoPda =
    Boolean(aval.pda) &&
    ((aval.pda?.items?.length ?? 0) > 0 || Boolean(aval.pda?.notas));
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
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 dark:border-indigo-500/30 dark:bg-indigo-500/10">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2 text-sm text-indigo-800 dark:text-indigo-200">
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
            <div className="h-2 w-full overflow-hidden rounded-full bg-indigo-100 dark:bg-indigo-500/20">
              <div
                className="h-full bg-indigo-500 transition-all duration-300 ease-out"
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
            <h1 className="text-2xl font-bold text-slate-900 md:text-3xl dark:text-slate-100">
              Detalle del Aval
            </h1>
            {evento?.codigo && (
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Código del evento:{" "}
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {evento.codigo}
                  </span>
                </p>
                <CopyEventCodeButton codigo={evento.codigo} />
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            {canEditSolicitud && (
              <Link
                href={`/avales/${aval.id}/crear-solicitud`}
                className={`btn rounded-xl ${SOFT_INDIGO_BUTTON_CLASS}`}
              >
                <Pencil className="mr-2 h-4 w-4" />
                {editSolicitudLabel}
              </Link>
            )}
            {(canDeleteSolicitud || canDeleteAsAdmin) && (
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="btn rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {canDeleteAsAdmin ? "Eliminar aval" : "Eliminar solicitud"}
              </button>
            )}
            {canRegeneratePdfs && (
              <button
                type="button"
                onClick={handleRegeneratePdfs}
                disabled={regenerating}
                className={`btn rounded-xl disabled:cursor-not-allowed disabled:opacity-60 ${OUTLINE_BUTTON_CLASS}`}
                title="Regenera todos los PDFs ya emitidos (PDA, Compras, Metodólogo, DTM, Control Previo, Financiero, Aval Técnico, Aval Completo)"
              >
                {regenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                {regenerating
                  ? `Regenerando… ${regenerationProgress}%`
                  : "Regenerar PDFs"}
              </button>
            )}
            <button
              type="button"
              onClick={() => setComposerOpen(true)}
              className={`btn rounded-xl ${OUTLINE_BUTTON_CLASS}`}
              title="Vista previa o descarga combinada de documentos"
            >
              <FileText className="mr-2 h-4 w-4" />
              Documentos del aval
            </button>
            {/* Acción primaria de la página: es la única del header con
                relleno sólido. En pastel quedaría al mismo nivel que las
                cuatro secundarias de al lado y se perdería la jerarquía. */}
            {canDownloadAvalCompleto ? (
              <button
                type="button"
                onClick={handleDownloadAvalCompleto}
                disabled={downloadingAval}
                className={`btn rounded-xl ${PRIMARY_BUTTON_CLASS}`}
              >
                {downloadingAval ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                {downloadingAval ? "Descargando…" : "Descargar aval completo"}
              </button>
            ) : (
              <button
                type="button"
                disabled
                title="El aval completo estará disponible una vez aprobado en todas las etapas."
                className={`btn rounded-xl ${PRIMARY_BUTTON_CLASS} opacity-50`}
              >
                <Download className="mr-2 h-4 w-4" />
                Descargar aval completo
              </button>
            )}
          </div>
        </div>

        {/* Estado del aval */}
        <SectionCard>
          <StageTimeline
            currentStage={displayCurrentEtapa}
            flowStages={flowStages}
            historial={aval.historial}
            isAdmin={isAdminLike}
            avalId={aval.id}
            isDraft={aval.estado === "BORRADOR"}
            isApproved={isAvalCompleto}
          />
        </SectionCard>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {evento && (
              <CollapsibleSection
                title="Datos del evento"
                defaultOpen
                icon={<Trophy className="h-4 w-4" />}
                iconTone="indigo"
                meta={
                  evento.codigo ? (
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      Código: {evento.codigo}
                    </p>
                  ) : null
                }
              >
                <div className="space-y-5">
                  {/* Header: nombre completo + chips de clasificación */}
                  <div className="space-y-3">
                    <div className="min-w-0">
                      <h3 className="break-words text-lg font-bold text-slate-900 dark:text-slate-100">
                        {evento.nombre}
                      </h3>
                      {evento.codigo ? (
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          Evento {evento.codigo}
                        </p>
                      ) : null}
                    </div>
                    {eventBadges.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {eventBadges.map((badge) => (
                          <PastelBadge
                            key={badge.label}
                            tone={badge.tone}
                            title={badge.label}
                          >
                            <span className="sr-only">{badge.label}: </span>
                            {badge.value}
                          </PastelBadge>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {/* Programación */}
                  <div className="space-y-2">
                    <SectionLabel>Programación</SectionLabel>
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
                            value: daysUntilBadge?.text,
                            node: daysUntilBadge ? (
                              <PastelBadge tone={daysUntilBadge.tone}>
                                {daysUntilBadge.text}
                              </PastelBadge>
                            ) : null,
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
                    <SectionLabel className="flex items-center gap-1.5">
                      <MapPin className="h-3 w-3" aria-hidden="true" />
                      Ubicación
                    </SectionLabel>
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
                    <SectionLabel>Cupos</SectionLabel>
                    {/* Número grande: son las dos cifras que se buscan de un
                        vistazo, y al mismo cuerpo que el resto del texto
                        había que leerlas para encontrarlas. */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="flex items-center gap-3 rounded-xl border border-slate-200/70 bg-slate-50/60 px-4 py-3 dark:border-slate-700/60 dark:bg-slate-900/40">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-indigo-100 bg-indigo-50 text-indigo-600 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
                          <Users className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <SectionLabel>Total entrenadores</SectionLabel>
                          <p className="mt-0.5 text-2xl font-bold leading-none tabular-nums text-slate-900 dark:text-slate-100">
                            {totalEntrenadores || "—"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-xl border border-slate-200/70 bg-slate-50/60 px-4 py-3 dark:border-slate-700/60 dark:bg-slate-900/40">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                          <Trophy className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <SectionLabel>Deportistas seleccionados</SectionLabel>
                          <p className="mt-0.5 text-2xl font-bold leading-none tabular-nums text-slate-900 dark:text-slate-100">
                            {deportistasList.length || "—"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {aval.resumenCupos ? (
                      <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-200/70 bg-slate-50/60 px-3 py-3 dark:border-slate-700/60 dark:bg-slate-900/40">
                        <div className="text-center">
                          <SectionLabel>Total</SectionLabel>
                          <p className="mt-0.5 text-sm font-bold tabular-nums text-slate-800 dark:text-slate-200">
                            {aval.resumenCupos.total}
                          </p>
                        </div>
                        <div className="text-center">
                          <SectionLabel>Cubiertos</SectionLabel>
                          <p className="mt-0.5 text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                            {aval.resumenCupos.cubiertos}
                          </p>
                        </div>
                        <div className="text-center">
                          <SectionLabel>Solo resultado</SectionLabel>
                          <p className="mt-0.5 text-sm font-bold tabular-nums text-indigo-700 dark:text-indigo-400">
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
              icon={<FileText className="h-4 w-4" />}
              iconTone="indigo"
              meta={
                <p className="text-xs text-slate-500 dark:text-slate-400">
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
                        aval.numeroAval ??
                          aval.avalTecnico?.numeroAval ??
                          aval.numeroColeccion,
                      ),
                    },
                  ]}
                />

                {aval.descripcion ? (
                  <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 px-4 py-3 dark:border-slate-700/60 dark:bg-slate-900/40">
                    <SectionLabel>Descripción</SectionLabel>
                    <p className="mt-1 whitespace-pre-line text-sm text-slate-800 dark:text-slate-200">
                      {aval.descripcion}
                    </p>
                  </div>
                ) : null}

                {aval.comentario ? (
                  <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 px-4 py-3 dark:border-slate-700/60 dark:bg-slate-900/40">
                    <SectionLabel>Comentario</SectionLabel>
                    <p className="mt-1 whitespace-pre-line text-sm text-slate-800 dark:text-slate-200">
                      {aval.comentario}
                    </p>
                  </div>
                ) : null}

                {aval.avalTecnico ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 p-1.5 text-slate-600 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-300"
                        aria-hidden="true"
                      >
                        <Users className="h-4 w-4" />
                      </span>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
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
                          <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-4 dark:border-slate-700/60 dark:bg-slate-900/40">
                            <SectionLabel className="mb-2">Objetivos</SectionLabel>
                            <ol className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                              {aval.avalTecnico.objetivos
                                .slice()
                                .sort((a, b) => a.orden - b.orden)
                                .map((objetivo) => (
                                  <li key={objetivo.id} className="flex gap-2">
                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
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
                          <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-4 dark:border-slate-700/60 dark:bg-slate-900/40">
                            <SectionLabel className="mb-2">Criterios</SectionLabel>
                            <ol className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                              {aval.avalTecnico.criterios
                                .slice()
                                .sort((a, b) => a.orden - b.orden)
                                .map((criterio) => (
                                  <li key={criterio.id} className="flex gap-2">
                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
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
                      <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
                        Este aval incluye participantes solo por resultados dentro del mismo expediente.
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </CollapsibleSection>

            {canShowPresupuestoPda && (presupuestoSection?.visible ?? true) ? (
              <CollapsibleSection
                title="Presupuesto de salida"
                defaultOpen
                icon={<DollarSign className="h-4 w-4" />}
                iconTone="emerald"
                meta={
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Detalle y notas del presupuesto de salida.
                  </p>
                }
              >
                <AvalPresupuestoPdaSection aval={aval} />
              </CollapsibleSection>
            ) : null}
          </div>

          <div className="space-y-4 lg:sticky lg:top-6 self-start">
            <SectionCard
              title="Contrato aval"
              icon={<DollarSign className="h-4 w-4" />}
              iconTone="emerald"
            >
              <dl className="grid gap-3">
                <div>
                  <SectionLabel as="dt">Tipo</SectionLabel>
                  <dd className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">
                    {getTipoAvalLabel(aval.tipoAval)}
                  </dd>
                </div>
                {typeof aval.montoSolicitado === "number" ? (
                  <div>
                    <SectionLabel as="dt">Monto solicitado</SectionLabel>
                    <dd className="mt-1 text-sm font-bold tabular-nums text-slate-800 dark:text-slate-200">
                      {formatCurrency(aval.montoSolicitado)}
                    </dd>
                  </div>
                ) : null}
                {typeof aval.montoAsignado === "number" ? (
                  <div>
                    <SectionLabel as="dt">Monto asignado</SectionLabel>
                    <dd className="mt-1 text-sm font-bold tabular-nums text-slate-800 dark:text-slate-200">
                      {formatCurrency(aval.montoAsignado)}
                    </dd>
                  </div>
                ) : null}
                {aval.presupuesto ? (
                  <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 px-3 py-3 dark:border-slate-700/60 dark:bg-slate-900/40">
                    <SectionLabel>Presupuesto por fuente</SectionLabel>
                    <div className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                      <p>Fuente: {getTipoAvalLabel(aval.presupuesto.fuente ?? aval.tipoAval)}</p>
                      <p>Asignado: {formatCurrency(aval.presupuesto.asignado)}</p>
                      <p>Comprometido: {formatCurrency(aval.presupuesto.comprometido)}</p>
                      <p>Disponible: {formatCurrency(aval.presupuesto.disponible)}</p>
                    </div>
                  </div>
                ) : null}
              </dl>
            </SectionCard>

            {summaryLines.length > 0 || daysUntilBadge ? (
              <SectionCard
                title="Resumen"
                icon={<FileText className="h-4 w-4" />}
                iconTone="sky"
              >
                <ul className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
                  {summaryLines.slice(0, 5).map((line) => (
                    <li key={line} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300 dark:bg-slate-600" />
                      <span className="flex-1">{line}</span>
                    </li>
                  ))}
                  {/* Mismo badge que la ficha de programación: es el mismo
                      dato y no debería tener dos caras. */}
                  {daysUntilBadge ? (
                    <li className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300 dark:bg-slate-600" />
                      <span className="flex-1">
                        <PastelBadge tone={daysUntilBadge.tone}>
                          {daysUntilBadge.text}
                        </PastelBadge>
                      </span>
                    </li>
                  ) : null}
                </ul>
              </SectionCard>
            ) : null}

            <SectionCard
              title="Documentos"
              icon={<Download className="h-4 w-4" />}
              iconTone="indigo"
            >
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

              {canEditAvalFiles && (
                <AddAdjuntosSolicitudButton
                  avalId={aval.id}
                  currentCount={aval.adjuntosSolicitud?.length ?? 0}
                  onUpdated={(updated) => {
                    setAval(updated);
                    setToast({
                      variant: "success",
                      message: "Adjuntos agregados correctamente.",
                    });
                  }}
                  onError={(message) => setToast({ variant: "error", message })}
                />
              )}

              {(aval.adjuntosSolicitud?.length ?? 0) > 0 && (
                <div className="mt-4">
                  <SectionLabel className="mb-2">Adjuntos de solicitud</SectionLabel>
                  <ul className="space-y-2">
                    {aval.adjuntosSolicitud.map((adj) => (
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

              {/* Adicionales de convocatoria — editables individualmente */}
              {(aval.convocatoriaAdjuntos?.length ?? 0) > 0 && (
                <div className="mt-4">
                  <SectionLabel className="mb-2">Convocatorias adicionales</SectionLabel>
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
                  <SectionLabel className="mb-2">Pronósticos de deportistas adicionales</SectionLabel>
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
            </SectionCard>
          </div>
        </div>
      </div>

      {aval.historial.length > 0 ? (
        <div className="px-4 sm:px-6 lg:px-8 pb-8 w-full max-w-7xl mx-auto">
          <CollapsibleSection
            title="Historial de aprobación"
            icon={<FileText className="h-4 w-4" />}
            iconTone="slate"
            meta={
              <p className="text-xs text-slate-500 dark:text-slate-400">
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
            comprasPublicas: aval.comprasPublicasPdfUrl,
            avalTecnico: aval.avalTecnicoPdfUrl,
            pronosticoDeportistas: aval.pronosticoDeportistasUrl,
            certificacionPresupuestaria: aval.certificacionPresupuestariaUrl,
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
