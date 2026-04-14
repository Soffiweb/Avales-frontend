"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";

import DatePicker from "@/components/forms/DatePicker";
import { ApiError } from "@/lib/api/client";
import { createDeportista, updateDeportista } from "@/lib/api/deportistas";
import { getCatalog } from "@/lib/api/catalog";
import type { CatalogItem } from "@/types/catalog";
import type { Deportista } from "@/types/deportista";
import {
  deportistaSchema,
  type CreateDeportistaPayload,
  type DeportistaFormValues,
} from "@/lib/validation/deportista";
import {
  getCatalogItemCode,
  resolveCatalogItemCodeFromList,
} from "@/lib/utils/catalog";

const EMPTY_FORM_VALUES: DeportistaFormValues = {
  nombres: "",
  apellidos: "",
  cedula: "",
  genero: undefined as any,
  fechaNacimiento: "",
  categoriaCodigo: "",
  disciplinaCodigo: "",
  afiliacion: false,
  afiliacionInicio: "",
  afiliacionFin: "",
};

const mapDeportistaToFormValues = (
  deportista: Deportista
): DeportistaFormValues => ({
  nombres: deportista.nombres ?? "",
  apellidos: deportista.apellidos ?? "",
  cedula: deportista.cedula ?? "",
  genero: (deportista.genero ?? undefined) as DeportistaFormValues["genero"],
  fechaNacimiento: deportista.fechaNacimiento ?? "",
  categoriaCodigo:
    deportista.categoriaCodigo ??
    deportista.categoria?.codigo ??
    (deportista.categoriaId ? String(deportista.categoriaId) : ""),
  disciplinaCodigo:
    deportista.disciplinaCodigo ??
    deportista.disciplina?.codigo ??
    (deportista.disciplinaId ? String(deportista.disciplinaId) : ""),
  afiliacion: deportista.afiliacion ?? false,
  afiliacionInicio: deportista.afiliacionInicio ?? "",
  afiliacionFin: deportista.afiliacionFin ?? "",
});

type Props = {
  mode?: "create" | "edit";
  deportista?: Deportista;
  onCreated?: () => Promise<void>;
  onUpdated?: () => Promise<void>;
};

export default function DeportistaForm({
  mode = "create",
  deportista,
  onCreated,
  onUpdated,
}: Props) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [categorias, setCategorias] = useState<CatalogItem[]>([]);
  const [disciplinas, setDisciplinas] = useState<CatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const initialValues = useMemo<DeportistaFormValues>(() => {
    if (mode === "edit" && deportista) {
      return mapDeportistaToFormValues(deportista);
    }
    return EMPTY_FORM_VALUES;
  }, [deportista, mode]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue,
    setError,
  } = useForm<DeportistaFormValues>({
    resolver: zodResolver(deportistaSchema),
    defaultValues: initialValues,
  });

  useEffect(() => {
    if (mode !== "edit" || !deportista || catalogLoading) {
      return;
    }
    reset({
      ...initialValues,
      categoriaCodigo: resolveCatalogItemCodeFromList(
        categorias,
        initialValues.categoriaCodigo
      ),
      disciplinaCodigo: resolveCatalogItemCodeFromList(
        disciplinas,
        initialValues.disciplinaCodigo
      ),
    });
  }, [deportista, initialValues, mode, catalogLoading, reset, categorias, disciplinas]);

  const afiliacion = watch("afiliacion", false);
  const afiliacionInicio = watch("afiliacionInicio");
  const afiliacionFin = watch("afiliacionFin");

  // calcular fin = inicio + 1 año cuando está afiliado
  useEffect(() => {
    if (!afiliacion || !afiliacionInicio) {
      setValue("afiliacionFin", "");
      return;
    }
    const start = new Date(afiliacionInicio);
    if (Number.isNaN(start.getTime())) {
      setValue("afiliacionFin", "");
      return;
    }
    const fin = new Date(start);
    fin.setFullYear(fin.getFullYear() + 1);
    const iso = fin.toISOString();
    setValue("afiliacionFin", iso);
  }, [afiliacion, afiliacionInicio, setValue]);

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        setCatalogLoading(true);
        setCatalogError(null);
        const res = await getCatalog();
        const cats = res.data?.categorias ?? [];
        const discs = res.data?.disciplinas ?? [];
        setCategorias(cats);
        setDisciplinas(discs);
      } catch (err: any) {
        setCatalogError(
          err?.message ?? "No se pudieron cargar categorias/disciplinas."
        );
        setCategorias([]);
        setDisciplinas([]);
      } finally {
        setCatalogLoading(false);
      }
    };

    void loadCatalog();
  }, []);

  const onSubmit = async (values: DeportistaFormValues) => {
    setSubmitError(null);

    const payload: CreateDeportistaPayload = {
      nombres: values.nombres.trim(),
      apellidos: values.apellidos.trim(),
      cedula: values.cedula.trim(),
      genero: values.genero.toUpperCase() as "MASCULINO" | "FEMENINO" | "OTRO",
      fechaNacimiento: new Date(values.fechaNacimiento).toISOString(),
      categoriaCodigo: values.categoriaCodigo,
      disciplinaCodigo: values.disciplinaCodigo,
      afiliacion: values.afiliacion,
      afiliacionInicio: values.afiliacionInicio
        ? new Date(values.afiliacionInicio).toISOString()
        : undefined,
      afiliacionFin: values.afiliacionFin
        ? new Date(values.afiliacionFin).toISOString()
        : undefined,
    };

    try {
      if (mode === "edit") {
        if (!deportista?.id) {
          throw new Error("No se pudo identificar el deportista a editar.");
        }
        await updateDeportista(deportista.id, payload);
        if (onUpdated) {
          await onUpdated();
        }
      } else {
        await createDeportista(payload);
        reset(EMPTY_FORM_VALUES);
        if (onCreated) {
          await onCreated();
        }
      }
    } catch (err: unknown) {
      const fallback =
        mode === "edit"
          ? "No se pudo actualizar el deportista. Intenta nuevamente."
          : "No se pudo crear el deportista. Intenta nuevamente.";
      let message = fallback;

      if (err instanceof ApiError) {
        const problem = err.problem;
        const detail =
          problem?.detail ?? problem?.title ?? err.message ?? fallback;
        if (problem?.field) {
          const fieldName =
            problem.field === "categoriaId" ||
            problem.field === "categoriaCodigo"
              ? ("categoriaCodigo" as keyof DeportistaFormValues)
              : problem.field === "disciplinaId" ||
                  problem.field === "disciplinaCodigo"
                ? ("disciplinaCodigo" as keyof DeportistaFormValues)
                : (problem.field as keyof DeportistaFormValues);
          setError(fieldName, { type: "server", message: detail });
        }
        message = detail;
      } else if (err instanceof Error) {
        message = err.message;
      }

      setSubmitError(message);
    }
  };

  const buttonLabel = isSubmitting
    ? "Guardando..."
    : mode === "edit"
    ? "Guardar cambios"
    : "Guardar deportista";

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6 space-y-6"
    >
      <div className="space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
              Datos del deportista
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Completa la informacion personal, categoria y disciplina.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="nombres">
              Nombres
            </label>
            <input
              id="nombres"
              className="form-input w-full"
              type="text"
              {...register("nombres")}
            />
            {errors.nombres && (
              <p className="mt-1 text-xs text-red-600">
                {errors.nombres.message}
              </p>
            )}
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="apellidos"
            >
              Apellidos
            </label>
            <input
              id="apellidos"
              className="form-input w-full"
              type="text"
              {...register("apellidos")}
            />
            {errors.apellidos && (
              <p className="mt-1 text-xs text-red-600">
                {errors.apellidos.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="cedula">
              Cedula
            </label>
            <input
              id="cedula"
              className="form-input w-full"
              type="text"
              inputMode="numeric"
              {...register("cedula")}
            />
            {errors.cedula && (
              <p className="mt-1 text-xs text-red-600">
                {errors.cedula.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="genero">
              Genero
            </label>
            <select
              id="genero"
              className="form-select w-full"
              {...register("genero")}
            >
              <option value="">Selecciona una opcion</option>
              <option value="masculino">Masculino</option>
              <option value="femenino">Femenino</option>
              <option value="otro">Otro</option>
            </select>
            {errors.genero && (
              <p className="mt-1 text-xs text-red-600">
                {errors.genero.message}
              </p>
            )}
          </div>

          <Controller
            control={control}
            name="fechaNacimiento"
            render={({ field }) => (
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  htmlFor="fechaNacimiento"
                >
                  Fecha de nacimiento
                </label>
                <DatePicker
                  id="fechaNacimiento"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  mode="single"
                />
                {errors.fechaNacimiento && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.fechaNacimiento.message}
                  </p>
                )}
              </div>
            )}
          />

          <div>
            <label
              className="block text-sm font-medium mb-1"
            htmlFor="categoriaCodigo"
          >
            Categoria
          </label>
          <select
            id="categoriaCodigo"
            className="form-select w-full"
            disabled={catalogLoading || !categorias.length}
            {...register("categoriaCodigo", {
              setValueAs: (v) => String(v),
            })}
          >
            <option value="">Selecciona una opcion</option>
            {(categorias ?? []).map((c) => (
              <option key={c.id} value={getCatalogItemCode(c)}>
                {c.nombre}
              </option>
            ))}
          </select>
          {errors.categoriaCodigo && (
            <p className="mt-1 text-xs text-red-600">
              {errors.categoriaCodigo.message}
            </p>
          )}
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="disciplinaCodigo"
            >
              Disciplina
            </label>
            <select
              id="disciplinaCodigo"
              className="form-select w-full"
              disabled={catalogLoading || !disciplinas.length}
              {...register("disciplinaCodigo", {
                setValueAs: (v) => String(v),
              })}
            >
              <option value="">Selecciona una opcion</option>
              {(disciplinas ?? []).map((d) => (
                <option key={d.id} value={getCatalogItemCode(d)}>
                  {d.nombre}
                </option>
              ))}
            </select>
            {errors.disciplinaCodigo && (
              <p className="mt-1 text-xs text-red-600">
                {errors.disciplinaCodigo.message}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 ">
            <label
              htmlFor="afiliacion"
              className="text-sm text-gray-800 dark:text-gray-100"
            >
              Afiliacion
            </label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                id="afiliacion"
                type="checkbox"
                className="sr-only peer"
                {...register("afiliacion")}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-offset-2 peer-focus:ring-gray-400 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900 peer-checked:dark:bg-gray-100" />
            </label>
          </div>

          <Controller
            control={control}
            name="afiliacionInicio"
            render={({ field }) => (
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  htmlFor="afiliacionInicio"
                >
                  Inicio de afiliacion
                </label>
                <DatePicker
                  id="afiliacionInicio"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  disabled={!afiliacion}
                  placeholder="Selecciona fecha de inicio"
                  mode="single"
                />
                {errors.afiliacionInicio && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.afiliacionInicio.message}
                  </p>
                )}
              </div>
            )}
          />

          <div>
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="afiliacionFin"
            >
              Fin de afiliacion (auto +1 año)
            </label>
            <input
              id="afiliacionFin"
              className="form-input w-full"
              type="text"
              readOnly
              disabled
              value={
                afiliacionFin ? format(new Date(afiliacionFin), "PPP") : ""
              }
            />
            {errors.afiliacionFin && (
              <p className="mt-1 text-xs text-red-600">
                {errors.afiliacionFin.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {catalogError && <p className="text-sm text-red-600">{catalogError}</p>}

      {submitError && <p className="text-sm text-red-600">{submitError}</p>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting || catalogLoading}
          className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white"
        >
          {buttonLabel}
        </button>
      </div>
    </form>
  );
}
