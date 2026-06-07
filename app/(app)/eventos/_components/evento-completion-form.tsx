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
  EVENTO_GENERO_OPTIONS,
  EVENTO_TAREA_OPTIONS,
  EVENTO_TIPO_PARTICIPACION_OPTIONS,
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
  genero: "" | "MASCULINO" | "FEMENINO" | "MASCULINO_FEMENINO";
  alcance: string;
  tipoParticipacion: string;
  categoriaId: number | "";
  tipoEvento: string;
};

type Props = {
  evento: Evento;
  onCompleted?: (evento: Evento) => Promise<void>;
};

const FIELD_HELPERS: Record<EventoMissingField, string> = {
  genero: "Selecciona el género oficial del evento.",
  alcance: "Indica si el evento es nacional o internacional.",
  tipoParticipacion: "Define la modalidad de participación del evento.",
  categoriaId: "Selecciona la categoría deportiva correspondiente.",
  tipoEvento: "Selecciona el tipo de evento registrado.",
};

export default function EventoCompletionForm({ evento, onCompleted }: Props) {
  const editableFields = useMemo(
    () => getEventoEditableCompletionFields(evento),
    [evento],
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
      genero: evento.genero ?? "",
      alcance: evento.alcance ?? "",
      tipoParticipacion: evento.tipoParticipacion ?? "",
      categoriaId: evento.categoriaId ?? "",
      tipoEvento: evento.tipoEvento ?? "",
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
          err instanceof Error ? err.message : "No se pudieron cargar las categorías.",
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

    const payload: Partial<CompleteEventoDatosPayload> = {};

    editableFields.forEach((field) => {
      const value = values[field];
      if (value === "" || value === undefined || value === null) {
        setError(field, {
          type: "required",
          message: `Completa ${getEventoMissingFieldLabel(field)}.`,
        });
        return;
      }
      if (field === "categoriaId") {
        payload[field] = Number(value);
        return;
      }
      if (field === "genero") {
        payload.genero = value as CompleteEventoDatosPayload["genero"];
        return;
      }
      if (field === "alcance") {
        payload.alcance = String(value);
        return;
      }
      if (field === "tipoParticipacion") {
        payload.tipoParticipacion = String(value);
        return;
      }
      if (field === "tipoEvento") {
        payload.tipoEvento = String(value);
      }
    });

    if (editableFields.some((field) => !payload[field])) {
      return;
    }

    try {
      const response = await completeEventoDatos(evento.id, payload);
      await onCompleted?.(response.data);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.problem?.field) {
        const field = err.problem.field as EventoMissingField;
        setError(field, {
          type: "server",
          message: err.problem.detail ?? err.problem.title ?? err.message,
        });
      }

      setSubmitError(
        err instanceof ApiError
          ? err.problem?.detail ?? err.problem?.title ?? err.message
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
          Completa los campos obligatorios para continuar con la creación del aval.
        </p>
      </div>

      <div className="space-y-5 p-5">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800/60 dark:bg-amber-900/20 dark:text-amber-100">
          <p className="font-medium">Faltan datos obligatorios en este evento.</p>
          <p className="mt-1">
            Debes completar:{" "}
            {missingFields.map(getEventoMissingFieldLabel).join(", ")}.
          </p>
        </div>

        {editableFields.includes("genero") && (
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="genero">
              Género
            </label>
            <select
              id="genero"
              className="form-select w-full"
              {...register("genero", { required: "Completa género." })}
            >
              <option value="">Selecciona una opción</option>
              {EVENTO_GENERO_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {FIELD_HELPERS.genero}
            </p>
            {errors.genero && (
              <p className="mt-1 text-xs text-red-600">{errors.genero.message}</p>
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
              className="form-select w-full"
              {...register("alcance", { required: "Completa alcance." })}
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

        {editableFields.includes("tipoParticipacion") && (
          <div>
            <label
              className="mb-1 block text-sm font-medium"
              htmlFor="tipoParticipacion"
            >
              Tipo de participación
            </label>
            <select
              id="tipoParticipacion"
              className="form-select w-full"
              {...register("tipoParticipacion", {
                required: "Completa tipo de participación.",
              })}
            >
              <option value="">Selecciona una opción</option>
              {EVENTO_TIPO_PARTICIPACION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {FIELD_HELPERS.tipoParticipacion}
            </p>
            {errors.tipoParticipacion && (
              <p className="mt-1 text-xs text-red-600">
                {errors.tipoParticipacion.message}
              </p>
            )}
          </div>
        )}

        {editableFields.includes("categoriaId") && (
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="categoriaId">
              Categoría
            </label>
            <select
              id="categoriaId"
              className="form-select w-full"
              disabled={catalogLoading}
              {...register("categoriaId", {
                required: "Completa categoría.",
                setValueAs: (value) => (value === "" ? "" : Number(value)),
              })}
            >
              <option value="">
                {catalogLoading ? "Cargando categorías..." : "Selecciona una categoría"}
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

        {editableFields.includes("tipoEvento") && (
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="tipoEvento">
              Tipo de evento
            </label>
            <select
              id="tipoEvento"
              className="form-select w-full"
              {...register("tipoEvento", { required: "Completa tipo de evento." })}
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
