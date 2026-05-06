"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { FileText, DollarSign, Paperclip, X, Hash } from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatters";
import { getTodayDateInputValue } from "@/lib/utils/formatters/dates";
import { useRouter } from "next/navigation";
import { createAval, uploadAdjuntosSolicitud } from "@/lib/api/avales";
import type { Aval } from "@/types/aval";

type FormData = {
  deportistas: Array<{
    id: number;
    deportistaExternoId?: string;
    nombre: string;
    apellido?: string;
    nombres?: string;
    apellidos?: string;
    cedula?: string;
    payload?: Record<string, unknown>;
    rol?: string;
  }>;
  entrenadores: Array<{ id: number; nombre: string }>;
  fechaEmision?: string;
  fechaHoraSalida: string;
  fechaHoraRetorno: string;
  lugarSalida: string;
  lugarRetorno: string;
  transporteSalida: string;
  transporteRetorno: string;
  objetivos: string[];
  criterios: string[];
  observaciones?: string;
  adjuntoSolicitud?: File | null;
};

type Paso04PresupuestoProps = {
  formData: FormData;
  onComplete: (data: Partial<FormData>) => void;
  onPreviewChange?: (data: Partial<FormData>) => void;
  onBack: () => void;
  avalId: number;
  aval: Aval;
};

export default function Paso04Presupuesto({
  formData,
  onBack,
  onPreviewChange,
  avalId,
  aval,
}: Paso04PresupuestoProps) {
  const router = useRouter();
  const [numeroAval, setNumeroAval] = useState("");
  const [observaciones, setObservaciones] = useState(
    formData.observaciones || "",
  );
  const [adjuntoSolicitud, setAdjuntoSolicitud] = useState<File | null>(
    formData.adjuntoSolicitud ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [createdAvalIdWithError, setCreatedAvalIdWithError] = useState<
    number | null
  >(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    onPreviewChange?.({ observaciones, adjuntoSolicitud });
  }, [observaciones, adjuntoSolicitud, onPreviewChange]);

  // Obtener los items de presupuesto del evento asociado
  const presupuestoItems = aval.evento?.presupuesto || [];

  const getTotalPresupuesto = () => {
    return presupuestoItems.reduce((sum, item) => {
      const valor = parseFloat(item.presupuesto) || 0;
      return sum + valor;
    }, 0);
  };

  const formatBytes = (value: number) => {
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleAdjuntoSolicitudChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setAdjuntoSolicitud(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let createdAvalId: number | null = null;

    try {
      setSubmitting(true);
      setError(null);
      setCreatedAvalIdWithError(null);

      // Preparar el payload según la estructura esperada por la API
      const payload = {
        coleccionAvalId: avalId,
        fechaEmision: formData.fechaEmision || getTodayDateInputValue(),
        numeroAval: numeroAval.trim() || undefined,
        fechaHoraSalida: formData.fechaHoraSalida,
        fechaHoraRetorno: formData.fechaHoraRetorno,
        lugarSalida: formData.lugarSalida,
        lugarRetorno: formData.lugarRetorno,
        transporteSalida: formData.transporteSalida,
        transporteRetorno: formData.transporteRetorno,
        objetivos: formData.objetivos.map((obj, index) => ({
          orden: index + 1,
          descripcion: obj,
        })),
        criterios: formData.criterios.map((crit, index) => ({
          orden: index + 1,
          descripcion: crit,
        })),
        deportistas: formData.deportistas.map((d) => ({
          deportistaExternoId: d.deportistaExternoId ?? String(d.id),
          rol: d.rol ?? "ATLETA",
          nombre: d.nombre?.trim() || undefined,
          apellido: d.apellido?.trim() || undefined,
          nombres: d.nombres?.trim() || undefined,
          apellidos: d.apellidos?.trim() || undefined,
          cedula: d.cedula?.trim() || undefined,
          payload: d.payload,
        })),
        entrenadores: formData.entrenadores.map((e, index) => ({
          entrenadorId: e.id,
          rol: index === 0 ? "ENTRENADOR PRINCIPAL" : "ENTRENADOR",
          esPrincipal: index === 0,
        })),
        observaciones: observaciones.trim() || undefined,
      };

      const response = await createAval(payload);
      createdAvalId = response.data.id;

      if (adjuntoSolicitud) {
        await uploadAdjuntosSolicitud(createdAvalId, [adjuntoSolicitud]);
      }

      router.push(`/avales/${createdAvalId}?status=created`);
    } catch (err: any) {
      console.error("Error al crear el aval:", err);
      if (createdAvalId) {
        setCreatedAvalIdWithError(createdAvalId);
        setError(
          err?.message ??
            "El aval se creó, pero hubo un problema al subir el documento adjunto.",
        );
      } else {
        setError(err?.message ?? "No se pudo crear el aval técnico");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl text-gray-800 dark:text-gray-100 font-bold mb-2">
        Requerimientos del Evento
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Revisa los requerimientos registrados para este evento.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Info banner
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-300">
              <p className="font-medium mb-1">Información del presupuesto</p>
              <p>
                La única manera de cambiar el presupuesto es solicitando una
                reforma directamente desde el evento. Esta sección es solo
                informativa para la creación del aval.
              </p>
            </div>
          </div>
        </div>
        */}
        {/* Items del Evento */}
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-4 flex items-start gap-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-2 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Requerimientos del evento
              </h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Revisa los requerimientos registrados para esta
                solicitud.
              </p>
            </div>
          </div>

          {presupuestoItems.length > 0 ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50/70 dark:border-gray-700 dark:bg-gray-800/60">
              <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {presupuestoItems.length}{" "}
                  {presupuestoItems.length === 1 ? "requerimiento" : "requerimientos"}
                </p>
              </div>

              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {presupuestoItems.map((presupuestoItem) => {
                  const valor = parseFloat(presupuestoItem.presupuesto) || 0;

                  return (
                    <div key={presupuestoItem.id} className="px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-gray-100">
                            {presupuestoItem.item.nombre}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="whitespace-nowrap font-semibold text-gray-900 dark:text-gray-100">
                            {formatCurrency(valor)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900/60">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Total presupuesto
                </p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(getTotalPresupuesto())}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800">
              <DollarSign className="mx-auto mb-3 h-12 w-12 text-gray-400" />
              <p className="text-gray-600 dark:text-gray-400">
                No hay requerimientos asociados a este evento.
              </p>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-3 flex items-start gap-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-2 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
              <Paperclip className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Documento adjunto a la solicitud
              </h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Sube un archivo de respaldo opcional para complementar esta
                solicitud.
              </p>
            </div>
          </div>
          <input
            type="file"
            onChange={handleAdjuntoSolicitudChange}
            className="form-input w-full border-gray-200 bg-white file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200 dark:border-gray-700 dark:bg-gray-950 dark:file:bg-gray-800 dark:file:text-gray-200"
          />
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Puedes adjuntar un solo archivo importante de respaldo para esta
            solicitud.
          </p>
          {adjuntoSolicitud && (
            <div className="mt-3 flex items-start justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="min-w-0">
                <p className="truncate font-medium text-gray-900 dark:text-gray-100">
                  {adjuntoSolicitud.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatBytes(adjuntoSolicitud.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAdjuntoSolicitud(null)}
                className="text-gray-400 hover:text-rose-600 dark:hover:text-rose-400"
                aria-label="Quitar documento adjunto"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </section>

        {/* Número de Aval */}
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-3 flex items-start gap-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-2 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
              <Hash className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Número de la solicitud
              </h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Número identificador de la solicitud (ej: 001, 002, etc.)
              </p>
            </div>
          </div>
          <input
            type="text"
            value={numeroAval}
            onChange={(e) => setNumeroAval(e.target.value)}
            placeholder="001"
            className="form-input w-full border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
          />
        </section>

        {/* Observaciones generales */}
        <section className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 p-4 dark:border-gray-700 dark:bg-gray-800/60">
          <div className="mb-3 flex items-start gap-3">
            <div className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Observaciones generales
              </h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Usa este espacio para escribir notas o contexto adicional que no
                dependa de un archivo adjunto.
              </p>
            </div>
          </div>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Información adicional relevante para el aval..."
            rows={4}
            className="form-textarea w-full border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
          />
        </section>

        {/* Error message */}
        {error && (
          <div className="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-sm rounded-lg px-4 py-3">
            <p>{error}</p>
            {createdAvalIdWithError && (
              <a
                href={`/avales/${createdAvalIdWithError}`}
                className="mt-2 inline-flex items-center gap-2 font-medium underline"
              >
                Ir al detalle del aval creado
              </a>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onBack}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-50"
          >
            ← Anterior
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn bg-green-500 hover:bg-green-600 text-white disabled:opacity-50"
          >
            {submitting ? "Creando aval..." : "Crear aval técnico"}
          </button>
        </div>
      </form>
    </div>
  );
}
