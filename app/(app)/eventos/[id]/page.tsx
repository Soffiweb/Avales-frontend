"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
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
} from "lucide-react";

import AlertBanner from "@/components/ui/alert-banner";
import AvalUploadOptions from "@/components/ui/aval-upload-options";
import Breadcrumb from "@/components/ui/breadcrumb";
import ConfirmModal from "@/components/ui/confirm-modal";
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
} from "@/lib/auth/access";
import { listReformsByEvento } from "@/lib/api/reforms";
import {
  calcularTotalEvento,
  eventoTieneFondosPublicos,
  type Evento,
  type PresupuestoFuente,
} from "@/types/evento";
import type { Aval, TipoAval } from "@/types/aval";
import { useAuth } from "@/app/providers/auth-provider";
import {
  formatCurrency,
  formatGenero,
  formatEventScheduleLabel,
  formatMonth,
} from "@/lib/utils/formatters";
import { formatCategoryLabel } from "@/lib/utils/categories";
import {
  getEventoTipoParticipacionLabel,
  getTipoAvalLabel,
  getModalidadParticipacionLabel,
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

export default function EventoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const userRoles = getNormalizedRoles(user);
  const canManageEvents = isAdminUser(user);
  const isDTM = isDTMUser(user);
  const canCreateAval = !userRoles.includes("COMPRAS_PUBLICAS") && !isDTM;
  const id = Number(params.id);

  const [evento, setEvento] = useState<Evento | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [tipoAval, setTipoAval] = useState<TipoAval>("FONDOS_PUBLICOS");
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
    if (eventoTieneFondosPublicos(evento)) return;
    if (tipoAval === "FONDOS_PUBLICOS") {
      setTipoAval("AUTOGESTION");
    }
  }, [evento, tipoAval]);

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
  }: {
    convocatoria: File[];
    certificadoMedico: File;
  }) => {
    if (!evento) throw new Error("No se ha seleccionado un evento.");

    // if (!eventoTieneFondosPublicos(evento) && tipoAval === "FONDOS_PUBLICOS") {
    //   throw new Error(
    //     "Este evento no tiene presupuesto. Solo puedes crear avales por autogestión o solo resultados.",
    //   );
    // }

    const response = await uploadConvocatoria(
      evento.id,
      convocatoria,
      certificadoMedico,
      { tipoAval },
    );
    setUploadModalOpen(false);
    const params = new URLSearchParams({ tipoAval });
    router.push(
      `/avales/${response.data.id}/crear-solicitud?${params.toString()}`,
    );
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

  const totalAtletas =
    (evento.numAtletasHombres || 0) + (evento.numAtletasMujeres || 0);
  const totalEntrenadores =
    (evento.numEntrenadoresHombres || 0) + (evento.numEntrenadoresMujeres || 0);
  const hasAval = avalesEvento.length > 0;
  const firstAvalId = avalesEvento[0]?.id ?? null;

  // Métricas consolidadas desde avales
  const cuposAsignados = avalesEvento.reduce(
    (sum, a) => sum + (a.resumenCupos?.total ?? 0),
    0,
  );
  const cuposDisponibles = Math.max(totalAtletas - cuposAsignados, 0);

  const modalidadCounts = avalesEvento.reduce<Record<string, number>>(
    (acc, aval) => {
      for (const d of aval.avalTecnico?.deportistasAval ?? []) {
        const key = d.modalidadParticipacion ?? "SIN_MODALIDAD";
        acc[key] = (acc[key] ?? 0) + 1;
      }
      return acc;
    },
    {},
  );

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
  const canManageReforms = canCreateReforma(user) && !isDTM;
  const canViewReforms = canAccessReforms(user) || isDTM;
  const canStartAval =
    canCreateAval &&
    evento.estado === "DISPONIBLE" &&
    !hasAval &&
    !hasPendingReform;
  const canRequestReforma = canManageReforms && !hasPendingReform;

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
          tipoAval={tipoAval}
          onTipoAvalChange={setTipoAval}
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="mb-2">
              <Breadcrumb
                items={[
                  { label: "Eventos", href: "/eventos" },
                  { label: evento.nombre },
                ]}
              />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
              {evento.nombre}
            </h1>
            {evento.codigo && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Código: {evento.codigo}
              </p>
            )}
          </div>
          <div className="w-full sm:w-auto">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                {canCreateAval && (
                  <>
                    {canStartAval ? (
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
                        {hasAval
                          ? "Aval ya creado"
                          : hasPendingReform
                            ? "Bloqueado por reforma pendiente"
                            : "No disponible para crear aval"}
                      </button>
                    )}
                    {hasAval && firstAvalId && (
                      <Link
                        href={`/avales/${firstAvalId}`}
                        className="inline-flex items-center rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 transition hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        Ver aval
                      </Link>
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
              {canCreateAval && hasAval && (
                <div className="mt-2 space-y-1 px-1 text-xs text-gray-500 dark:text-gray-400">
                  {hasAval ? (
                    <p>Este evento ya tiene un aval registrado.</p>
                  ) : null}
                </div>
              )}
            </div>
          </div>
          {canManageEvents && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 shadow-sm flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                disabled={downloadingTemplate}
                className="inline-flex items-center rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 transition hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                <Download className="w-4 h-4 mr-2" />
                {downloadingTemplate ? "Descargando..." : "Plantilla"}
              </button>
              <Link
                href={`/eventos/${evento.id}/editar`}
                className="inline-flex items-center rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 transition hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <Pencil className="w-4 h-4 mr-2" />
                Editar
              </Link>
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="inline-flex items-center rounded-lg border border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-900/20 px-4 py-2 text-sm font-medium text-rose-700 dark:text-rose-300 transition hover:bg-rose-100 dark:hover:bg-rose-900/30"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar
              </button>
            </div>
          )}
        </div>

        {/* Estado y badges */}
        <div className="flex flex-wrap items-center gap-3">
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

        {/* Tarjetas de información principal con participantes a la derecha */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Columna izquierda - Info del evento */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          {/* Columna derecha - Participantes */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-3 mb-5">
              <Users className="w-5 h-5 text-gray-400" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Participantes
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Atletas Hombres */}
              <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {evento.numAtletasHombres || 0}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Atletas (H)
                </p>
              </div>

              {/* Atletas Mujeres */}
              <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {evento.numAtletasMujeres || 0}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Atletas (M)
                </p>
              </div>

              {/* Entrenadores Hombres */}
              <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {evento.numEntrenadoresHombres || 0}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Entrenadores (H)
                </p>
              </div>

              {/* Entrenadores Mujeres */}
              <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {evento.numEntrenadoresMujeres || 0}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Entrenadores (M)
                </p>
              </div>
            </div>

            {/* Totales */}
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 grid grid-cols-2 gap-3">
              <div className="text-center">
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {totalAtletas}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Total Atletas
                </p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {totalEntrenadores}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Total Entrenadores
                </p>
              </div>
            </div>
          </div>
        </div>

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

        {/* Items Presupuestarios */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Items Presupuestarios
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {evento.eventoItems?.length || 0} items asignados
                </p>
              </div>
            </div>
          </div>

          {evento.eventoItems && evento.eventoItems.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/30">
                    <tr>
                      <th className="px-4 py-3 text-left">Item</th>
                      <th className="px-4 py-3 text-left">Actividad</th>
                      <th className="px-4 py-3 text-left">Descripción</th>
                      <th className="px-4 py-3 text-center">Mes</th>
                      <th className="px-4 py-3 text-right">V. Unitario</th>
                      <th className="px-4 py-3 text-right">Presupuesto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                    {evento.eventoItems.map((eventoItem) => (
                      <tr key={eventoItem.id} className="text-sm">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {eventoItem.item.numero}. {eventoItem.item.nombre}
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
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300 max-w-xs truncate">
                          {eventoItem.item.descripcion || "-"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                            {formatMonth(eventoItem.mes)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">
                          {eventoItem.valorUnitario
                            ? formatCurrency(
                                parseFloat(eventoItem.valorUnitario),
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

              {/* Total */}
              <div className="px-5 py-4 bg-emerald-50 dark:bg-emerald-900/20 border-t border-emerald-100 dark:border-emerald-800/40">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                      Total Presupuesto
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                      Suma de todos los items asignados
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                    {formatCurrency(calcularTotalEvento(evento))}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="px-5 py-8 text-center text-gray-500 dark:text-gray-400">
              No hay items presupuestarios asignados a este evento.
            </div>
          )}
        </div>

        {/* Fuentes de financiamiento del evento */}
        {evento.presupuestosFuente && evento.presupuestosFuente.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Fuentes de financiamiento
              </h3>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {evento.presupuestosFuente.map((pf: PresupuestoFuente) => (
                <div key={pf.fuente} className="px-5 py-4">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    {getTipoAvalLabel(pf.fuente)}
                  </p>
                  {pf.fuente === "AUTOGESTION" ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                      El PDA asigna el valor
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-sm">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Asignado
                        </p>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {formatCurrency(parseFloat(pf.montoAsignado))}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Comprometido
                        </p>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {formatCurrency(parseFloat(pf.montoComprometido))}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Disponible
                        </p>
                        <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                          {formatCurrency(parseFloat(pf.montoDisponible))}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Ejecutado
                        </p>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {formatCurrency(parseFloat(pf.montoEjecutado))}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
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
              <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {avalesEvento.map((aval) => (
                  <div
                    key={aval.id}
                    className="flex items-center justify-between px-5 py-3 gap-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                        {getTipoAvalLabel(aval.tipoAval)}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {aval.estado}
                      </span>
                      {aval.resumenCupos ? (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {aval.resumenCupos.total} deportistas
                        </span>
                      ) : null}
                    </div>
                    <Link
                      href={`/avales/${aval.id}`}
                      className="shrink-0 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                    >
                      Ver →
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Cupos consolidados */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5">
              <div className="flex items-center gap-3 mb-4">
                <Users className="w-5 h-5 text-gray-400" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Cupos consolidados
                </h3>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-gray-50 dark:bg-gray-700/50 p-3">
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {totalAtletas}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Planificados
                  </p>
                </div>
                <div className="rounded-lg bg-indigo-50 dark:bg-indigo-900/30 p-3">
                  <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                    {cuposAsignados}
                  </p>
                  <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-1">
                    Asignados
                  </p>
                </div>
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/30 p-3">
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                    {cuposDisponibles}
                  </p>
                  <p className="text-xs text-emerald-500 dark:text-emerald-400 mt-1">
                    Disponibles
                  </p>
                </div>
              </div>

              {Object.keys(modalidadCounts).length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                    Por modalidad
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(modalidadCounts).map(
                      ([modalidad, count]) => (
                        <span
                          key={modalidad}
                          className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        >
                          {modalidad === "SIN_MODALIDAD"
                            ? "Sin modalidad"
                            : getModalidadParticipacionLabel(modalidad)}
                          <span className="font-semibold">{count}</span>
                        </span>
                      ),
                    )}
                  </div>
                </div>
              )}
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
