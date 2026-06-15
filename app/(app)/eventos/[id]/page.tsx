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
  DollarSign,
  Upload,
  ClipboardEdit,
  History,
  Download,
  ChevronDown,
} from "lucide-react";

import AlertBanner from "@/components/ui/alert-banner";
import AvalCollectionList from "@/components/avales/aval-collection-list";
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
  getNormalizedRoles,
  isAdminUser,
  isDTMUser,
  isPdaUser,
  isTrainerUser,
} from "@/lib/auth/access";
import { listReformsByEvento } from "@/lib/api/reforms";
import {
  eventoTieneFormaParticipacion,
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
  canCreateCollectionByType,
} from "@/lib/utils/aval-collections";
import {
  getEventoTipoParticipacionLabel,
  getTipoAvalLabel,
} from "@/lib/constants";

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

export default function EventoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const userRoles = getNormalizedRoles(user);
  const canManageEvents = isAdminUser(user);
  const canEditEvents = isAdminUser(user) || isPdaUser(user);
  const canEditCompletionFields = isTrainerUser(user);
  const canShowEditButton = canEditEvents || canEditCompletionFields;
  const isDTM = isDTMUser(user);
  const canCreateAval = !userRoles.includes("COMPRAS_PUBLICAS") && !isDTM;
  const canManageCollectionActions = isTrainerUser(user);
  const id = Number(params.id);

  const [evento, setEvento] = useState<Evento | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [tipoAval, setTipoAval] = useState<TipoAval>("FONDOS_PUBLICOS");
  const [formaParticipacionId, setFormaParticipacionId] = useState<number | null>(null);
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

  useEffect(() => {
    if (!evento) return;
    if (!eventoTieneFormaParticipacion(evento, tipoAval)) {
      if (eventoTieneFormaParticipacion(evento, "FONDOS_PUBLICOS")) {
        setTipoAval("FONDOS_PUBLICOS");
        return;
      }

      if (eventoTieneFormaParticipacion(evento, "AUTOGESTION")) {
        setTipoAval("AUTOGESTION");
        return;
      }

      setTipoAval("SOLO_RESULTADO");
      return;
    }

    if (!canCreateCollectionByType(avalesEvento, tipoAval)) {
      setTipoAval("AUTOGESTION");
    }
  }, [avalesEvento, evento, tipoAval]);

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
    convocatoria: File[];
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
      throw new Error("Completa los datos faltantes del evento antes de crear el aval.");
    }

    if (!canCreateCollectionByType(avalesEvento, tipoAval)) {
      throw new Error(
        "Ya existe un aval activo de fondos públicos para este evento.",
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
  const tiposParticipacion: TipoAval[] = [
    "FONDOS_PUBLICOS",
    "AUTOGESTION",
    "SOLO_RESULTADO",
  ];
  const hasAval = avalesEvento.length > 0;
  const presupuestoPorFuente = avalesEvento.reduce<
    Record<
      string,
      { asignado: number; comprometido: number; disponible: number }
    >
  >((acc, aval) => {
    if (!aval.presupuesto) return acc;
    const fuente = aval.presupuesto.fuente ?? aval.tipoAval ?? "DESCONOCIDO";
    if (!acc[fuente])
      acc[fuente] = { asignado: 0, comprometido: 0, disponible: 0 };
    acc[fuente].asignado += aval.presupuesto.asignado;
    acc[fuente].comprometido += aval.presupuesto.comprometido;
    acc[fuente].disponible += aval.presupuesto.disponible;
    return acc;
  }, {});
  const hasPendingReform = Boolean(evento.tieneReformaPendiente);
  const eventoIncompleto = isEventoIncompleto(evento);
  const missingFields = getEventoMissingFields(evento);
  const canManageReforms = canCreateReforma(user) && !isDTM;
  const canViewReforms = canAccessReforms(user) || isDTM || isTrainerUser(user);
  const canStartAval =
    canCreateAval &&
    evento.estado === "DISPONIBLE" &&
    !hasPendingReform &&
    !eventoIncompleto;
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
      >
        <AvalUploadOptions
          evento={evento}
          avales={avalesEvento}
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
              Este evento tiene datos faltantes y no puede usarse para crear aval todavía.
            </p>
            <p className="mt-1 text-xs opacity-80">
              Completa: {missingFields.map(getEventoMissingFieldLabel).join(", ")}.
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
              Información general del evento y acciones disponibles.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
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

              <div className="flex flex-col gap-3 xl:items-end">
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    {canCreateAval && (
                      <>
                        {eventoIncompleto ? (
                          <Link
                            href={completionHref}
                            className="inline-flex items-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-600"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Completar datos para aval
                          </Link>
                        ) : canStartAval ? (
                          <button
                            type="button"
                            onClick={() => setUploadModalOpen(true)}
                            className="inline-flex items-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Crear aval
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="inline-flex items-center rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-300 cursor-not-allowed"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            {hasPendingReform
                              ? "Bloqueado por reforma pendiente"
                              : "No disponible para crear aval"}
                          </button>
                        )}
                        {canManageReforms ? (
                          canRequestReforma ? (
                            <Link
                              href={`/eventos/${evento.id}/reforma`}
                              className="inline-flex items-center rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 text-sm font-medium text-amber-700 dark:text-amber-300 transition hover:bg-amber-100 dark:hover:bg-amber-900/30"
                            >
                              <ClipboardEdit className="w-4 h-4 mr-2" />
                              Solicitar reforma
                            </Link>
                          ) : (
                            <>
                              <button
                                type="button"
                                disabled
                                className="inline-flex items-center rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-300 cursor-not-allowed"
                              >
                                <ClipboardEdit className="w-4 h-4 mr-2" />
                                Reforma no disponible
                              </button>
                              {hasPendingReform && pendingReformId ? (
                                <Link
                                  href={`/reformas/${pendingReformId}`}
                                  className="inline-flex items-center rounded-lg border border-amber-300 dark:border-amber-700 px-4 py-2 text-sm font-medium text-amber-700 dark:text-amber-300 transition hover:bg-amber-50 dark:hover:bg-amber-900/20"
                                >
                                  Ver reforma
                                </Link>
                              ) : null}
                            </>
                          )
                        ) : null}
                        {canViewReforms ? (
                          <Link
                            href={`/eventos/${evento.id}/historial`}
                            className="inline-flex items-center rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 transition hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            <History className="w-4 h-4 mr-2" />
                            Historial
                          </Link>
                        ) : null}
                      </>
                    )}
                  </div>
                  {canCreateAval && hasAval ? (
                    <div className="mt-2 space-y-1 px-1 text-xs text-gray-500 dark:text-gray-400">
                      <p>Este evento puede tener varios avales asociados.</p>
                    </div>
                  ) : null}
                  {canCreateAval && eventoIncompleto && (
                    <div className="mt-2 space-y-1 px-1 text-xs text-amber-700 dark:text-amber-300">
                      <p>Debes completar los datos obligatorios del evento antes de crear el aval.</p>
                    </div>
                  )}
                </div>

                {canShowEditButton && (
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 shadow-sm flex flex-wrap items-center gap-2">
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
              </div>
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

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Fechas */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5">
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
                      <p className="text-gray-500 dark:text-gray-400">
                        Duración
                      </p>
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
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5">
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
                    <p className="text-gray-500 dark:text-gray-400">
                      Provincia
                    </p>
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
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5">
                <div className="flex items-center gap-3 mb-4">
                  <Tag className="w-5 h-5 text-gray-400" />
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    Clasificación
                  </h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">
                      Disciplina
                    </p>
                    <p className="text-gray-900 dark:text-gray-100 font-medium">
                      {evento.disciplina?.nombre || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">
                      Categoría
                    </p>
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
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Tipos de participación
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Cada tipo muestra su referencia, delegación, observación y presupuesto propio.
            </p>
          </div>

          <div className="space-y-4">
            {tiposParticipacion.flatMap((tipoAval) => {
              const formasPorTipo = formasParticipacion.filter(
                (forma) => forma.tipoAval === tipoAval,
              );

              if (formasPorTipo.length === 0) {
                const emptyMessage =
                  tipoAval === "FONDOS_PUBLICOS"
                    ? "En este evento no se participará mediante financiamiento de fondos públicos."
                    : tipoAval === "AUTOGESTION"
                      ? "En este evento no se participará mediante recursos de autogestión."
                      : "En este evento no se registró participación solo por resultados, sin financiamiento.";

                return [
                  <details
                    key={`empty-${tipoAval}`}
                    className="group overflow-hidden rounded-2xl border border-dashed border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
                  >
                    <summary className="list-none cursor-pointer px-5 py-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <span className="inline-flex w-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                            {getTipoAvalLabel(tipoAval)}
                          </span>
                          <p className="mt-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                            {emptyMessage}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-400">
                          <span>Sin delegación</span>
                          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                        </div>
                      </div>
                    </summary>
                    <div className="border-t border-gray-100 bg-gray-50 px-5 py-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-300">
                      No hay delegación ni presupuesto registrados para este tipo de participación.
                    </div>
                  </details>,
                ];
              }

              return formasPorTipo.map((forma) => {
                const totalAtletas =
                  forma.numAtletasHombres + forma.numAtletasMujeres;
                const totalEntrenadores =
                  forma.numEntrenadoresHombres + forma.numEntrenadoresMujeres;
                const totalDelegacion = totalAtletas + totalEntrenadores;
                const items = forma.items ?? [];
                const totalPresupuesto =
                  Number.parseFloat(forma.presupuestoTotal ?? "0") ||
                  items.reduce((sum, item) => {
                    const value = Number.parseFloat(item.presupuesto) || 0;
                    return sum + value;
                  }, 0);
                const sinFinanciamiento = forma.tipoAval === "SOLO_RESULTADO";

                return (
                  <details
                    key={forma.id}
                    className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
                  >
                    <summary className="list-none cursor-pointer border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white px-5 py-4 dark:border-gray-700 dark:from-gray-900/40 dark:to-gray-800">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <span className="inline-flex w-fit rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                            {getTipoAvalLabel(forma.tipoAval)}
                          </span>
                          <p className="mt-2 truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {forma.referencia?.trim() || "-"}
                          </p>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Referencia
                          </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[620px]">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Delegación
                            </p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {totalDelegacion} participantes
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Presupuesto
                            </p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {sinFinanciamiento
                                ? "-"
                                : formatCurrency(totalPresupuesto)}
                            </p>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Items
                              </p>
                              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {sinFinanciamiento ? "No aplica" : items.length}
                              </p>
                            </div>
                            <ChevronDown className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-open:rotate-180" />
                          </div>
                        </div>
                      </div>
                    </summary>

                    <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white px-5 py-4 dark:border-gray-700 dark:from-gray-900/40 dark:to-gray-800">
                      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr_1.2fr]">
                        <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                          <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Referencia
                          </p>
                          <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {forma.referencia?.trim() || "-"}
                          </p>
                        </div>

                        <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                          <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Delegación
                          </p>
                          <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {totalDelegacion} participantes
                          </p>
                          <div className="mt-3 grid gap-1 text-xs text-gray-500 dark:text-gray-400 sm:grid-cols-2">
                            <span>
                              Deportistas hombres: {forma.numAtletasHombres}
                            </span>
                            <span>
                              Deportistas mujeres: {forma.numAtletasMujeres}
                            </span>
                            <span>
                              Entrenadores hombres:{" "}
                              {forma.numEntrenadoresHombres}
                            </span>
                            <span>
                              Entrenadores mujeres:{" "}
                              {forma.numEntrenadoresMujeres}
                            </span>
                          </div>
                        </div>

                        <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                          <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Observación
                          </p>
                          <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">
                            {forma.observacion?.trim() || "-"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="px-5 py-4">
                      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                            Presupuesto
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {sinFinanciamiento
                              ? "Participación sin financiamiento."
                              : `${items.length} items presupuestarios`}
                          </p>
                        </div>
                        {!sinFinanciamiento ? (
                          <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                            {formatCurrency(totalPresupuesto)}
                          </p>
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
                                <th className="px-4 py-3 text-left">
                                  Actividad
                                </th>
                                <th className="px-4 py-3 text-left">
                                  Descripción
                                </th>
                                <th className="px-4 py-3 text-center">Mes</th>
                                <th className="px-4 py-3 text-right">
                                  V. Unitario
                                </th>
                                <th className="px-4 py-3 text-right">
                                  Presupuesto
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                              {items.map((eventoItem) => (
                                <tr key={eventoItem.id} className="text-sm">
                                  <td className="px-4 py-3">
                                    <div className="font-medium text-gray-900 dark:text-gray-100">
                                      {eventoItem.item.numero}.{" "}
                                      {eventoItem.item.nombre}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                                    {eventoItem.item.actividad ? (
                                      <span>
                                        {eventoItem.item.actividad.numero}.{" "}
                                        {eventoItem.item.actividad.nombre}
                                      </span>
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
                                      ? formatCurrency(
                                          parseFloat(
                                            eventoItem.valorUnitario,
                                          ),
                                        )
                                      : "-"}
                                  </td>
                                  <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">
                                    {formatCurrency(
                                      parseFloat(eventoItem.presupuesto) || 0,
                                    )}
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
                  </details>
                );
              });
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

        {/* Resumen consolidado de avales */}
        {avalesEvento.length > 0 && (
          <div className="space-y-4">
            {/* Avales asociados */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    Avales asociados
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {avalesEvento.length}{" "}
                    {avalesEvento.length === 1 ? "aval" : "avales"} registrados
                  </p>
                </div>
              </div>
              <div className="p-5">
                <AvalCollectionList
                  avales={avalesEvento}
                  canManageRequestActions={canManageCollectionActions}
                  emptyMessage="No hay avales registrados para este evento."
                />
              </div>
            </div>

            {/* Presupuesto por fuente */}
            {Object.keys(presupuestoPorFuente).length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    Presupuesto por fuente
                  </h3>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  {Object.entries(presupuestoPorFuente).map(
                    ([fuente, montos]) => (
                      <div key={fuente} className="px-5 py-4">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                          {getTipoAvalLabel(fuente)}
                        </p>
                        <div className="grid grid-cols-3 gap-3 text-center text-sm">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Asignado
                            </p>
                            <p className="font-semibold text-gray-900 dark:text-gray-100">
                              {formatCurrency(montos.asignado)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Comprometido
                            </p>
                            <p className="font-semibold text-gray-900 dark:text-gray-100">
                              {formatCurrency(montos.comprometido)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Disponible
                            </p>
                            <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                              {formatCurrency(montos.disponible)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}
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
