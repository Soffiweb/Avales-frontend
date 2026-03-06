"use client";

import { useEffect, useState } from "react";
import { FileText, DollarSign, Info } from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatters";
import { useRouter } from "next/navigation";
import { createAval } from "@/lib/api/avales";
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
  fechaHoraSalida: string;
  fechaHoraRetorno: string;
  lugarSalida: string;
  lugarRetorno: string;
  transporteSalida: string;
  transporteRetorno: string;
  objetivos: string[];
  criterios: string[];
  observaciones?: string;
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
  const [observaciones, setObservaciones] = useState(
    formData.observaciones || ""
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    onPreviewChange?.({ observaciones });
  }, [observaciones, onPreviewChange]);

  // Obtener los items de presupuesto del evento asociado
  const presupuestoItems = aval.evento?.presupuesto || [];

  const getTotalPresupuesto = () => {
    return presupuestoItems.reduce((sum, item) => {
      const valor = parseFloat(item.presupuesto) || 0;
      return sum + valor;
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      setError(null);

      // Preparar el payload según la estructura esperada por la API
      const payload = {
        coleccionAvalId: avalId,
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

      await createAval(payload);

      // Redirigir a la lista de avales con mensaje de éxito
      router.push("/avales?status=created");
    } catch (err: any) {
      console.error("Error al crear el aval:", err);
      setError(err?.message ?? "No se pudo crear el aval técnico");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl text-gray-800 dark:text-gray-100 font-bold mb-2">
        Presupuesto del Evento
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Revisa los items presupuestarios asociados al evento {aval.evento?.nombre}.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Info banner */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-300">
              <p className="font-medium mb-1">Información del presupuesto</p>
              <p>
                Los items presupuestarios están asociados al evento y no pueden ser modificados desde aquí.
                Esta es solo una vista informativa de los gastos planificados.
              </p>
            </div>
          </div>
        </div>

        {/* Items del Evento */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Items presupuestarios del evento
          </label>

          {presupuestoItems.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {presupuestoItems.length}{" "}
                  {presupuestoItems.length === 1 ? "item" : "items"}
                </p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Total: {formatCurrency(getTotalPresupuesto())}
                </p>
              </div>

              <div className="space-y-2">
                {presupuestoItems.map((presupuestoItem) => {
                  const valor = parseFloat(presupuestoItem.presupuesto) || 0;

                  return (
                    <div
                      key={presupuestoItem.id}
                      className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-gray-100">
                            {presupuestoItem.item.nombre}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Item #{presupuestoItem.item.numero}
                          </p>
                          <div className="flex gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                            <span>Mes: {presupuestoItem.mes}</span>
                            <span>Actividad: {presupuestoItem.item.actividad.nombre}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                            {formatCurrency(valor)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center">
              <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">
                No hay items presupuestarios asociados a este evento.
              </p>
            </div>
          )}
        </div>

        {/* Observaciones generales */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Observaciones generales (opcional)
            </div>
          </label>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Información adicional relevante para el aval..."
            rows={4}
            className="form-textarea w-full"
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-sm rounded-lg px-4 py-3">
            {error}
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
