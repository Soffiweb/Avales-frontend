"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, MapPin, Users, Search } from "lucide-react";

import AlertBanner from "@/components/ui/alert-banner";
import AvalUploadOptions from "@/components/ui/aval-upload-options";
import UploadModal from "@/components/ui/upload-modal";
import { uploadConvocatoria } from "@/lib/api/avales";
import { listEventos, type ListEventosOptions } from "@/lib/api/eventos";
import {
  eventoTieneFondosPublicos,
  isEventoIncompleto,
  type Evento,
} from "@/types/evento";
import type { TipoAval } from "@/types/aval";
import { useAuth } from "@/app/providers/auth-provider";
import { getNormalizedRoles, isAdminUser } from "@/lib/auth/access";
import {
  formatEventScheduleLabel,
  formatLocationWithProvince,
  getCalendarDateTimestamp,
} from "@/lib/utils/formatters";

const PAGE_SIZE = 6;
const FETCH_LIMIT = 20;

function getTotalParticipants(evento: Evento) {
  return (
    (evento.numAtletasHombres || 0) +
    (evento.numAtletasMujeres || 0) +
    (evento.numEntrenadoresHombres || 0) +
    (evento.numEntrenadoresMujeres || 0)
  );
}

function getEventSortTimestamp(evento: Evento) {
  const start = getCalendarDateTimestamp(evento.fechaInicio);
  if (start !== null) return start;
  const end = getCalendarDateTimestamp(evento.fechaFin);
  if (end !== null) return end;
  if (evento.mesProgramado) {
    return new Date(
      new Date().getFullYear(),
      evento.mesProgramado - 1,
      1,
    ).getTime();
  }
  return 0;
}

export default function NuevoAvalPage() {
  const router = useRouter();
  const { user } = useAuth();

  // Event selection
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tipoAval, setTipoAval] = useState<TipoAval>("FONDOS_PUBLICOS");

  // Submission
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedEvento, setSelectedEvento] = useState<Evento | null>(null);

  const userRoles = getNormalizedRoles(user);
  const isEntrenador = userRoles.includes("ENTRENADOR") && !isAdminUser(user);
  const isComprasPublicas = userRoles.includes("COMPRAS_PUBLICAS");
  const primaryDisciplinaId = user?.disciplinaId ?? undefined;
  const eventoSeleccionadoTieneFondosPublicos =
    eventoTieneFondosPublicos(selectedEvento);

  useEffect(() => {
    if (!selectedEvento) return;
    if (eventoSeleccionadoTieneFondosPublicos) return;
    if (tipoAval === "FONDOS_PUBLICOS") {
      setTipoAval("AUTOGESTION");
    }
  }, [selectedEvento, eventoSeleccionadoTieneFondosPublicos, tipoAval]);

  useEffect(() => {
    if (isComprasPublicas) {
      router.replace("/avales");
    }
  }, [isComprasPublicas, router]);

  const fetchEventos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const baseOptions: ListEventosOptions = {
        limit: FETCH_LIMIT,
        estado: "DISPONIBLE",
        search: search.trim() || undefined,
        disciplinaId: isEntrenador ? undefined : primaryDisciplinaId,
      };

      const collected = new Map<number, Evento>();
      let page = 1;
      let total = Number.POSITIVE_INFINITY;
      let pageLimit = FETCH_LIMIT;

      while (collected.size < PAGE_SIZE && (page - 1) * pageLimit < total) {
        const res = await listEventos({ ...baseOptions, page });
        const items = res.data ?? [];
        const meta = res.meta;

        for (const item of items) {
          collected.set(item.id, item);
        }

        total =
          typeof meta?.total === "number" && meta.total >= 0
            ? meta.total
            : collected.size;
        pageLimit =
          typeof meta?.limit === "number" && meta.limit > 0
            ? meta.limit
            : FETCH_LIMIT;

        if (items.length === 0) break;
        page += 1;
      }

      const sorted = [...collected.values()].sort(
        (a, b) => getEventSortTimestamp(b) - getEventSortTimestamp(a),
      );
      setEventos(sorted.slice(0, PAGE_SIZE));
    } catch (err: any) {
      console.error("Error al cargar eventos:", err);
      setError(err?.message ?? "No se pudieron cargar los eventos.");
    } finally {
      setLoading(false);
    }
  }, [search, isEntrenador, primaryDisciplinaId]);

  useEffect(() => {
    void fetchEventos();
  }, [fetchEventos]);

  const handleEventSelect = (evento: Evento) => {
    if (isComprasPublicas) {
      setSubmitError("Tu rol no tiene permisos para crear avales.");
      return;
    }

    if (isEventoIncompleto(evento)) {
      const next = `/eventos/${evento.id}`;
      router.push(
        `/eventos/${evento.id}/editar?mode=complete&next=${encodeURIComponent(next)}`,
      );
      return;
    }

    setSelectedEvento(evento);
    setUploadModalOpen(true);
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
    if (!selectedEvento) {
      throw new Error("No se ha seleccionado un evento.");
    }

    // if (!eventoTieneFondosPublicos(selectedEvento) && tipoAval === "FONDOS_PUBLICOS") {
    //   throw new Error(
    //     "Este evento no tiene presupuesto. Solo puedes crear avales por autogestión o solo resultados.",
    //   );
    // }

    const response = await uploadConvocatoria(
      selectedEvento.id,
      convocatoria,
      certificadoMedico,
      pronosticoDeportistas,
      { tipoAval },
    );

    setUploadModalOpen(false);
    setSelectedEvento(null);
    const params = new URLSearchParams({ tipoAval });
    router.push(
      `/avales/${response.data.id}/crear-solicitud?${params.toString()}`,
    );
  };

  return (
    <>
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
        onClose={() => {
          setUploadModalOpen(false);
          setSelectedEvento(null);
        }}
        onUpload={handleUploadConvocatoria}
        title="Subir documentos obligatorios"
        description={`Sube la convocatoria y el certificado médico para crear el aval${
          selectedEvento?.nombre ? ` de "${selectedEvento.nombre}"` : ""
        }.`}
      >
        <AvalUploadOptions
          evento={selectedEvento}
          tipoAval={tipoAval}
          onTipoAvalChange={setTipoAval}
        />
      </UploadModal>

      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <Link
            href="/avales"
            className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a mis avales
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Crear nuevo aval
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Selecciona el evento y luego completa el tipo de aval en el modal de
            carga.
          </p>
        </div>

        {/* Buscador */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            className="form-input w-full pl-10"
            placeholder="Buscar evento por nombre, lugar o código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Info de disciplina para entrenadores */}
        {isEntrenador && user?.disciplina?.nombre && (
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg px-4 py-3 text-sm text-indigo-700 dark:text-indigo-300">
            <div className="flex items-start gap-2">
              <svg
                className="w-5 h-5 shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                Solo puedes ver eventos de tu disciplina:{" "}
                <strong>{user.disciplina.nombre}</strong>
              </div>
            </div>
          </div>
        )}

        {/* Lista de eventos */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
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
        ) : error ? (
          <div className="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl p-6 text-center">
            {error}
          </div>
        ) : eventos.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center text-gray-500 dark:text-gray-400">
            <p className="mb-2">No hay eventos disponibles.</p>
            <p className="text-sm">
              {search
                ? "Intenta con otros términos de búsqueda."
                : "No se encontraron eventos para tu disciplina."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {eventos.map((evento) => (
              <button
                key={evento.id}
                type="button"
                onClick={() => handleEventSelect(evento)}
                className="text-left bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 transition-all border-2 border-transparent hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-200">
                        Disponible
                      </span>
                      {evento.alcance && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {evento.alcance}
                        </span>
                      )}
                    </div>
                    <h3
                      className="font-semibold leading-snug text-gray-900 dark:text-gray-100"
                      style={{
                        display: "-webkit-box",
                        WebkitBoxOrient: "vertical",
                        WebkitLineClamp: 2,
                        overflow: "hidden",
                      }}
                      title={evento.nombre || "Sin nombre"}
                    >
                      {evento.nombre || "Sin nombre"}
                    </h3>
                    {evento.codigo && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {evento.codigo}
                      </p>
                    )}
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {evento.tipoEvento && (
                    <span className="inline-flex items-center rounded-md bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                      {evento.tipoEvento}
                    </span>
                  )}
                  {evento.disciplina?.nombre && (
                    <span className="inline-flex items-center rounded-md bg-purple-50 dark:bg-purple-900/30 px-2 py-1 text-xs font-medium text-purple-700 dark:text-purple-300">
                      {evento.disciplina.nombre}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="mt-3 space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                    <span>{formatEventScheduleLabel(evento)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="truncate">
                      {formatLocationWithProvince(evento)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400 shrink-0" />
                    <span>{getTotalParticipants(evento)} participantes</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
