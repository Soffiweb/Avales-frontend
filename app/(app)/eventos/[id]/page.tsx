"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Trophy,
  Tag,
  Globe,
  Pencil,
  Trash2,
  FileText,
  Clock,
  UserCheck,
  Upload,
  ClipboardEdit,
  History,
  Download,
  ChevronDown,
} from "lucide-react";

import AlertBanner from "@/components/ui/alert-banner";
import AvalUploadOptions from "@/components/ui/aval-upload-options";
import Breadcrumb from "@/components/ui/breadcrumb";
import ConfirmModal from "@/components/ui/confirm-modal";
import EventoIncompletoBadge from "@/components/ui/evento-incompleto-badge";
import UploadModal from "@/components/ui/upload-modal";
import { getEvento, softDeleteEvento } from "@/lib/api/eventos";
import { getAvalesByEvento, uploadConvocatoria } from "@/lib/api/avales";
import { downloadEventsTemplate } from "@/lib/api/template-download";
import {
  canAccessReforms,
  canCreateReforma,
  canManageEvents as canManageEventsCheck,
  isAdminUser,
  isDTMUser,
  isPdaUser,
  isTrainerUser,
} from "@/lib/auth/access";
import { listReformsByEvento } from "@/lib/api/reforms";
import {
  getEventoMissingFieldLabel,
  getEventoMissingFields,
  isEventoIncompleto,
  type Evento,
} from "@/types/evento";
import type { Aval, TipoAval } from "@/types/aval";
import { useAuth } from "@/app/providers/auth-provider";
import {
  formatCurrency,
  formatDateInput,
  formatGenero,
  formatEventScheduleLabel,
  formatMonth,
  getCalendarDayDiff,
} from "@/lib/utils/formatters";
import { formatCategoryLabel } from "@/lib/utils/categories";
import {
  getEventoTipoParticipacionLabel,
  getTipoAvalLabel,
} from "@/lib/constants";
import { getFormasParticipacionConOcupacion } from "@/lib/utils/aval-collections";

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> =
  {
    DISPONIBLE: {
      bg: "bg-green-50 dark:bg-green-900/20",
      text: "text-green-700 dark:text-green-300",
      dot: "bg-green-500",
    },
    SOLICITADO: {
      bg: "bg-amber-50 dark:bg-amber-900/20",
      text: "text-amber-700 dark:text-amber-300",
      dot: "bg-amber-500",
    },
    RECHAZADO: {
      bg: "bg-rose-50 dark:bg-rose-900/20",
      text: "text-rose-700 dark:text-rose-300",
      dot: "bg-rose-500",
    },
    ACEPTADO: {
      bg: "bg-sky-50 dark:bg-sky-900/20",
      text: "text-sky-700 dark:text-sky-300",
      dot: "bg-sky-500",
    },
  };

function getStatusStyles(status?: string | null) {
  if (!status)
    return {
      bg: "bg-gray-50 dark:bg-gray-800/50",
      text: "text-gray-700 dark:text-gray-300",
      dot: "bg-gray-400",
    };
  return (
    STATUS_STYLES[status.toUpperCase()] ?? {
      bg: "bg-gray-50 dark:bg-gray-800/50",
      text: "text-gray-700 dark:text-gray-300",
      dot: "bg-gray-400",
    }
  );
}

function getDaysUntilEvent(fechaInicio?: string | null) {
  if (!fechaInicio) return null;
  return getCalendarDayDiff(
    formatDateInput(new Date().toISOString()),
    fechaInicio,
  );
}

function getEventDuration(
  fechaInicio?: string | null,
  fechaFin?: string | null,
) {
  if (!fechaInicio || !fechaFin) return null;
  const diff = getCalendarDayDiff(fechaInicio, fechaFin);
  return diff === null ? null : diff + 1;
}

export default function EventoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const canManageEvents = canManageEventsCheck(user);
  const canEditEvents = canManageEvents || isPdaUser(user);
  const canEditCompletionFields = isTrainerUser(user);
  const canShowEditButton = canEditEvents || canEditCompletionFields;
  const isDTM = isDTMUser(user);
  const canCreateAval = isTrainerUser(user) || isAdminUser(user);
  const id = Number(params.id);

  const [evento, setEvento] = useState<Evento | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [tipoAval, setTipoAval] = useState<TipoAval>("FONDOS_PUBLICOS");
  const [formaParticipacionId, setFormaParticipacionId] = useState<
    number | null
  >(null);
  const [avalesEvento, setAvalesEvento] = useState<Aval[]>([]);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [pendingReformId, setPendingReformId] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id || Number.isNaN(id)) {
      setError("ID de evento inválido");
      setLoading(false);
      return;
    }

    async function fetchEvento() {
      try {
        setLoading(true);
        const eventoRes = await getEvento(id);
        setEvento(eventoRes.data);
        try {
          const avalesRes = await getAvalesByEvento(id);
          setAvalesEvento(avalesRes.data ?? []);
        } catch {
          setAvalesEvento([]);
        }
      } catch (err: any) {
        setError(err?.message ?? "No se pudo cargar el evento.");
      } finally {
        setLoading(false);
      }
    }

    void fetchEvento();
  }, [id]);

  useEffect(() => {
    const eventoId = evento?.id;

    if (!eventoId || !evento?.tieneReformaPendiente) {
      setPendingReformId(null);
      return;
    }
    const safeEventoId = eventoId;

    async function fetchPendingReform() {
      try {
        const response = await listReformsByEvento(safeEventoId, "PENDIENTE");
        setPendingReformId(response.data?.[0]?.id ?? null);
      } catch {
        setPendingReformId(null);
      }
    }

    void fetchPendingReform();
  }, [evento?.id, evento?.tieneReformaPendiente]);

  const handleDelete = async () => {
    if (!evento) return;
    try {
      setDeleting(true);
      await softDeleteEvento(evento.id);
      router.push("/eventos?status=deleted");
    } catch (err: any) {
      setError(err?.message ?? "No se pudo eliminar el evento.");
      setConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      setDownloadingTemplate(true);
      await downloadEventsTemplate();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo descargar la plantilla.",
      );
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleUploadConvocatoria = async ({
    convocatoria,
    certificadoMedico,
    pronosticoDeportistas,
  }: {
    convocatoria: File;
    certificadoMedico: File;
    pronosticoDeportistas: File[];
  }) => {
    if (!evento) throw new Error("No se ha seleccionado un evento.");
    if (isEventoIncompleto(evento)) {
      router.push(
        `/eventos/${evento.id}/editar?mode=complete&next=${encodeURIComponent(
          `/eventos/${evento.id}`,
        )}`,
      );
      throw new Error(
        "Completa los datos faltantes del evento antes de crear el aval.",
      );
    }

    // if (!eventoTieneFondosPublicos(evento) && tipoAval === "FONDOS_PUBLICOS") {
    //   throw new Error(
    //     "Este evento no tiene presupuesto. Solo puedes crear avales por autogestión o solo resultados.",
    //   );
    // }

    const response = await uploadConvocatoria(
      evento.id,
      convocatoria,
      certificadoMedico,
      pronosticoDeportistas,
      { tipoAval, formaParticipacionId: formaParticipacionId ?? undefined },
    );
    setUploadModalOpen(false);
    router.push(`/avales/${response.data.id}/crear-solicitud`);
  };

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-5xl mx-auto">
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

  if (error || !evento) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-5xl mx-auto">
        <div className="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl p-6 text-center">
          {error ?? "Evento no encontrado"}
        </div>
        <div className="mt-4">
          <Link
            href="/eventos"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a eventos
          </Link>
        </div>
      </div>
    );
  }

  const statusStyles = getStatusStyles(evento.estado);
  const hasRealDates = Boolean(evento.fechaInicio && evento.fechaFin);
  const daysUntil = hasRealDates ? getDaysUntilEvent(evento.fechaInicio) : null;
  const duration = hasRealDates
    ? getEventDuration(evento.fechaInicio, evento.fechaFin)
    : null;

  const formasParticipacion = evento.formasParticipacion ?? [];
  const hasPendingReform = Boolean(evento.tieneReformaPendiente);
  const eventoIncompleto = isEventoIncompleto(evento);
  const missingFields = getEventoMissingFields(evento);
  const canManageReforms = canCreateReforma(user) && !isDTM;
  const canViewReforms = canAccessReforms(user) || isDTM || isTrainerUser(user);
  // Un evento es "creable" mientras exista al menos una forma de participación
  // sin aval asociado. Cada forma de participación solo admite un aval.
  const formasConOcupacion = getFormasParticipacionConOcupacion(
    formasParticipacion,
    avalesEvento,
  );
  const tiposCreables = (
    ["FONDOS_PUBLICOS", "AUTOGESTION", "SOLO_RESULTADO"] as const
  ).filter((tipo) =>
    formasConOcupacion.some((forma) => forma.tipoAval === tipo && !forma.ocupada),
  );
  const canStartAval =
    canCreateAval &&
    tiposCreables.length > 0 &&
    !hasPendingReform &&
    !eventoIncompleto;
  const formasDelTipoSeleccionado = formasConOcupacion.filter(
    (forma) => forma.tipoAval === tipoAval,
  );
  const submitDisabled =
    formasDelTipoSeleccionado.length > 0 && formaParticipacionId == null;
  const canRequestReforma = canManageReforms && !hasPendingReform;
  const completionHref = `/eventos/${evento.id}/editar?mode=complete&next=${encodeURIComponent(
    `/eventos/${evento.id}`,
  )}`;

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
      {submitError && (
        <div className="fixed top-4 right-4 z-50 max-w-sm w-full drop-shadow-lg">
          <AlertBanner
            variant="error"
            message={submitError}
            onClose={() => setSubmitError(null)}
          />
        </div>
      )}
      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUpload={handleUploadConvocatoria}
        title="Subir documentos obligatorios"
        description={`Sube la convocatoria y el certificado médico para crear el aval de "${evento.nombre}".`}
        submitDisabled={submitDisabled}
        submitDisabledReason="Selecciona una forma de participación para continuar."
      >
        <AvalUploadOptions
          evento={evento}
          avalesEvento={avalesEvento}
          tipoAval={tipoAval}
          onTipoAvalChange={setTipoAval}
          formaParticipacionId={formaParticipacionId}
          onFormaParticipacionChange={setFormaParticipacionId}
        />
      </UploadModal>

      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-8xl mx-auto space-y-6">
        {hasPendingReform ? (
          <AlertBanner
            variant="error"
            message="Este evento tiene una reforma pendiente."
            description={
              pendingReformId
                ? "Puedes revisar el detalle de la solicitud registrada."
                : undefined
            }
          />
        ) : null}
        {eventoIncompleto ? (
          <div className="rounded-sm border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-800/70 dark:bg-amber-900/30 dark:text-amber-100">
            <p className="text-sm font-medium">
              Este evento tiene datos faltantes y no puede usarse para crear
              aval todavía.
            </p>
            <p className="mt-1 text-xs opacity-80">
              Completa:{" "}
              {missingFields.map(getEventoMissingFieldLabel).join(", ")}.
            </p>
          </div>
        ) : null}
        <section className="space-y-4">
          <div>
            <div className="mb-2">
              <Breadcrumb
                items={[
                  { label: "Eventos", href: "/eventos" },
                  { label: evento.nombre },
                ]}
              />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Datos del evento
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Información general del evento.
            </p>
          </div>

          {canShowEditButton && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2.5 shadow-sm flex flex-wrap items-center gap-2 ml-auto w-fit">
              {canEditEvents && (
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  disabled={downloadingTemplate}
                  className="inline-flex items-center rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 transition hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {downloadingTemplate ? "Descargando..." : "Plantilla"}
                </button>
              )}
              <Link
                href={`/eventos/${evento.id}/editar`}
                className="inline-flex items-center rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 transition hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <Pencil className="w-4 h-4 mr-2" />
                Editar
              </Link>
              {canManageEvents && (
                <button
                  type="button"
                  onClick={() => setConfirmOpen(true)}
                  className="inline-flex items-center rounded-lg border border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-900/20 px-4 py-2 text-sm font-medium text-rose-700 dark:text-rose-300 transition hover:bg-rose-100 dark:hover:bg-rose-900/30"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar
                </button>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
                {evento.nombre}
              </h1>
              {eventoIncompleto ? (
                <div className="mt-2">
                  <EventoIncompletoBadge />
                </div>
              ) : null}
              {evento.codigo && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Código: {evento.codigo}
                </p>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${statusStyles.bg}`}
              >
                <span className={`w-2 h-2 rounded-full ${statusStyles.dot}`} />
                <span className={`font-medium ${statusStyles.text}`}>
                  {evento.estado || "Sin estado"}
                </span>
              </div>
              {hasPendingReform ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-sm font-medium">
                  Reforma pendiente
                </span>
              ) : null}
              {evento.alcance && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm">
                  <Globe className="w-3.5 h-3.5" />
                  {evento.alcance}
                </span>
              )}
              {evento.tipoEvento && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-sm">
                  <Trophy className="w-3.5 h-3.5" />
                  {evento.tipoEvento}
                </span>
              )}
              {evento.tipoParticipacion && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-sm">
                  <UserCheck className="w-3.5 h-3.5" />
                  {getEventoTipoParticipacionLabel(evento.tipoParticipacion) ??
                    evento.tipoParticipacion}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Fechas */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 shadow-sm p-5 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <Calendar className="w-5 h-5 text-gray-400" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Fechas
                </h3>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">
                    Programación
                  </p>
                  <p className="text-gray-900 dark:text-gray-100 font-medium">
                    {formatEventScheduleLabel(evento)}
                  </p>
                </div>
                {duration && (
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-gray-500 dark:text-gray-400">Duración</p>
                    <p className="text-gray-900 dark:text-gray-100 font-medium">
                      {duration} {duration === 1 ? "día" : "días"}
                    </p>
                  </div>
                )}
                {daysUntil !== null && daysUntil >= 0 && (
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700">
                      <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      <span className="text-gray-700 dark:text-gray-300 font-medium text-sm">
                        {daysUntil === 0
                          ? "¡Hoy!"
                          : daysUntil === 1
                            ? "Mañana"
                            : `En ${daysUntil} días`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Ubicación */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 shadow-sm p-5 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <MapPin className="w-5 h-5 text-gray-400" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Ubicación
                </h3>
              </div>
              <div className="space-y-3 text-sm">
                {evento.lugar && (
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Lugar</p>
                    <p className="text-gray-900 dark:text-gray-100 font-medium">
                      {evento.lugar}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Ciudad</p>
                  <p className="text-gray-900 dark:text-gray-100 font-medium">
                    {evento.ciudad || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Provincia</p>
                  <p className="text-gray-900 dark:text-gray-100 font-medium">
                    {evento.provincia || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">País</p>
                  <p className="text-gray-900 dark:text-gray-100 font-medium">
                    {evento.pais || "-"}
                  </p>
                </div>
              </div>
            </div>

            {/* Categoría y Disciplina */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 shadow-sm p-5 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <Tag className="w-5 h-5 text-gray-400" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Clasificación
                </h3>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Disciplina</p>
                  <p className="text-gray-900 dark:text-gray-100 font-medium">
                    {evento.disciplina?.nombre || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Categoría</p>
                  <p className="text-gray-900 dark:text-gray-100 font-medium">
                    {formatCategoryLabel(
                      evento.categoria?.nombre ?? evento.categoriaCodigo,
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Género</p>
                  <p className="text-gray-900 dark:text-gray-100 font-medium">
                    {formatGenero(evento.genero)}
                  </p>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 shadow-sm p-5 dark:border-gray-700 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <FileText className="w-5 h-5 text-gray-400" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Acciones
                </h3>
              </div>
              <div className="flex flex-col gap-2 flex-1">
                {canCreateAval && (
                  <>
                    {eventoIncompleto ? (
                      <Link
                        href={completionHref}
                        className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-amber-600"
                      >
                        <Upload className="w-4 h-4 shrink-0" />
                        <span>Completar datos para aval</span>
                      </Link>
                    ) : canStartAval ? (
                      <button
                        type="button"
                        onClick={() => setUploadModalOpen(true)}
                        className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
                      >
                        <Upload className="w-4 h-4 shrink-0" />
                        <span>Crear aval</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 px-4 py-2.5 text-sm font-medium text-gray-500 dark:text-gray-300 cursor-not-allowed"
                      >
                        <Upload className="w-4 h-4 shrink-0" />
                        <span>
                          {hasPendingReform
                            ? "Bloqueado por reforma pendiente"
                            : "No disponible para crear aval"}
                        </span>
                      </button>
                    )}
                  </>
                )}
                {canManageReforms && canRequestReforma && (
                  <Link
                    href={`/eventos/${evento.id}/reforma`}
                    className="flex items-center gap-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-4 py-2.5 text-sm font-medium text-amber-700 dark:text-amber-300 transition hover:bg-amber-100 dark:hover:bg-amber-900/30"
                  >
                    <ClipboardEdit className="w-4 h-4 shrink-0" />
                    <span>Solicitar reforma</span>
                  </Link>
                )}
                {hasPendingReform && pendingReformId && (
                  <Link
                    href={`/reformas/${pendingReformId}`}
                    className="flex items-center gap-2 rounded-lg border border-amber-300 dark:border-amber-700 px-4 py-2.5 text-sm font-medium text-amber-700 dark:text-amber-300 transition hover:bg-amber-50 dark:hover:bg-amber-900/20"
                  >
                    <ClipboardEdit className="w-4 h-4 shrink-0" />
                    <span>Ver reforma</span>
                  </Link>
                )}
                {canViewReforms && (
                  <Link
                    href={`/eventos/${evento.id}/historial`}
                    className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 transition hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <History className="w-4 h-4 shrink-0" />
                    <span>Historial</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>

        <hr className="border-gray-300 dark:border-gray-800" />

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Participación y avales
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Formas de participación y avales asociados por tipo.
            </p>
          </div>

          <div className="space-y-4">
            {(["FONDOS_PUBLICOS", "AUTOGESTION", "SOLO_RESULTADO"] as const).map((tipoAval) => {
              const formasPorTipo = formasParticipacion.filter(
                (forma) => forma.tipoAval === tipoAval,
              );
              const avalesPorTipo = avalesEvento.filter(
                (aval) => aval.tipoAval === tipoAval,
              );

              const mensajeSinPlan = {
                FONDOS_PUBLICOS: "El presente evento no tiene ninguna planificación para participar mediante fondos públicos.",
                AUTOGESTION: "El presente evento no tiene ninguna planificación para participar mediante fondos de autogestión de la federación.",
                SOLO_RESULTADO: "El presente evento no tiene ninguna planificación para participar solo por resultados.",
              }[tipoAval];

              const accentBar = {
                FONDOS_PUBLICOS: "bg-blue-500",
                AUTOGESTION: "bg-emerald-500",
                SOLO_RESULTADO: "bg-amber-500",
              }[tipoAval];

              return (
                <details
                  key={tipoAval}
                  open
                  className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
                >
                  <summary className="flex list-none cursor-pointer items-center gap-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white px-5 py-4 transition-colors hover:bg-gray-100/50 dark:border-gray-700 dark:from-gray-900/40 dark:to-gray-800 dark:hover:bg-gray-800/60">
                    <div className={`h-10 w-1 shrink-0 rounded-full ${accentBar}`} />
                    <div className="flex flex-1 flex-wrap items-center gap-2">
                      <span className="text-base font-bold text-gray-900 dark:text-gray-100">
                        {getTipoAvalLabel(tipoAval)}
                      </span>
                      {avalesPorTipo.length > 0 ? (
                        <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
                          {avalesPorTipo.length} {avalesPorTipo.length === 1 ? "aval" : "avales"}
                        </span>
                      ) : formasPorTipo.length > 0 ? (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                          Sin aval
                        </span>
                      ) : null}
                    </div>
                    <ChevronDown className="h-5 w-5 shrink-0 text-gray-400 transition-transform group-open:rotate-180" />
                  </summary>

                  <div className="p-5">
                    {formasPorTipo.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {mensajeSinPlan}
                      </p>
                    ) : (
                      <div className="space-y-6">
                        {formasPorTipo.map((forma) => {
                          const totalAtletas =
                            forma.numAtletasHombres + forma.numAtletasMujeres;
                          const totalEntrenadores =
                            forma.numEntrenadoresHombres + forma.numEntrenadoresMujeres;
                          const totalDelegacion = totalAtletas + totalEntrenadores;
                          const items = forma.items ?? [];
                          // "Disponible" por item = presupuesto asignado − comprometido − ejecutado.
                          // El total que mostramos al usuario es la suma de disponibles, no del
                          // presupuesto bruto: así cuando un aval ya se aprobó (y el monto quedó
                          // comprometido o ejecutado), el evento refleja que ya no hay esos fondos.
                          const itemsConDisponible = items.map((item) => {
                            const asignado = Number.parseFloat(item.presupuesto) || 0;
                            const comprometido =
                              Number.parseFloat(item.montoComprometido ?? "0") || 0;
                            const ejecutado =
                              Number.parseFloat(item.montoEjecutado ?? "0") || 0;
                            return {
                              ...item,
                              asignado,
                              comprometido,
                              ejecutado,
                              disponible: asignado - comprometido - ejecutado,
                            };
                          });
                          const totalDisponible = itemsConDisponible.reduce(
                            (sum, item) => sum + item.disponible,
                            0,
                          );
                          const totalAsignado = itemsConDisponible.reduce(
                            (sum, item) => sum + item.asignado,
                            0,
                          );
                          const sinFinanciamiento = forma.tipoAval === "SOLO_RESULTADO";

                          return (
                            <div key={forma.id} className="space-y-4">
                              <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr_1.2fr]">
                                <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                                  <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Referencia</p>
                                  <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    {forma.referencia?.trim() || "-"}
                                  </p>
                                </div>
                                <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                                  <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Delegación</p>
                                  <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    {totalDelegacion} participantes
                                  </p>
                                  <div className="mt-3 grid gap-1 text-xs text-gray-500 dark:text-gray-400 sm:grid-cols-2">
                                    <span>Deportistas hombres: {forma.numAtletasHombres}</span>
                                    <span>Deportistas mujeres: {forma.numAtletasMujeres}</span>
                                    <span>Entrenadores/otros hombres: {forma.numEntrenadoresHombres}</span>
                                    <span>Entrenadores/otros mujeres: {forma.numEntrenadoresMujeres}</span>
                                  </div>
                                </div>
                                <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                                  <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Observación</p>
                                  <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">
                                    {forma.observacion?.trim() || "-"}
                                  </p>
                                </div>
                              </div>

                              <div>
                                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                  <div>
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Presupuesto</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {sinFinanciamiento
                                        ? "Participación sin financiamiento."
                                        : `${items.length} items presupuestarios`}
                                    </p>
                                  </div>
                                  {!sinFinanciamiento ? (
                                    <div className="text-right">
                                      <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                                        {formatCurrency(totalDisponible)}
                                      </p>
                                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                        Disponible · Asignado {formatCurrency(totalAsignado)}
                                      </p>
                                    </div>
                                  ) : null}
                                </div>
                                {sinFinanciamiento ? (
                                  <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-400">
                                    Este tipo de participación no registra presupuesto.
                                  </div>
                                ) : items.length > 0 ? (
                                  <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700/60">
                                    <table className="w-full">
                                      <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500 dark:bg-gray-900/30 dark:text-gray-400">
                                        <tr>
                                          <th className="px-4 py-3 text-left">Item</th>
                                          <th className="px-4 py-3 text-left">Actividad</th>
                                          <th className="px-4 py-3 text-left">Descripción</th>
                                          <th className="px-4 py-3 text-center">Mes</th>
                                          <th className="px-4 py-3 text-right">V. Unitario</th>
                                          <th className="px-4 py-3 text-right">Asignado</th>
                                          <th className="px-4 py-3 text-right">Disponible</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                                        {itemsConDisponible.map((eventoItem) => (
                                          <tr key={eventoItem.id} className="text-sm">
                                            <td className="px-4 py-3">
                                              <div className="font-medium text-gray-900 dark:text-gray-100">
                                                {eventoItem.item.numero}. {eventoItem.item.nombre}
                                              </div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                                              {eventoItem.item.actividad ? (
                                                <span>{eventoItem.item.actividad.numero}. {eventoItem.item.actividad.nombre}</span>
                                              ) : (
                                                <span className="text-gray-400">-</span>
                                              )}
                                            </td>
                                            <td className="max-w-xs truncate px-4 py-3 text-gray-600 dark:text-gray-300">
                                              {eventoItem.item.descripcion || "-"}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                              <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                                                {formatMonth(eventoItem.mes)}
                                              </span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">
                                              {eventoItem.valorUnitario
                                                ? formatCurrency(parseFloat(eventoItem.valorUnitario))
                                                : "-"}
                                            </td>
                                            <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">
                                              {formatCurrency(eventoItem.asignado)}
                                            </td>
                                            <td
                                              className={`px-4 py-3 text-right font-medium ${
                                                eventoItem.disponible <= 0
                                                  ? "text-rose-600 dark:text-rose-300"
                                                  : "text-gray-900 dark:text-gray-100"
                                              }`}
                                            >
                                              {formatCurrency(eventoItem.disponible)}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-400">
                                    No hay items presupuestarios registrados para este tipo de participación.
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        <div>
                          <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Avales</h3>
                          {avalesPorTipo.length > 0 ? (
                            <div className="space-y-3">
                              {avalesPorTipo.map((aval) => (
                                <div
                                  key={aval.id}
                                  className="w-fit min-w-[360px] max-w-xl rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/30"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                                          {aval.avalTecnico?.numeroAval?.trim() ||
                                            aval.numeroColeccion?.trim() ||
                                            `AV-${aval.id}`}
                                        </span>
                                        <span className="shrink-0 inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                          {aval.estado}
                                        </span>
                                        {aval.etapaActual && (
                                          <span className="shrink-0 inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                            {aval.etapaActual}
                                          </span>
                                        )}
                                      </div>
                                      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                                        <span>Deportistas: {aval.participantes?.length ?? 0}</span>
                                        <span>Entrenadores: {aval.entrenadores?.length ?? 0}</span>
                                        {aval.fechaEmision && (
                                          <span>Emisión: {new Date(aval.fechaEmision).toLocaleDateString()}</span>
                                        )}
                                        {aval.montoSolicitado != null && (
                                          <span>Solicitado: {formatCurrency(aval.montoSolicitado)}</span>
                                        )}
                                        {aval.montoAsignado != null && (
                                          <span>Asignado: {formatCurrency(aval.montoAsignado)}</span>
                                        )}
                                      </div>
                                      {aval.presupuesto && (
                                        <div className="mt-2 flex gap-3 text-xs text-gray-500 dark:text-gray-400">
                                          <span>Asignado: {formatCurrency(aval.presupuesto.asignado)}</span>
                                          <span>Comprometido: {formatCurrency(aval.presupuesto.comprometido)}</span>
                                          <span>Disponible: {formatCurrency(aval.presupuesto.disponible)}</span>
                                        </div>
                                      )}
                                      {aval.participantes && aval.participantes.length > 0 && (
                                        <div className="mt-2 truncate text-xs text-gray-400 dark:text-gray-500">
                                          {aval.participantes.slice(0, 3).map((p) => p.nombreCompleto).join(", ")}
                                          {aval.participantes.length > 3 && ` y ${aval.participantes.length - 3} más`}
                                        </div>
                                      )}
                                    </div>
                                    <Link
                                      href={`/avales/${aval.id}`}
                                      className="shrink-0 inline-flex items-center rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                                    >
                                      Ver detalle
                                    </Link>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Todavía no se ha creado ningún aval para este tipo de participación.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        </section>

        {/* Archivo adjunto */}
        {evento.archivo && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
                <FileText className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Archivo adjunto
              </h3>
            </div>
            <a
              href={evento.archivo}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              <FileText className="w-4 h-4" />
              Ver archivo
            </a>
          </div>
        )}


      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Eliminar evento"
        description={`¿Seguro que quieres eliminar el evento "${evento.nombre}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => {
          if (deleting) return;
          setConfirmOpen(false);
        }}
      />
    </>
  );
}
