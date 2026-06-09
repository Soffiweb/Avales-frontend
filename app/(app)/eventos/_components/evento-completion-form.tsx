"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { ApiError } from "@/lib/api/client";
import { getCatalog } from "@/lib/api/catalog";
import {
  completeEventoDatos,
  type CompleteEventoDatosPayload,
} from "@/lib/api/eventos";
import {
  EVENTO_ALCANCE_OPTIONS,
  EVENTO_TAREA_OPTIONS,
  normalizeEventoAlcance,
  normalizeEventoTipoEvento,
} from "@/lib/constants";
import { getCategoryIdOptions } from "@/lib/utils/categories";
import type { CatalogItem } from "@/types/catalog";
import {
  getEventoEditableCompletionFields,
  getEventoMissingFieldLabel,
  getEventoMissingFields,
  type Evento,
  type EventoMissingField,
} from "@/types/evento";

type CompletionFormValues = {
  categoriaId: number | "";
  alcance: string;
  tipoEvento: string;
  fechaInicio: string;
  fechaFin: string;
};

type Props = {
  evento: Evento;
  onCompleted?: (evento: Evento) => Promise<void>;
};

const FIELD_HELPERS: Record<EventoMissingField, string> = {
  genero: "Se calculará automáticamente según los deportistas seleccionados.",
  alcance: "Este campo ya no se completa en este flujo.",
  tipoParticipacion: "Este campo ya no se completa en este flujo.",
  categoriaId: "Selecciona la categoría deportiva correspondiente.",
  tipoEvento: "Este campo ya no se completa en este flujo.",
  fechaInicio: "Registra la fecha inicial del evento.",
  fechaFin: "Registra la fecha final del evento.",
};

export default function EventoCompletionForm({ evento, onCompleted }: Props) {
  const editableFields = useMemo(
    () => getEventoEditableCompletionFields(evento),
    [evento],
  );
  const completionFields = useMemo(
    () =>
      editableFields.filter(
        (field): field is keyof CompleteEventoDatosPayload =>
          field === "categoriaId" ||
          field === "alcance" ||
          field === "tipoEvento" ||
          field === "tipoParticipacion" ||
          field === "genero" ||
          field === "fechaInicio" ||
          field === "fechaFin",
      ),
    [editableFields],
  );
  const missingFields = useMemo(() => getEventoMissingFields(evento), [evento]);
  const needsCategoria = editableFields.includes("categoriaId");

  const [categorias, setCategorias] = useState<CatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const categoriaOptions = useMemo(
    () => getCategoryIdOptions(categorias),
    [categorias],
  );

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CompletionFormValues>({
    defaultValues: {
      categoriaId: evento.categoriaId ?? "",
      alcance: normalizeEventoAlcance(evento.alcance) ?? "",
      tipoEvento: normalizeEventoTipoEvento(evento.tipoEvento) ?? "",
      fechaInicio: evento.fechaInicio ?? "",
      fechaFin: evento.fechaFin ?? "",
    },
  });

  useEffect(() => {
    if (!needsCategoria) return;

    async function loadCatalog() {
      try {
        setCatalogLoading(true);
        setCatalogError(null);
        const response = await getCatalog();
        setCategorias(response.data?.categorias ?? []);
      } catch (err: unknown) {
        setCatalogError(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar las categorías.",
        );
        setCategorias([]);
      } finally {
        setCatalogLoading(false);
      }
    }

    void loadCatalog();
  }, [needsCategoria]);

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);

    const payload: CompleteEventoDatosPayload = {};

    completionFields.forEach((field) => {
      const value = values[field as keyof CompletionFormValues];
      if (value === "" || value === undefined || value === null) {
        setError(field as keyof CompletionFormValues, {
          type: "required",
          message: `Completa ${getEventoMissingFieldLabel(field)}.`,
        });
        return;
      }

      if (field === "categoriaId") {
        payload.categoriaId = Number(value);
        return;
      }

      if (field === "alcance") {
        payload.alcance = normalizeEventoAlcance(String(value)) ?? String(value);
        return;
      }

      if (field === "tipoEvento") {
        payload.tipoEvento = normalizeEventoTipoEvento(String(value)) ?? String(value);
        return;
      }

      if (field === "fechaInicio") {
        payload.fechaInicio = String(value);
        return;
      }

      if (field === "fechaFin") {
        payload.fechaFin = String(value);
      }
    });

    if (completionFields.some((field) => payload[field] === undefined)) {
      return;
    }

    try {
      const response = await completeEventoDatos(evento.id, payload);
      await onCompleted?.(response.data);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.problem?.field) {
        const field = err.problem.field as keyof CompletionFormValues;
        setError(field, {
          type: "server",
          message: err.problem.detail ?? err.problem.title ?? err.message,
        });
      }

      setSubmitError(
        err instanceof ApiError
          ? (err.problem?.detail ?? err.problem?.title ?? err.message)
          : err instanceof Error
            ? err.message
            : "No se pudieron completar los datos del evento.",
      );
    }
  });

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl bg-white shadow-sm dark:bg-gray-800"
    >
      <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-700/60">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">
          Completar datos del evento
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Completa los campos obligatorios para continuar con la creación del
          aval.
        </p>
      </div>

      <div className="space-y-5 p-5">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800/60 dark:bg-amber-900/20 dark:text-amber-100">
          <p className="font-medium">
            Faltan datos obligatorios en este evento.
          </p>
          <p className="mt-1">
            Debes completar:{" "}
            {missingFields.map(getEventoMissingFieldLabel).join(", ")}.
          </p>
        </div>

        {editableFields.includes("categoriaId") && (
          <div>
            <label
              className="mb-1 block text-sm font-medium"
              htmlFor="categoriaId"
            >
              Categoría
            </label>
            <select
              id="categoriaId"
              className="form-select w-full max-w-lg"
              disabled={catalogLoading}
              {...register("categoriaId", {
                required: "Completa categoría.",
                setValueAs: (value) => (value === "" ? "" : Number(value)),
              })}
            >
              <option value="">
                {catalogLoading
                  ? "Cargando categorías..."
                  : "Selecciona una categoría"}
              </option>
              {categoriaOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.nombre}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {FIELD_HELPERS.categoriaId}
            </p>
            {catalogError && (
              <p className="mt-1 text-xs text-red-600">{catalogError}</p>
            )}
            {errors.categoriaId && (
              <p className="mt-1 text-xs text-red-600">
                {errors.categoriaId.message}
              </p>
            )}
          </div>
        )}

        {editableFields.includes("alcance") && (
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="alcance">
              Alcance
            </label>
            <select
              id="alcance"
              className="form-select w-full max-w-xs"
              {...register("alcance", {
                required: "Completa alcance.",
              })}
            >
              <option value="">Selecciona una opción</option>
              {EVENTO_ALCANCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {FIELD_HELPERS.alcance}
            </p>
            {errors.alcance && (
              <p className="mt-1 text-xs text-red-600">{errors.alcance.message}</p>
            )}
          </div>
        )}

        {editableFields.includes("fechaInicio") && (
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="fechaInicio">
              Fecha de inicio
            </label>
            <input
              id="fechaInicio"
              type="date"
              className="form-input w-full max-w-xs"
              {...register("fechaInicio", {
                required: "Completa fecha de inicio.",
              })}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {FIELD_HELPERS.fechaInicio}
            </p>
            {errors.fechaInicio && (
              <p className="mt-1 text-xs text-red-600">{errors.fechaInicio.message}</p>
            )}
          </div>
        )}

        {editableFields.includes("fechaFin") && (
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="fechaFin">
              Fecha de fin
            </label>
            <input
              id="fechaFin"
              type="date"
              className="form-input w-full max-w-xs"
              {...register("fechaFin", {
                required: "Completa fecha de fin.",
              })}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {FIELD_HELPERS.fechaFin}
            </p>
            {errors.fechaFin && (
              <p className="mt-1 text-xs text-red-600">{errors.fechaFin.message}</p>
            )}
          </div>
        )}

        {editableFields.includes("tipoEvento") && (
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="tipoEvento">
              Tipo de evento
            </label>
            <select
              id="tipoEvento"
              className="form-select w-full max-w-xs"
              {...register("tipoEvento", {
                required: "Completa tipo de evento.",
              })}
            >
              <option value="">Selecciona una opción</option>
              {EVENTO_TAREA_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {FIELD_HELPERS.tipoEvento}
            </p>
            {errors.tipoEvento && (
              <p className="mt-1 text-xs text-red-600">{errors.tipoEvento.message}</p>
            )}
          </div>
        )}

        {submitError && <p className="text-sm text-red-600">{submitError}</p>}

        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={isSubmitting || (needsCategoria && catalogLoading)}
            className="btn bg-indigo-600 text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Guardando..." : "Guardar y continuar"}
          </button>
        </div>
      </div>
    </form>
  );
}
