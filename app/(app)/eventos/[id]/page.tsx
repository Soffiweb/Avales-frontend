"use client";

import {
  TableContainer,
  Table,
  TableHead,
  TableBody,
  Th,
  Tr,
  Td,
} from "@/components/ui/table";
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
import ConfirmModal from "@/components/ui/confirm-modal";
import CopyEventCodeButton from "@/components/ui/copy-event-code-button";
import EventoIncompletoBadge from "@/components/ui/evento-incompleto-badge";
import PageHeader from "@/components/ui/page-header";
import {
  SectionCard,
  SectionLabel,
  SECTION_CARD_CLASS,
  SECTION_CARD_HEADER_CLASS,
} from "@/components/ui/section-card";
import UploadModal from "@/components/ui/upload-modal";
import { getEvento, softDeleteEvento } from "@/lib/api/eventos";
import { getAvalesByEvento, uploadConvocatoria } from "@/lib/api/avales";
import { useDisciplinaPronosticoPlantilla } from "@/lib/hooks/use-catalog";
import { downloadEventsTemplate } from "@/lib/api/template-download";
import {
  canAccessReforms,
  // canCreateReforma, // solo usado por el botón "Solicitar reforma" deshabilitado
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

/**
 * Chip de estado del evento, en la misma receta pastel que el resto de la app:
 * fondo `-50`, borde `-200`, texto `-700`; en oscuro `-500/10`, `-500/30` y
 * `-300`.
 *
 * El borde viaja junto al fondo y no lo pone cada consumidor porque un chip sin
 * borde no es una variante válida: un `-50` sobre el blanco de la tarjeta no
 * alcanza a recortar la etiqueta y el estado se lee como texto suelto. Es el
 * mismo criterio que `getApprovalStageBadgeStyles` en `lib/constants.ts`, así
 * un "ACEPTADO" se ve igual acá que en el detalle del aval.
 *
 * El punto es la única pieza que NO baja a pastel: mide 8px y sin superficie
 * ni texto que lo sostengan, un `-200` se pierde contra el fondo del chip. Se
 * queda en el tono medio, que es justo el que le da el color al chip.
 */
const STATUS_STYLES: Record<
  string,
  { bg: string; text: string; border: string; dot: string }
> = {
  DISPONIBLE: {
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-500/30",
    dot: "bg-emerald-500 dark:bg-emerald-400",
  },
  SOLICITADO: {
    bg: "bg-amber-50 dark:bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-500/30",
    dot: "bg-amber-500 dark:bg-amber-400",
  },
  RECHAZADO: {
    bg: "bg-rose-50 dark:bg-rose-500/10",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-200 dark:border-rose-500/30",
    dot: "bg-rose-500 dark:bg-rose-400",
  },
  ACEPTADO: {
    bg: "bg-sky-50 dark:bg-sky-500/10",
    text: "text-sky-700 dark:text-sky-300",
    border: "border-sky-200 dark:border-sky-500/30",
    dot: "bg-sky-500 dark:bg-sky-400",
  },
};

const STATUS_STYLES_FALLBACK = {
  bg: "bg-slate-50 dark:bg-slate-500/10",
  text: "text-slate-700 dark:text-slate-300",
  border: "border-slate-200 dark:border-slate-500/30",
  dot: "bg-slate-400 dark:bg-slate-500",
};

function getStatusStyles(status?: string | null) {
  if (!status) return STATUS_STYLES_FALLBACK;
  return STATUS_STYLES[status.toUpperCase()] ?? STATUS_STYLES_FALLBACK;
}

/**
 * Chip pastel genérico, para los datos de clasificación que acompañan al
 * estado (alcance, tipo de evento, tipo de participación).
 *
 * Son etiquetas informativas, no estados, y por eso no pasan por
 * `STATUS_STYLES`: comparten la receta visual pero no el significado.
 */
const CHIP_CLASS =
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium";

const CHIP_SLATE =
  "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-300";
const CHIP_INDIGO =
  "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300";
const CHIP_SKY =
  "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300";
const CHIP_AMBER =
  "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300";

/**
 * Botones de la página, en las mismas tres variantes que el detalle del aval.
 *
 * Están acá y no repartidos por el JSX porque la jerarquía es la parte
 * delicada: el relleno sólido tiene que quedar reservado para UNA acción por
 * bloque. Si cada botón elige sus clases a mano, en la próxima edición terminan
 * tres rellenos sólidos compitiendo en la misma tarjeta.
 */

/** Botón secundario: contorno slate. Es el default de la página. */
const OUTLINE_BUTTON_CLASS =
  "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700";

/**
 * Botón primario: el único relleno sólido permitido.
 *
 * Lo llevan "Crear aval" y "Ver detalle" —la acción que la pantalla espera que
 * hagas— y nada más. En pastel se confundirían con los chips informativos que
 * tienen al lado y la pantalla se quedaría sin acción evidente.
 */
const PRIMARY_BUTTON_CLASS =
  "bg-indigo-600 text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60";

/**
 * Botón de advertencia accionable: contorno ámbar pastel.
 *
 * "Completar datos para aval" y "Ver reforma" avisan de algo que falta; no son
 * la acción principal. En sólido gritarían más que "Crear aval", que es lo que
 * el usuario quiere hacer una vez resuelto el aviso.
 */
const WARNING_BUTTON_CLASS =
  "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20";

/** Botón destructivo: contorno rosa pastel, nunca relleno. */
const DANGER_BUTTON_CLASS =
  "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20";

/**
 * Geometría compartida de los botones. NO incluye el tamaño.
 *
 * El tamaño vive en constantes aparte y no se pisa agregando `px-3 py-1.5`
 * sobre un `px-4 py-2` de la base: son la misma propiedad con la misma
 * especificidad, así que no gana la que se escribe última en el atributo sino
 * la que Tailwind emite última en la hoja de estilos —y ahí gana el valor más
 * grande—. Es el mismo problema que documenta `components/ui/table.tsx` con
 * `whitespace-*`. Por eso cada botón elige UNA de las dos.
 *
 * Tampoco trae `justify-*`, por lo mismo: los botones a lo ancho de la tarjeta
 * de acciones necesitan el contenido a la izquierda, que es el default de flex,
 * y un `justify-center` en la base los obligaría a pelearlo.
 */
const BUTTON_BASE =
  "inline-flex items-center rounded-xl font-medium transition-colors";

/** Tamaño normal: acciones del encabezado y de la tarjeta de acciones. */
const BUTTON_MD = "px-4 py-2 text-sm";

/** Tamaño chico: acciones al pie de una tarjeta o dentro de otra tarjeta. */
const BUTTON_SM = "px-3 py-1.5 text-xs";

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
  const { sinPlantilla: disciplinaSinPlantilla } =
    useDisciplinaPronosticoPlantilla(evento?.disciplinaId);

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
    pronosticoDeportistas?: File[];
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

  if (error || !evento) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-5xl mx-auto">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error ?? "Evento no encontrado"}
        </div>
        <div className="mt-4">
          <Link
            href="/eventos"
            className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
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
  // const canManageReforms = canCreateReforma(user) && !isDTM; // solo usado por el botón "Solicitar reforma" deshabilitado
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
  const faltaFormaParticipacion =
    formasDelTipoSeleccionado.length > 0 && formaParticipacionId == null;
  // Sin plantilla de pronóstico el backend rechaza la creación del aval, así
  // que se corta antes de que el entrenador suba los documentos.
  const submitDisabled = faltaFormaParticipacion || disciplinaSinPlantilla;
  const submitDisabledReason = disciplinaSinPlantilla
    ? `La disciplina ${evento.disciplina?.nombre ?? "del evento"} no tiene una plantilla de pronóstico configurada. Pídele a un administrador que la configure antes de crear el aval.`
    : "Selecciona una forma de participación para continuar.";
  // const canRequestReforma = canManageReforms && !hasPendingReform; // botón "Solicitar reforma" deshabilitado: reformas ya no se piden desde un evento puntual, ver /reformas
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
        requirePronosticoDeportistas={false}
        submitDisabled={submitDisabled}
        submitDisabledReason={submitDisabledReason}
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
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
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
          {/* El rastro de navegación y las acciones dejan de ir sueltos sobre la
              página: `PageHeader` los agrupa arriba a la derecha, que es donde
              el resto de las pantallas los pone. El nombre del evento NO sube
              acá — vive en la tarjeta de identidad, junto a su código y sus
              chips de clasificación. */}
          <PageHeader
            title="Datos del evento"
            description="Información general del evento."
            breadcrumb={[
              { label: "Eventos", href: "/eventos" },
              { label: evento.nombre },
            ]}
            actions={
              canShowEditButton ? (
                <div className="flex flex-wrap items-center gap-2">
                  {canEditEvents && (
                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      disabled={downloadingTemplate}
                      className={`${BUTTON_BASE} ${BUTTON_MD} ${OUTLINE_BUTTON_CLASS} disabled:opacity-50`}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      {downloadingTemplate ? "Descargando..." : "Plantilla"}
                    </button>
                  )}
                  <Link
                    href={`/eventos/${evento.id}/editar`}
                    className={`${BUTTON_BASE} ${BUTTON_MD} ${OUTLINE_BUTTON_CLASS}`}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </Link>
                  {canManageEvents && (
                    <button
                      type="button"
                      onClick={() => setConfirmOpen(true)}
                      className={`${BUTTON_BASE} ${BUTTON_MD} ${DANGER_BUTTON_CLASS}`}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </button>
                  )}
                </div>
              ) : null
            }
          />

          {/* Banner de identidad del evento.
              Deja de ser "una tarjeta más" arriba de la grilla: el degradado
              suave slate→indigo y el radio grande lo separan de las cuatro
              tarjetas de datos que vienen debajo, que sí son todas iguales
              entre sí. El degradado es apenas perceptible a propósito —esto es
              una pantalla de gestión, y un encabezado con color fuerte le
              robaría atención al estado del evento, que es el dato que importa. */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-linear-to-br from-slate-50 via-white to-indigo-50/70 p-6 shadow-xs dark:border-slate-700 dark:from-slate-800 dark:via-slate-800 dark:to-indigo-500/10">
            <div>
              {/* `h2` y no `h1`: el `h1` de la pantalla lo pone `PageHeader`.
                  Dos `h1` dejan a un lector de pantalla sin saber cuál es el
                  título de la página. El tamaño no cambia — acá manda la
                  jerarquía del documento, no la visual. */}
              <h2 className="text-2xl font-bold text-slate-900 md:text-3xl dark:text-slate-100">
                {evento.nombre}
              </h2>
              {eventoIncompleto ? (
                <div className="mt-2">
                  <EventoIncompletoBadge />
                </div>
              ) : null}
              {evento.codigo && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Código:{" "}
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {evento.codigo}
                    </span>
                  </p>
                  <CopyEventCodeButton codigo={evento.codigo} />
                </div>
              )}
            </div>

            {/* Los chips de clasificación van en una fila propia, separada por
                un borde: son metadatos del evento, no parte del título, y sin
                la línea se leían como una continuación del código. */}
            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-200/70 pt-4 dark:border-slate-700/60">
              <span
                className={`${CHIP_CLASS} ${statusStyles.bg} ${statusStyles.border} ${statusStyles.text}`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${statusStyles.dot}`}
                  aria-hidden="true"
                />
                {evento.estado || "Sin estado"}
              </span>
              {hasPendingReform ? (
                <span className={`${CHIP_CLASS} ${CHIP_AMBER}`}>
                  Reforma pendiente
                </span>
              ) : null}
              {evento.alcance && (
                <span className={`${CHIP_CLASS} ${CHIP_SLATE}`}>
                  <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                  {evento.alcance}
                </span>
              )}
              {evento.tipoEvento && (
                <span className={`${CHIP_CLASS} ${CHIP_INDIGO}`}>
                  <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
                  {evento.tipoEvento}
                </span>
              )}
              {evento.tipoParticipacion && (
                <span className={`${CHIP_CLASS} ${CHIP_SKY}`}>
                  <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  {getEventoTipoParticipacionLabel(evento.tipoParticipacion) ??
                    evento.tipoParticipacion}
                </span>
              )}
            </div>
          </div>

          {/* Grilla de datos. Las cuatro tarjetas usan `SectionCard`: el
              contenedor, el chip de icono y la banda de encabezado estaban
              copiados a mano cuatro veces y ya no coincidían entre sí.

              El `p-0` del cuerpo es a propósito: cada tarjeta pone su propio
              padding para que el pie pueda llegar de borde a borde. Un pie con
              padding lateral deja la línea flotando en el medio y se lee como
              un separador cualquiera, no como el cierre de la tarjeta. */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {/* Fechas */}
            <SectionCard
              title="Fechas"
              icon={<Calendar className="h-4 w-4" aria-hidden="true" />}
              iconTone="sky"
              className="flex flex-col"
              bodyClassName="flex flex-1 flex-col p-0"
            >
              <div className="flex-1 space-y-4 p-5 text-sm">
                <div>
                  <SectionLabel>Programación</SectionLabel>
                  <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                    {formatEventScheduleLabel(evento)}
                  </p>
                </div>
                {daysUntil !== null && daysUntil >= 0 && (
                  <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-900/40">
                    <Clock
                      className="h-4 w-4 text-slate-500 dark:text-slate-400"
                      aria-hidden="true"
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {daysUntil === 0
                        ? "¡Hoy!"
                        : daysUntil === 1
                          ? "Mañana"
                          : `En ${daysUntil} días`}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-slate-200/80 px-5 py-3 dark:border-slate-700">
                <SectionLabel as="span">Duración</SectionLabel>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {duration
                    ? `${duration} ${duration === 1 ? "día" : "días"}`
                    : "-"}
                </span>
              </div>
            </SectionCard>

            {/* Ubicación */}
            <SectionCard
              title="Ubicación"
              icon={<MapPin className="h-4 w-4" aria-hidden="true" />}
              iconTone="emerald"
              className="flex flex-col"
              bodyClassName="flex flex-1 flex-col p-0"
            >
              <div className="flex-1 space-y-3 p-5 text-sm">
                {evento.lugar && (
                  <div>
                    <SectionLabel>Lugar</SectionLabel>
                    <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                      {evento.lugar}
                    </p>
                  </div>
                )}
                <div>
                  <SectionLabel>Ciudad</SectionLabel>
                  <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                    {evento.ciudad || "-"}
                  </p>
                </div>
                <div>
                  <SectionLabel>Provincia</SectionLabel>
                  <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                    {evento.provincia || "-"}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-slate-200/80 px-5 py-3 dark:border-slate-700">
                <SectionLabel as="span">País</SectionLabel>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {evento.pais || "-"}
                </span>
              </div>
            </SectionCard>

            {/* Categoría y Disciplina */}
            <SectionCard
              title="Clasificación"
              icon={<Tag className="h-4 w-4" aria-hidden="true" />}
              iconTone="slate"
              className="flex flex-col"
              bodyClassName="flex flex-1 flex-col p-0"
            >
              <div className="flex-1 space-y-3 p-5 text-sm">
                <div>
                  <SectionLabel>Disciplina</SectionLabel>
                  <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                    {evento.disciplina?.nombre || "-"}
                  </p>
                </div>
                <div>
                  <SectionLabel>Categoría</SectionLabel>
                  <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                    {formatCategoryLabel(
                      evento.categoria?.nombre ?? evento.categoriaCodigo,
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-slate-200/80 px-5 py-3 dark:border-slate-700">
                <SectionLabel as="span">Género</SectionLabel>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {formatGenero(evento.genero)}
                </span>
              </div>
            </SectionCard>

            {/* Acciones */}
            <SectionCard
              title="Acciones"
              icon={<FileText className="h-4 w-4" aria-hidden="true" />}
              iconTone="indigo"
              className="flex flex-col"
              bodyClassName="flex flex-1 flex-col p-0"
            >
              <div className="flex flex-1 flex-col gap-2 p-5">
                {canCreateAval && (
                  <>
                    {eventoIncompleto ? (
                      <Link
                        href={completionHref}
                        className={`${BUTTON_BASE} ${BUTTON_MD} w-full gap-2 ${WARNING_BUTTON_CLASS}`}
                      >
                        <Upload className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>Completar datos para aval</span>
                      </Link>
                    ) : canStartAval ? (
                      <button
                        type="button"
                        onClick={() => setUploadModalOpen(true)}
                        className={`${BUTTON_BASE} ${BUTTON_MD} w-full gap-2 ${PRIMARY_BUTTON_CLASS}`}
                      >
                        <Upload className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>Crear aval</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className={`${BUTTON_BASE} ${BUTTON_MD} w-full cursor-not-allowed gap-2 border border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-500`}
                      >
                        <Upload className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className="text-left">
                          {hasPendingReform
                            ? "Bloqueado por reforma pendiente"
                            : "No disponible para crear aval"}
                        </span>
                      </button>
                    )}
                  </>
                )}
                {/* Botón "Solicitar reforma" deshabilitado: las reformas ya no se piden
                    desde un evento puntual (ahora cubren N eventos + movimientos de
                    presupuesto), se crean desde /reformas.
                {canManageReforms && canRequestReforma && (
                  <Link
                    href={`/reformas/nueva?eventoId=${evento.id}`}
                    className={`${BUTTON_BASE} ${BUTTON_MD} w-full gap-2 ${WARNING_BUTTON_CLASS}`}
                  >
                    <ClipboardEdit className="h-4 w-4 shrink-0" />
                    <span>Solicitar reforma</span>
                  </Link>
                )}
                */}
                {hasPendingReform && pendingReformId && (
                  <Link
                    href={`/reformas/${pendingReformId}`}
                    className={`${BUTTON_BASE} ${BUTTON_MD} w-full gap-2 ${WARNING_BUTTON_CLASS}`}
                  >
                    <ClipboardEdit
                      className="h-4 w-4 shrink-0"
                      aria-hidden="true"
                    />
                    <span>Ver reforma</span>
                  </Link>
                )}
              </div>
              {canViewReforms && (
                <div className="flex justify-end border-t border-slate-200/80 px-5 py-3 dark:border-slate-700">
                  <Link
                    href={`/eventos/${evento.id}/historial`}
                    className={`${BUTTON_BASE} ${BUTTON_SM} gap-2 ${OUTLINE_BUTTON_CLASS}`}
                  >
                    <History className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>Historial</span>
                  </Link>
                </div>
              )}
            </SectionCard>
          </div>
        </section>

        <hr className="border-slate-200 dark:border-slate-700" />

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Participación y avales
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
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

              // Barra de acento del acordeón, en pastel como el resto de los
              // indicadores: es una marca de color para distinguir los tres
              // tipos de un vistazo, no una alerta. En el tono medio anterior
              // pesaba más que el título que tiene al lado.
              const accentBar = {
                FONDOS_PUBLICOS: "bg-indigo-200 dark:bg-indigo-500/40",
                AUTOGESTION: "bg-emerald-200 dark:bg-emerald-500/40",
                SOLO_RESULTADO: "bg-amber-200 dark:bg-amber-500/40",
              }[tipoAval];

              return (
                // El acordeón sigue siendo `<details>` nativo: el `<summary>`
                // toma prestadas las clases de encabezado de `SectionCard` en
                // vez de un `<div>`, que es justo el caso para el que esas
                // constantes se exponen sueltas. Así se ve igual que las
                // tarjetas de la grilla sin perder el desplegado del navegador.
                <details
                  key={tipoAval}
                  open
                  className={`group ${SECTION_CARD_CLASS}`}
                >
                  <summary
                    className={`${SECTION_CARD_HEADER_CLASS} cursor-pointer list-none transition-colors hover:bg-slate-100/70 dark:hover:bg-slate-900/60`}
                  >
                    {/* Todo el contenido va dentro de UN hijo que centra por su
                        cuenta. La constante del encabezado trae `items-start`, y
                        apilarle un `items-center` encima no es confiable: las
                        dos clases tienen la misma especificidad y gana la que
                        Tailwind emite última, no la del atributo. */}
                    <div className="flex w-full items-center gap-3">
                      <div
                        className={`h-9 w-1 shrink-0 rounded-full ${accentBar}`}
                        aria-hidden="true"
                      />
                      <div className="flex flex-1 flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 sm:text-base dark:text-slate-100">
                          {getTipoAvalLabel(tipoAval)}
                        </span>
                        {avalesPorTipo.length > 0 ? (
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                            {avalesPorTipo.length}{" "}
                            {avalesPorTipo.length === 1 ? "aval" : "avales"}
                          </span>
                        ) : formasPorTipo.length > 0 ? (
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-500 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-400">
                            Sin aval
                          </span>
                        ) : null}
                      </div>
                      <ChevronDown
                        className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180"
                        aria-hidden="true"
                      />
                    </div>
                  </summary>

                  <div className="p-6">
                    {formasPorTipo.length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {mensajeSinPlan}
                      </p>
                    ) : (
                      <div className="space-y-6">
                        {formasPorTipo.map((forma, formaIndex) => {
                          const avalesDeForma = avalesEvento.filter((aval) => {
                            const formaVinculadaId =
                              aval.evento?.formaParticipacionActual?.id;
                            if (formaVinculadaId != null) {
                              return formaVinculadaId === forma.id;
                            }
                            // Avales legado sin forma vinculada: solo listar aquí si
                            // no hay ambigüedad (única forma de este tipo).
                            return (
                              formasPorTipo.length === 1 && aval.tipoAval === tipoAval
                            );
                          });
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
                            // El borde simple reemplaza al `border-2`: esta
                            // tarjeta ya está anidada dentro del acordeón y un
                            // borde doble sumaba un tercer nivel de encierro.
                            <div
                              key={forma.id}
                              className="space-y-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5 dark:border-slate-700 dark:bg-slate-900/20"
                            >
                              {formasPorTipo.length > 1 && (
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 text-xs font-bold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
                                    {formaIndex + 1}
                                  </span>
                                  <SectionLabel as="span">
                                    Participación {formaIndex + 1} de {formasPorTipo.length}
                                  </SectionLabel>
                                </div>
                              )}
                              <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr_1.2fr]">
                                {/* Estas tres no llevan `SectionCard` entero:
                                    son datos sueltos, y la banda de encabezado
                                    con chip de icono pesaría más que el propio
                                    dato. Comparten el contenedor y el rótulo,
                                    que es lo que estaba copiado a mano. */}
                                <div className={`${SECTION_CARD_CLASS} p-4`}>
                                  <SectionLabel>Referencia</SectionLabel>
                                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    {forma.referencia?.trim() || "-"}
                                  </p>
                                </div>
                                <div className={`${SECTION_CARD_CLASS} p-4`}>
                                  <SectionLabel>Delegación</SectionLabel>
                                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    {totalDelegacion} participantes
                                  </p>
                                  <div className="mt-3 grid gap-1 text-xs text-slate-500 dark:text-slate-400 sm:grid-cols-2">
                                    <span>Deportistas hombres: {forma.numAtletasHombres}</span>
                                    <span>Deportistas mujeres: {forma.numAtletasMujeres}</span>
                                    <span>Entrenadores/otros hombres: {forma.numEntrenadoresHombres}</span>
                                    <span>Entrenadores/otros mujeres: {forma.numEntrenadoresMujeres}</span>
                                  </div>
                                </div>
                                <div className={`${SECTION_CARD_CLASS} p-4`}>
                                  <SectionLabel>Observación</SectionLabel>
                                  <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
                                    {forma.observacion?.trim() || "-"}
                                  </p>
                                </div>
                              </div>

                              <div>
                                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                  <div>
                                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Presupuesto</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
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
                                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                        Disponible · Asignado {formatCurrency(totalAsignado)}
                                      </p>
                                    </div>
                                  ) : null}
                                </div>
                                {sinFinanciamiento ? (
                                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-400">
                                    Este tipo de participación no registra presupuesto.
                                  </div>
                                ) : items.length > 0 ? (
                                  <TableContainer>
                                    <Table>
                                      <TableHead>
                                        <tr>
                                          <Th>Item</Th>
                                          <Th>Actividad</Th>
                                          <Th>Descripción</Th>
                                          <Th className="text-center">Mes</Th>
                                          <Th className="text-right">V. Unitario</Th>
                                          <Th className="text-right">Asignado</Th>
                                          <Th className="text-right">Disponible</Th>
                                        </tr>
                                      </TableHead>
                                      <TableBody>
                                        {itemsConDisponible.map((eventoItem) => (
                                          <Tr key={eventoItem.id}>
                                            {/* Ítem y actividad envuelven y llevan
                                                tope de ancho: son los dos textos
                                                largos de la fila y, sin eso,
                                                estiraban la tabla 270px más allá
                                                de la tarjeta y aparecía scroll
                                                horizontal. El resto son cifras
                                                cortas y no lo necesitan. */}
                                            <Td wrap className="w-[30%] min-w-[16rem]">
                                              <div className="font-medium text-slate-900 dark:text-slate-100">
                                                {eventoItem.item.numero}. {eventoItem.item.nombre}
                                              </div>
                                            </Td>
                                            <Td wrap className="w-[22%] min-w-[12rem]">
                                              {eventoItem.item.actividad ? (
                                                <span>{eventoItem.item.actividad.numero}. {eventoItem.item.actividad.nombre}</span>
                                              ) : (
                                                <span className="text-slate-400">-</span>
                                              )}
                                            </Td>
                                            <Td className="max-w-xs truncate">
                                              {eventoItem.item.descripcion || "-"}
                                            </Td>
                                            <Td className="text-center">
                                              <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-300">
                                                {formatMonth(eventoItem.mes)}
                                              </span>
                                            </Td>
                                            <Td className="text-right">
                                              {eventoItem.valorUnitario
                                                ? formatCurrency(parseFloat(eventoItem.valorUnitario))
                                                : "-"}
                                            </Td>
                                            <Td className="text-right">
                                              {formatCurrency(eventoItem.asignado)}
                                            </Td>
                                            <Td
                                              className={`text-right font-medium ${
                                                eventoItem.disponible <= 0
                                                  ? "text-rose-600 dark:text-rose-300"
                                                  : "text-slate-900 dark:text-slate-100"
                                              }`}
                                            >
                                              {formatCurrency(eventoItem.disponible)}
                                            </Td>
                                          </Tr>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </TableContainer>
                                ) : (
                                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-400">
                                    No hay items presupuestarios registrados para este tipo de participación.
                                  </div>
                                )}
                              </div>

                              <div>
                                <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Avales</h3>
                                {avalesDeForma.length > 0 ? (
                                  <div className="space-y-3">
                                    {avalesDeForma.map((aval) => (
                                <div
                                  key={aval.id}
                                  className={`${SECTION_CARD_CLASS} w-fit min-w-[360px] max-w-xl p-4`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                                          {aval.avalTecnico?.numeroAval?.trim() ||
                                            aval.numeroColeccion?.trim() ||
                                            `AV-${aval.id}`}
                                        </span>
                                        {/* El estado del aval reusa la misma
                                            paleta que el estado del evento en
                                            vez de tener la suya: son el mismo
                                            vocabulario (ACEPTADO, RECHAZADO,
                                            SOLICITADO) y verlos de distinto
                                            color sugería que significan cosas
                                            distintas. Un estado que no esté en
                                            el mapa —BORRADOR— cae en slate. */}
                                        <span
                                          className={`shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getStatusStyles(aval.estado).bg} ${getStatusStyles(aval.estado).border} ${getStatusStyles(aval.estado).text}`}
                                        >
                                          {aval.estado}
                                        </span>
                                        {/* La etapa se queda en ámbar: es el
                                            mismo tono con el que `lib/constants`
                                            pinta una etapa en curso. */}
                                        {aval.etapaActual && (
                                          <span className="shrink-0 inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                                            {aval.etapaActual}
                                          </span>
                                        )}
                                      </div>
                                      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
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
                                        <div className="mt-2 flex gap-3 text-xs text-slate-500 dark:text-slate-400">
                                          <span>Asignado: {formatCurrency(aval.presupuesto.asignado)}</span>
                                          <span>Comprometido: {formatCurrency(aval.presupuesto.comprometido)}</span>
                                          <span>Disponible: {formatCurrency(aval.presupuesto.disponible)}</span>
                                        </div>
                                      )}
                                      {aval.participantes && aval.participantes.length > 0 && (
                                        <div className="mt-2 truncate text-xs text-slate-400 dark:text-slate-500">
                                          {aval.participantes.slice(0, 3).map((p) => p.nombreCompleto).join(", ")}
                                          {aval.participantes.length > 3 && ` y ${aval.participantes.length - 3} más`}
                                        </div>
                                      )}
                                    </div>
                                    <Link
                                      href={`/avales/${aval.id}`}
                                      className={`${BUTTON_BASE} ${BUTTON_SM} shrink-0 ${PRIMARY_BUTTON_CLASS}`}
                                    >
                                      Ver detalle
                                    </Link>
                                  </div>
                                </div>
                              ))}
                            </div>
                                ) : (
                                  <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Todavía no se ha creado ningún aval para esta forma de participación.
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
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
          <SectionCard
            title="Archivo adjunto"
            icon={<FileText className="h-4 w-4" aria-hidden="true" />}
            iconTone="indigo"
          >
            {/* Contorno y no relleno sólido: abrir el adjunto es una salida
                lateral, no la acción que la pantalla propone. */}
            <a
              href={evento.archivo}
              target="_blank"
              rel="noopener noreferrer"
              className={`${BUTTON_BASE} ${BUTTON_MD} gap-2 ${OUTLINE_BUTTON_CLASS}`}
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              Ver archivo
            </a>
          </SectionCard>
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
