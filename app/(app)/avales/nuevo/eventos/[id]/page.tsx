"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  FileText,
  Tag,
  Globe,
  Trophy,
  Upload,
  ClipboardEdit,
} from "lucide-react";

import AlertBanner from "@/components/ui/alert-banner";
import AvalUploadOptions from "@/components/ui/aval-upload-options";
import EventoIncompletoBadge from "@/components/ui/evento-incompleto-badge";
import UploadModal from "@/components/ui/upload-modal";
import { useAuth } from "@/app/providers/auth-provider";
import { canCreateReforma } from "@/lib/auth/access";
import { getEvento } from "@/lib/api/eventos";
import { uploadConvocatoria, getAvalesByEvento } from "@/lib/api/avales";
import { listReformsByEvento } from "@/lib/api/reforms";
import {
  eventoTieneFondosPublicos,
  getEventoMissingFieldLabel,
  getEventoMissingFields,
  isEventoIncompleto,
  type Evento,
} from "@/types/evento";
import type { Aval, TipoAval } from "@/types/aval";
import { calcularTotalEvento } from "@/types/evento";
import {
  formatEventScheduleLabel,
  formatLocationWithProvince,
  formatCurrency,
} from "@/lib/utils/formatters";
import { formatCategoryLabel } from "@/lib/utils/categories";
import { getEventoTipoParticipacionLabel, getTipoAvalLabel, getApprovalStageLabel } from "@/lib/constants";

function getTotalParticipants(evento: Evento) {
  return (
    (evento.numAtletasHombres || 0) +
    (evento.numAtletasMujeres || 0) +
    (evento.numEntrenadoresHombres || 0) +
    (evento.numEntrenadoresMujeres || 0)
  );
}

export default function EventoDetailForAvalPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const id = Number(params.id);

  const [evento, setEvento] = useState<Evento | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [tipoAval, setTipoAval] = useState<TipoAval>("FONDOS_PUBLICOS");
  const [pendingReformId, setPendingReformId] = useState<number | null>(null);
  const [avalesEvento, setAvalesEvento] = useState<Aval[]>([]);
  const completedStatus = searchParams.get("status") === "completed";

  useEffect(() => {
    if (!id || Number.isNaN(id)) {
      setError("ID de evento inválido");
      setLoading(false);
      return;
    }

    async function fetchEvento() {
      try {
        setLoading(true);
        setError(null);
        const res = await getEvento(id);
        setEvento(res.data);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "No se pudo cargar el evento.",
        );
      } finally {
        setLoading(false);
      }
    }

    void fetchEvento();
  }, [id]);

  useEffect(() => {
    if (!evento?.id) return;
    getAvalesByEvento(evento.id)
      .then((res) => setAvalesEvento(res.data ?? []))
      .catch(() => setAvalesEvento([]));
  }, [evento?.id]);

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

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-6xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !evento) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-6xl mx-auto space-y-4">
        <AlertBanner
          variant="error"
          message={error ?? "Evento no encontrado"}
          onClose={() => setError(null)}
        />
        <Link
          href="/avales/nuevo"
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a crear aval
        </Link>
      </div>
    );
  }

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
          `/avales/nuevo/eventos/${evento.id}`,
        )}`,
      );
      throw new Error("Completa los datos faltantes del evento antes de crear el aval.");
    }

    if (!eventoTieneFondosPublicos(evento) && tipoAval === "FONDOS_PUBLICOS") {
      throw new Error(
        "Este evento no tiene presupuesto. Solo puedes crear avales por autogestión o solo resultados.",
      );
    }

    const response = await uploadConvocatoria(
      evento.id,
      convocatoria,
      certificadoMedico,
      pronosticoDeportistas,
      { tipoAval },
    );
    setUploadModalOpen(false);
    const params = new URLSearchParams({ tipoAval });
    router.push(`/avales/${response.data.id}/crear-solicitud?${params.toString()}`);
  };

  const isAvailable = evento.estado === "DISPONIBLE";
  const hasPendingReform = Boolean(evento.tieneReformaPendiente);
  const eventoIncompleto = isEventoIncompleto(evento);
  const missingFields = getEventoMissingFields(evento);
  const canCreateAval = isAvailable && !hasPendingReform && !eventoIncompleto;
  const canManageReforms = canCreateReforma(user);
  const canRequestReforma = canManageReforms && !hasPendingReform;
  const completionHref = `/eventos/${evento.id}/editar?mode=complete&next=${encodeURIComponent(
    `/avales/nuevo/eventos/${evento.id}`,
  )}`;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-6xl mx-auto space-y-6">
      {submitError && (
        <div className="fixed top-4 right-4 z-50 max-w-sm w-full drop-shadow-lg">
          <AlertBanner
            variant="error"
            message={submitError}
            onClose={() => setSubmitError(null)}
          />
        </div>
      )}
      {completedStatus && (
        <div className="fixed top-4 right-4 z-50 max-w-sm w-full drop-shadow-lg">
          <AlertBanner
            variant="success"
            message="Datos del evento completados."
            description="Ya puedes continuar con la creación del aval."
            onClose={() => router.replace(`/avales/nuevo/eventos/${evento.id}`)}
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

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Link
            href="/avales/nuevo"
            className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a crear aval
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
            {evento.nombre}
          </h1>
          {eventoIncompleto ? (
            <div className="mt-2">
              <EventoIncompletoBadge />
            </div>
          ) : null}
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {evento.codigo || "Sin código"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {eventoIncompleto ? (
            <Link
              href={completionHref}
              className="btn bg-amber-500 hover:bg-amber-600 text-white"
            >
              <Upload className="w-4 h-4 mr-2" />
              Completar datos
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (!canCreateAval) {
                  if (hasPendingReform) {
                    setSubmitError(
                      "Este evento tiene una reforma pendiente. No se puede crear un aval hasta que se apruebe o rechace.",
                    );
                    return;
                  }
                  setSubmitError("Solo puedes crear aval para eventos disponibles.");
                  return;
                }
                setUploadModalOpen(true);
              }}
              className="btn bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Upload className="w-4 h-4 mr-2" />
              Crear aval
            </button>
          )}
          {canManageReforms ? canRequestReforma ? (
            <Link
              href={`/eventos/${evento.id}/reforma`}
              className="btn bg-amber-500 hover:bg-amber-600 text-white"
            >
              <ClipboardEdit className="w-4 h-4 mr-2" />
              Solicitar reforma
            </Link>
          ) : (
            <>
              <button
                type="button"
                disabled
                className="btn bg-gray-300 text-gray-600 cursor-not-allowed dark:bg-gray-700 dark:text-gray-300"
              >
                <ClipboardEdit className="w-4 h-4 mr-2" />
                Reforma no disponible
              </button>
              {hasPendingReform && pendingReformId ? (
                <Link
                  href={`/reformas/${pendingReformId}`}
                  className="btn border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/30"
                >
                  Ver reforma
                </Link>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      {eventoIncompleto && (
        <AlertBanner
          variant="error"
          message="Completa los datos faltantes del evento antes de crear el aval."
          description={`Faltan: ${missingFields.map(getEventoMissingFieldLabel).join(", ")}.`}
        />
      )}

      {hasPendingReform ? (
        <AlertBanner
          variant="error"
          message="Este evento tiene una reforma pendiente."
          description={
            pendingReformId
              ? "No se puede crear un aval ni solicitar otra reforma hasta que la actual se apruebe o rechace. Puedes abrir el detalle de la reforma."
              : "No se puede crear un aval ni solicitar otra reforma hasta que la actual se apruebe o rechace."
          }
        />
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="w-4 h-4 text-gray-400" />
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Código</p>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">{evento.codigo || "-"}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-4 h-4 text-gray-400" />
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Tipo evento</p>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">{evento.tipoEvento || "-"}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-gray-400" />
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Participación</p>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {getEventoTipoParticipacionLabel(evento.tipoParticipacion) ?? "-"}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="w-4 h-4 text-gray-400" />
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Alcance</p>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">{evento.alcance || "-"}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Fechas</p>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {formatEventScheduleLabel(evento)}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-gray-400" />
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Ubicación</p>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {formatLocationWithProvince(evento)}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-gray-400" />
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Participantes</p>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {getTotalParticipants(evento)} participantes
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="w-4 h-4 text-gray-400" />
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Clasificación</p>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Disciplina: {evento.disciplina?.nombre || "-"}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Categoría: {formatCategoryLabel(
              evento.categoria?.nombre ?? evento.categoriaCodigo
            )}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Género: {evento.genero || "-"}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Estado</p>
          <p className="text-sm text-gray-700 dark:text-gray-300">{evento.estado || "-"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Cargado por Excel</p>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {evento.cargadoPorExcel ? "Sí" : "No"}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Creado</p>
          <p className="text-sm text-gray-700 dark:text-gray-300">{evento.createdAt || "-"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Actualizado</p>
          <p className="text-sm text-gray-700 dark:text-gray-300">{evento.updatedAt || "-"}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-400" />
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Presupuesto del evento
          </p>
        </div>

        {evento.eventoItems?.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/40 text-gray-500 dark:text-gray-400 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-2 text-left">Item</th>
                    <th className="px-4 py-2 text-left">Actividad</th>
                    <th className="px-4 py-2 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  {evento.eventoItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                        {item.item.numero}. {item.item.nombre}
                      </td>
                      <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                        {item.item.actividad?.numero}. {item.item.actividad?.nombre}
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-gray-900 dark:text-gray-100">
                        {formatCurrency(parseFloat(item.presupuesto) || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 text-right text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              Total: {formatCurrency(calcularTotalEvento(evento))}
            </div>
          </>
        ) : (
          <div className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">
            No hay items presupuestarios registrados.
          </div>
        )}
      </div>

      {/* Avales asociados al evento */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-gray-400" />
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Avales asociados a este evento
          </p>
          {avalesEvento.length > 0 && (
            <span className="ml-auto inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300">
              {avalesEvento.length}
            </span>
          )}
        </div>
        {avalesEvento.length === 0 ? (
          <div className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">
            No hay avales creados para este evento todavía.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {avalesEvento.map((aval) => (
              <div key={aval.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                      {getTipoAvalLabel(aval.tipoAval)}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {getApprovalStageLabel(aval.etapaActual ?? "SOLICITUD")}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        aval.estado === "ACEPTADO"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : aval.estado === "RECHAZADO"
                            ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                      }`}
                    >
                      {aval.estado}
                    </span>
                  </div>
                  {typeof aval.montoSolicitado === "number" && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Solicitado: {formatCurrency(aval.montoSolicitado)}
                    </p>
                  )}
                </div>
                <Link
                  href={`/avales/${aval.id}`}
                  className="shrink-0 text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  Ver →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
