"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { ApiError } from "@/lib/api/client";
import { getCatalog } from "@/lib/api/catalog";
import { updateEvento, type UpdateEventoPayload } from "@/lib/api/eventos";
import {
  EVENTO_ALCANCE_OPTIONS,
  EVENTO_GENERO_OPTIONS,
  EVENTO_TAREA_OPTIONS,
  EVENTO_TIPO_PARTICIPACION_OPTIONS,
  normalizeEventoAlcance,
  normalizeEventoTipoEvento,
  normalizeEventoTipoParticipacion,
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
  genero: string;
  alcance: string;
  tipoParticipacion: string;
  tipoEvento: string;
  lugar: string;
  provincia: string;
  ciudad: string;
  fechaInicio: string;
  fechaFin: string;
};

type Props = {
  evento: Evento;
  onCompleted?: (evento: Evento) => Promise<void>;
  showMissingBanner?: boolean;
};

const FIELD_HELPERS: Record<EventoMissingField, string> = {
  genero: "Selecciona el género correspondiente del evento.",
  alcance: "Selecciona el alcance del evento.",
  tipoParticipacion: "Selecciona el tipo de participación del evento.",
  categoriaId: "Selecciona la categoría deportiva correspondiente.",
  tipoEvento: "Selecciona el tipo de evento.",
  lugar: "Registra el lugar o sede del evento.",
  provincia: "Registra la provincia donde se realizará el evento.",
  ciudad: "Registra la ciudad donde se realizará el evento.",
  fechaInicio: "Registra la fecha inicial del evento.",
  fechaFin: "Registra la fecha final del evento.",
};

const TRAINER_EDITABLE_FIELDS: EventoMissingField[] = [
  "tipoParticipacion",
  "tipoEvento",
  "genero",
  "categoriaId",
  "alcance",
  "lugar",
  "provincia",
  "ciudad",
  "fechaInicio",
  "fechaFin",
];

export default function EventoCompletionForm({
  evento,
  onCompleted,
  showMissingBanner = false,
}: Props) {
  const editableFields = useMemo(() => {
    const backendFields = getEventoEditableCompletionFields(evento);
    return Array.from(new Set([...TRAINER_EDITABLE_FIELDS, ...backendFields]));
  }, [evento]);
  const completionFields = useMemo(
    () =>
      editableFields.filter(
        (field): field is keyof UpdateEventoPayload =>
          field === "categoriaId" ||
          field === "alcance" ||
          field === "tipoEvento" ||
          field === "tipoParticipacion" ||
          field === "genero" ||
          field === "lugar" ||
          field === "provincia" ||
          field === "ciudad" ||
          field === "fechaInicio" ||
          field === "fechaFin",
      ),
    [editableFields],
  );
  const missingFields = useMemo(() => getEventoMissingFields(evento), [evento]);
  const needsCategoria = editableFields.includes("categoriaId");
  const hasClassificationFields =
    editableFields.includes("categoriaId") ||
    editableFields.includes("genero") ||
    editableFields.includes("alcance") ||
    editableFields.includes("tipoParticipacion") ||
    editableFields.includes("tipoEvento");
  const hasLocationFields =
    editableFields.includes("lugar") ||
    editableFields.includes("provincia") ||
    editableFields.includes("ciudad");
  const hasDateFields =
    editableFields.includes("fechaInicio") ||
    editableFields.includes("fechaFin");

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
      genero: evento.genero ?? "",
      alcance: normalizeEventoAlcance(evento.alcance) ?? "",
      tipoParticipacion:
        normalizeEventoTipoParticipacion(evento.tipoParticipacion) ?? "",
      tipoEvento: normalizeEventoTipoEvento(evento.tipoEvento) ?? "",
      lugar: evento.lugar ?? "",
      provincia: evento.provincia ?? "",
      ciudad: evento.ciudad ?? "",
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

    const payload: Partial<UpdateEventoPayload> = {};

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
        payload.alcance =
          normalizeEventoAlcance(String(value)) ?? String(value);
        return;
      }

      if (field === "tipoParticipacion") {
        payload.tipoParticipacion =
          normalizeEventoTipoParticipacion(String(value)) ?? String(value);
        return;
      }

      if (field === "genero") {
        payload.genero = String(value) as UpdateEventoPayload["genero"];
        return;
      }

      if (field === "tipoEvento") {
        payload.tipoEvento =
          normalizeEventoTipoEvento(String(value)) ?? String(value);
        return;
      }

      if (field === "lugar") {
        payload.lugar = String(value).trim();
        return;
      }

      if (field === "provincia") {
        payload.provincia = String(value).trim();
        return;
      }

      if (field === "ciudad") {
        payload.ciudad = String(value).trim();
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
      const response = await updateEvento(
        evento.id,
        payload as UpdateEventoPayload,
      );
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
          Editar datos del evento
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Actualiza únicamente los datos habilitados para tu perfil.
        </p>
      </div>

      <div className="space-y-5 p-5">
        {showMissingBanner && missingFields.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800/60 dark:bg-amber-900/20 dark:text-amber-100">
            <p className="font-medium">
              Faltan datos obligatorios en este evento.
            </p>
            <p className="mt-1">
              Debes completar:{" "}
              {missingFields.map(getEventoMissingFieldLabel).join(", ")}.
            </p>
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/40">
          <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
            <span className="rounded-full bg-white px-3 py-1 dark:bg-slate-800">
              Evento: {evento.nombre}
            </span>
          </div>
        </div>

        {hasClassificationFields && (
          <section className="rounded-xl border border-gray-200 p-5 dark:border-gray-700/60">
            <div className="mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Clasificación
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Define la categoría y los datos principales del evento.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {editableFields.includes("categoriaId") && (
                <div className="md:col-span-2 xl:col-span-1">
                  <label
                    className="mb-1 block text-sm font-medium"
                    htmlFor="categoriaId"
                  >
                    Categoría
                  </label>
                  <select
                    id="categoriaId"
                    className="form-select w-full"
                    disabled={catalogLoading}
                    {...register("categoriaId", {
                      required: "Completa categoría.",
                      setValueAs: (value) =>
                        value === "" ? "" : Number(value),
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

              {editableFields.includes("tipoEvento") && (
                <div>
                  <label
                    className="mb-1 block text-sm font-medium"
                    htmlFor="tipoEvento"
                  >
                    Tipo de evento
                  </label>
                  <select
                    id="tipoEvento"
                    className="form-select w-full"
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
                    <p className="mt-1 text-xs text-red-600">
                      {errors.tipoEvento.message}
                    </p>
                  )}
                </div>
              )}

              {editableFields.includes("genero") && (
                <div>
                  <label
                    className="mb-1 block text-sm font-medium"
                    htmlFor="genero"
                  >
                    Género
                  </label>
                  <select
                    id="genero"
                    className="form-select w-full"
                    {...register("genero", {
                      required: "Completa género.",
                    })}
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
                    <p className="mt-1 text-xs text-red-600">
                      {errors.genero.message}
                    </p>
                  )}
                </div>
              )}

              {editableFields.includes("alcance") && (
                <div>
                  <label
                    className="mb-1 block text-sm font-medium"
                    htmlFor="alcance"
                  >
                    Alcance
                  </label>
                  <select
                    id="alcance"
                    className="form-select w-full"
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
                    <p className="mt-1 text-xs text-red-600">
                      {errors.alcance.message}
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {hasLocationFields && (
          <section className="rounded-xl border border-gray-200 p-5 dark:border-gray-700/60">
            <div className="mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Ubicación
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Especifica dónde se realizará el evento.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {editableFields.includes("lugar") && (
                <div className="md:col-span-2 xl:col-span-3">
                  <label
                    className="mb-1 block text-sm font-medium"
                    htmlFor="lugar"
                  >
                    Lugar
                  </label>
                  <input
                    id="lugar"
                    type="text"
                    className="form-input w-full"
                    {...register("lugar", {
                      required: "Completa lugar.",
                    })}
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {FIELD_HELPERS.lugar}
                  </p>
                  {errors.lugar && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.lugar.message}
                    </p>
                  )}
                </div>
              )}

              {editableFields.includes("provincia") && (
                <div>
                  <label
                    className="mb-1 block text-sm font-medium"
                    htmlFor="provincia"
                  >
                    Provincia
                  </label>
                  <input
                    id="provincia"
                    type="text"
                    className="form-input w-full"
                    {...register("provincia", {
                      required: "Completa provincia.",
                    })}
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {FIELD_HELPERS.provincia}
                  </p>
                  {errors.provincia && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.provincia.message}
                    </p>
                  )}
                </div>
              )}

              {editableFields.includes("ciudad") && (
                <div>
                  <label
                    className="mb-1 block text-sm font-medium"
                    htmlFor="ciudad"
                  >
                    Ciudad
                  </label>
                  <input
                    id="ciudad"
                    type="text"
                    className="form-input w-full"
                    {...register("ciudad", {
                      required: "Completa ciudad.",
                    })}
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {FIELD_HELPERS.ciudad}
                  </p>
                  {errors.ciudad && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.ciudad.message}
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {hasDateFields && (
          <section className="rounded-xl border border-gray-200 p-5 dark:border-gray-700/60">
            <div className="mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Fechas
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Define el rango en el que se desarrollará el evento.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {editableFields.includes("fechaInicio") && (
                <div>
                  <label
                    className="mb-1 block text-sm font-medium"
                    htmlFor="fechaInicio"
                  >
                    Fecha de inicio
                  </label>
                  <input
                    id="fechaInicio"
                    type="date"
                    className="form-input w-full"
                    {...register("fechaInicio", {
                      required: "Completa fecha de inicio.",
                    })}
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {FIELD_HELPERS.fechaInicio}
                  </p>
                  {errors.fechaInicio && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.fechaInicio.message}
                    </p>
                  )}
                </div>
              )}

              {editableFields.includes("fechaFin") && (
                <div>
                  <label
                    className="mb-1 block text-sm font-medium"
                    htmlFor="fechaFin"
                  >
                    Fecha de fin
                  </label>
                  <input
                    id="fechaFin"
                    type="date"
                    className="form-input w-full"
                    {...register("fechaFin", {
                      required: "Completa fecha de fin.",
                    })}
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {FIELD_HELPERS.fechaFin}
                  </p>
                  {errors.fechaFin && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.fechaFin.message}
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {submitError && <p className="text-sm text-red-600">{submitError}</p>}

        <div className="flex items-center justify-end gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700/60 dark:bg-gray-900/30">
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
