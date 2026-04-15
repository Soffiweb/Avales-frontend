"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Upload, X } from "lucide-react";

import DatePicker from "@/components/forms/DatePicker";
import { ApiError } from "@/lib/api/client";
import { createEvento, updateEvento } from "@/lib/api/eventos";
import { getCatalog, getItemsPresupuestarios } from "@/lib/api/catalog";
import type { CatalogItem, CatalogItemPresupuestario } from "@/types/catalog";
import type { Evento } from "@/types/evento";
import {
  eventoSchema,
  type CreateEventoPayload,
  type EventoFormValues,
} from "@/lib/validation/evento";
import {
  EVENTO_TIPO_PARTICIPACION_OPTIONS,
  normalizeEventoTipoParticipacion,
} from "@/lib/constants";
import {
  getCatalogItemCode,
  resolveCatalogItemCodeFromList,
} from "@/lib/utils/catalog";

const MESES = [
  { value: 1, label: "Enero" },
  { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Mayo" },
  { value: 6, label: "Junio" },
  { value: 7, label: "Julio" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" },
  { value: 11, label: "Noviembre" },
  { value: 12, label: "Diciembre" },
];

function getDefaultMesProgramado(evento?: Evento | null) {
  if (evento?.mesProgramado) return evento.mesProgramado;
  if (evento?.fechaInicio) {
    const start = new Date(evento.fechaInicio);
    if (!Number.isNaN(start.getTime())) {
      return start.getMonth() + 1;
    }
  }
  return new Date().getMonth() + 1;
}

const EMPTY_FORM_VALUES: EventoFormValues = {
  codigo: "",
  tipoParticipacion: EVENTO_TIPO_PARTICIPACION_OPTIONS[0].value,
  tipoEvento: "",
  nombre: "",
  lugar: "",
  genero: undefined as unknown as EventoFormValues["genero"],
  disciplinaCodigo: "",
  categoriaCodigo: "",
  mesProgramado: new Date().getMonth() + 1,
  provincia: "",
  ciudad: "",
  pais: "Ecuador",
  alcance: "",
  fechaInicio: "",
  fechaFin: "",
  numEntrenadoresHombres: 0,
  numEntrenadoresMujeres: 0,
  numAtletasHombres: 0,
  numAtletasMujeres: 0,
  eventoItems: [],
};

const mapEventoToFormValues = (evento: Evento): EventoFormValues => ({
  codigo: evento.codigo ?? "",
  tipoParticipacion:
    normalizeEventoTipoParticipacion(evento.tipoParticipacion) ??
    EVENTO_TIPO_PARTICIPACION_OPTIONS[0].value,
  tipoEvento: evento.tipoEvento ?? "",
  nombre: evento.nombre ?? "",
  lugar: evento.lugar ?? "",
  genero: evento.genero ?? (undefined as unknown as EventoFormValues["genero"]),
  disciplinaCodigo:
    evento.disciplinaCodigo ??
    evento.disciplina?.codigo ??
    (evento.disciplinaId ? String(evento.disciplinaId) : ""),
  categoriaCodigo:
    evento.categoriaCodigo ??
    evento.categoria?.codigo ??
    (evento.categoriaId ? String(evento.categoriaId) : ""),
  mesProgramado: getDefaultMesProgramado(evento),
  provincia: evento.provincia ?? "",
  ciudad: evento.ciudad ?? "",
  pais: evento.pais ?? "Ecuador",
  alcance: evento.alcance ?? "",
  fechaInicio: evento.fechaInicio ?? "",
  fechaFin: evento.fechaFin ?? "",
  numEntrenadoresHombres: evento.numEntrenadoresHombres ?? 0,
  numEntrenadoresMujeres: evento.numEntrenadoresMujeres ?? 0,
  numAtletasHombres: evento.numAtletasHombres ?? 0,
  numAtletasMujeres: evento.numAtletasMujeres ?? 0,
  eventoItems:
    evento.eventoItems?.map((ei) => ({
      itemId: ei.item.id,
      mes: ei.mes,
      presupuesto: parseFloat(ei.presupuesto) || 0,
    })) ?? [],
});

type Props = {
  mode?: "create" | "edit";
  evento?: Evento;
  onCreated?: () => Promise<void>;
  onUpdated?: () => Promise<void>;
};

export default function EventoForm({
  mode = "create",
  evento,
  onCreated,
  onUpdated,
}: Props) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [categorias, setCategorias] = useState<CatalogItem[]>([]);
  const [disciplinas, setDisciplinas] = useState<CatalogItem[]>([]);
  const [itemsCatalogo, setItemsCatalogo] = useState<CatalogItemPresupuestario[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [archivoPreview, setArchivoPreview] = useState<string | null>(null);
  const [draggingArchivo, setDraggingArchivo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialValues = useMemo<EventoFormValues>(() => {
    if (mode === "edit" && evento) {
      return mapEventoToFormValues(evento);
    }
    return EMPTY_FORM_VALUES;
  }, [evento, mode]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    reset,
    setError,
    watch,
  } = useForm<EventoFormValues>({
    resolver: zodResolver(eventoSchema),
    defaultValues: initialValues,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "eventoItems",
  });

  const eventoItemsValues = watch("eventoItems") ?? [];

  const totalPresupuesto = eventoItemsValues.reduce(
    (sum, item) => sum + (item?.presupuesto || 0),
    0
  );

  useEffect(() => {
    if (mode !== "edit" || !evento || catalogLoading) {
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
      mesProgramado: initialValues.mesProgramado ?? getDefaultMesProgramado(evento),
    });
  }, [evento, initialValues, mode, catalogLoading, reset, categorias, disciplinas]);

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        setCatalogLoading(true);
        setCatalogError(null);
        const [catalogRes, itemsRes] = await Promise.all([
          getCatalog(),
          getItemsPresupuestarios(),
        ]);
        const cats = catalogRes.data?.categorias ?? [];
        const discs = catalogRes.data?.disciplinas ?? [];
        setCategorias(cats);
        setDisciplinas(discs);
        setItemsCatalogo(itemsRes.data ?? []);
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

  const processArchivo = (file: File) => {
    const validTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      setSubmitError("Solo se permiten archivos JPG, PNG o PDF");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setSubmitError("El archivo no puede superar 5MB");
      return;
    }

    setArchivo(file);
    setSubmitError(null);

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setArchivoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setArchivoPreview(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processArchivo(file);
  };

  const handleArchivoDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingArchivo(true);
  };

  const handleArchivoDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingArchivo(false);
  };

  const handleArchivoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingArchivo(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) processArchivo(droppedFile);
  };

  const removeFile = () => {
    setArchivo(null);
    setArchivoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onSubmit = async (values: EventoFormValues) => {
    setSubmitError(null);

    const payload: CreateEventoPayload = {
      codigo: values.codigo.trim(),
      tipoParticipacion:
        normalizeEventoTipoParticipacion(values.tipoParticipacion) ??
        values.tipoParticipacion,
      tipoEvento: values.tipoEvento.trim(),
      nombre: values.nombre.trim(),
      lugar: values.lugar.trim(),
      genero: values.genero,
      disciplinaCodigo: values.disciplinaCodigo,
      categoriaCodigo: values.categoriaCodigo,
      mesProgramado: values.mesProgramado,
      provincia: values.provincia.trim(),
      ciudad: values.ciudad.trim(),
      pais: values.pais.trim(),
      alcance: values.alcance.trim(),
      fechaInicio: values.fechaInicio?.trim()
        ? new Date(values.fechaInicio).toISOString()
        : null,
      fechaFin: values.fechaFin?.trim()
        ? new Date(values.fechaFin).toISOString()
        : null,
      numEntrenadoresHombres: values.numEntrenadoresHombres,
      numEntrenadoresMujeres: values.numEntrenadoresMujeres,
      numAtletasHombres: values.numAtletasHombres,
      numAtletasMujeres: values.numAtletasMujeres,
      eventoItems: values.eventoItems?.length ? values.eventoItems : undefined,
    };

    try {
      if (mode === "edit") {
        if (!evento?.id) {
          throw new Error("No se pudo identificar el evento a editar.");
        }
        await updateEvento(
          evento.id,
          { ...payload, eventoItems: values.eventoItems ?? [] },
          archivo ?? undefined
        );
        if (onUpdated) {
          await onUpdated();
        }
      } else {
        await createEvento(payload, archivo ?? undefined);
        reset(EMPTY_FORM_VALUES);
        removeFile();
        if (onCreated) {
          await onCreated();
        }
      }
    } catch (err: unknown) {
      const fallback =
        mode === "edit"
          ? "No se pudo actualizar el evento. Intenta nuevamente."
          : "No se pudo crear el evento. Intenta nuevamente.";
      let message = fallback;

      if (err instanceof ApiError) {
        const problem = err.problem;
        const detail =
          problem?.detail ?? problem?.title ?? err.message ?? fallback;
        if (problem?.field) {
          const fieldName =
            problem.field === "categoriaId" ||
            problem.field === "categoriaCodigo"
              ? ("categoriaCodigo" as keyof EventoFormValues)
              : problem.field === "disciplinaId" ||
                  problem.field === "disciplinaCodigo"
                ? ("disciplinaCodigo" as keyof EventoFormValues)
                : problem.field === "mesProgramado"
                  ? ("mesProgramado" as keyof EventoFormValues)
                : (problem.field as keyof EventoFormValues);
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
    : "Guardar evento";

  // Agrupar items del catálogo por actividad para el select
  const itemsByActividad = useMemo(() => {
    const groups: Record<string, CatalogItemPresupuestario[]> = {};
    for (const item of itemsCatalogo) {
      const key = item.actividad
        ? `${item.actividad.numero} - ${item.actividad.nombre}`
        : "Sin actividad";
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    return groups;
  }, [itemsCatalogo]);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="bg-white dark:bg-gray-800 shadow-sm rounded-xl"
    >
      {/* Seccion: Informacion General */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">
          Informacion del evento
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Datos principales del evento deportivo.
        </p>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="codigo">
              Codigo
            </label>
            <input
              id="codigo"
              className="form-input w-full"
              type="text"
              placeholder="EVT-2025-001"
              {...register("codigo")}
            />
            {errors.codigo && (
              <p className="mt-1 text-xs text-red-600">{errors.codigo.message}</p>
            )}
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="tipoParticipacion"
            >
              Tipo de participación
            </label>
            <select
              id="tipoParticipacion"
              className="form-select w-full"
              {...register("tipoParticipacion")}
            >
              <option value="">Selecciona un tipo de participación</option>
              {EVENTO_TIPO_PARTICIPACION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.tipoParticipacion && (
              <p className="mt-1 text-xs text-red-600">
                {errors.tipoParticipacion.message}
              </p>
            )}
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="tipoEvento"
            >
              Tipo de evento
            </label>
            <input
              id="tipoEvento"
              className="form-input w-full"
              type="text"
              placeholder="Campeonato, Torneo..."
              {...register("tipoEvento")}
            />
            {errors.tipoEvento && (
              <p className="mt-1 text-xs text-red-600">
                {errors.tipoEvento.message}
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="nombre">
            Nombre del evento
          </label>
          <input
            id="nombre"
            className="form-input w-full"
            type="text"
            placeholder="Campeonato Nacional de Atletismo 2025"
            {...register("nombre")}
          />
          {errors.nombre && (
            <p className="mt-1 text-xs text-red-600">{errors.nombre.message}</p>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
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
              <option value="MASCULINO">Masculino</option>
              <option value="FEMENINO">Femenino</option>
              <option value="MASCULINO_FEMENINO">Mixto</option>
            </select>
            {errors.genero && (
              <p className="mt-1 text-xs text-red-600">{errors.genero.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="alcance">
              Alcance
            </label>
            <input
              id="alcance"
              className="form-input w-full"
              type="text"
              placeholder="Nacional, Regional..."
              {...register("alcance")}
            />
            {errors.alcance && (
              <p className="mt-1 text-xs text-red-600">{errors.alcance.message}</p>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
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
            {categorias.map((c) => (
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
              {disciplinas.map((d) => (
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
        </div>
      </div>

      {/* Seccion: Ubicacion */}
      <div className="px-5 py-4 border-t border-b border-gray-100 dark:border-gray-700/60">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">
          Ubicacion
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Lugar y direccion del evento.
        </p>
      </div>

      <div className="p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="lugar">
            Lugar / Sede
          </label>
          <input
            id="lugar"
            className="form-input w-full"
            type="text"
            placeholder="Estadio Olimpico Atahualpa"
            {...register("lugar")}
          />
          {errors.lugar && (
            <p className="mt-1 text-xs text-red-600">{errors.lugar.message}</p>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="pais">
              Pais
            </label>
            <input
              id="pais"
              className="form-input w-full"
              type="text"
              {...register("pais")}
            />
            {errors.pais && (
              <p className="mt-1 text-xs text-red-600">{errors.pais.message}</p>
            )}
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="provincia"
            >
              Provincia
            </label>
            <input
              id="provincia"
              className="form-input w-full"
              type="text"
              placeholder="Pichincha"
              {...register("provincia")}
            />
            {errors.provincia && (
              <p className="mt-1 text-xs text-red-600">
                {errors.provincia.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="ciudad">
              Ciudad
            </label>
            <input
              id="ciudad"
              className="form-input w-full"
              type="text"
              placeholder="Quito"
              {...register("ciudad")}
            />
            {errors.ciudad && (
              <p className="mt-1 text-xs text-red-600">{errors.ciudad.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Seccion: Fechas */}
      <div className="px-5 py-4 border-t border-b border-gray-100 dark:border-gray-700/60">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">
          Fechas
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Periodo de realizacion del evento.
        </p>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="mesProgramado"
            >
              Mes programado
            </label>
            <select
              id="mesProgramado"
              className="form-select w-full"
              {...register("mesProgramado", {
                setValueAs: (v) => {
                  if (v === "" || v === null || v === undefined) return undefined;
                  const parsed = Number(v);
                  return Number.isFinite(parsed) ? parsed : undefined;
                },
              })}
            >
              <option value="">Selecciona un mes</option>
              {MESES.map((mes) => (
                <option key={mes.value} value={String(mes.value)}>
                  {mes.label}
                </option>
              ))}
            </select>
            {errors.mesProgramado && (
              <p className="mt-1 text-xs text-red-600">
                {errors.mesProgramado.message}
              </p>
            )}
          </div>

          <Controller
            control={control}
            name="fechaInicio"
            render={({ field }) => (
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  htmlFor="fechaInicio"
                >
                  Fecha de inicio
                </label>
                <DatePicker
                  id="fechaInicio"
                  value={field.value ?? ""}
                  onChange={(value) => field.onChange(value ?? "")}
                  mode="single"
                  placeholder="Opcional"
                />
                {errors.fechaInicio && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.fechaInicio.message}
                  </p>
                )}
              </div>
            )}
          />

          <Controller
            control={control}
            name="fechaFin"
            render={({ field }) => (
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  htmlFor="fechaFin"
                >
                  Fecha de fin
                </label>
                <DatePicker
                  id="fechaFin"
                  value={field.value ?? ""}
                  onChange={(value) => field.onChange(value ?? "")}
                  mode="single"
                  placeholder="Opcional"
                />
                {errors.fechaFin && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.fechaFin.message}
                  </p>
                )}
              </div>
            )}
          />
        </div>
      </div>

      {/* Seccion: Participantes */}
      <div className="px-5 py-4 border-t border-b border-gray-100 dark:border-gray-700/60">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">
          Participantes
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Numero de entrenadores y atletas por genero.
        </p>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="numEntrenadoresHombres"
            >
              Entrenadores hombres
            </label>
            <input
              id="numEntrenadoresHombres"
              className="form-input w-full"
              type="number"
              min="0"
              {...register("numEntrenadoresHombres", { valueAsNumber: true })}
            />
            {errors.numEntrenadoresHombres && (
              <p className="mt-1 text-xs text-red-600">
                {errors.numEntrenadoresHombres.message}
              </p>
            )}
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="numEntrenadoresMujeres"
            >
              Entrenadores mujeres
            </label>
            <input
              id="numEntrenadoresMujeres"
              className="form-input w-full"
              type="number"
              min="0"
              {...register("numEntrenadoresMujeres", { valueAsNumber: true })}
            />
            {errors.numEntrenadoresMujeres && (
              <p className="mt-1 text-xs text-red-600">
                {errors.numEntrenadoresMujeres.message}
              </p>
            )}
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="numAtletasHombres"
            >
              Atletas hombres
            </label>
            <input
              id="numAtletasHombres"
              className="form-input w-full"
              type="number"
              min="0"
              {...register("numAtletasHombres", { valueAsNumber: true })}
            />
            {errors.numAtletasHombres && (
              <p className="mt-1 text-xs text-red-600">
                {errors.numAtletasHombres.message}
              </p>
            )}
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="numAtletasMujeres"
            >
              Atletas mujeres
            </label>
            <input
              id="numAtletasMujeres"
              className="form-input w-full"
              type="number"
              min="0"
              {...register("numAtletasMujeres", { valueAsNumber: true })}
            />
            {errors.numAtletasMujeres && (
              <p className="mt-1 text-xs text-red-600">
                {errors.numAtletasMujeres.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Seccion: Items Presupuestarios */}
      <div className="px-5 py-4 border-t border-b border-gray-100 dark:border-gray-700/60">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-800 dark:text-gray-100">
              Items presupuestarios
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Asigna items presupuestarios por mes y monto. Opcional en eventos nuevos.
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Total presupuesto
            </p>
            <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              ${totalPresupuesto.toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-3">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="grid grid-cols-12 gap-3 items-start p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg"
          >
            <div className="col-span-5">
              {index === 0 && (
                <label className="block text-xs font-medium mb-1 text-gray-500 dark:text-gray-400">
                  Item
                </label>
              )}
              <select
                className="form-select w-full text-sm"
                {...register(`eventoItems.${index}.itemId`, {
                  setValueAs: (v) => (v === "" ? undefined : Number(v)),
                })}
              >
                <option value="">Seleccionar item...</option>
                {Object.entries(itemsByActividad).map(([actName, items]) => (
                  <optgroup key={actName} label={actName}>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.numero} - {item.nombre}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {errors.eventoItems?.[index]?.itemId && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.eventoItems[index].itemId?.message}
                </p>
              )}
            </div>

            <div className="col-span-3">
              {index === 0 && (
                <label className="block text-xs font-medium mb-1 text-gray-500 dark:text-gray-400">
                  Mes
                </label>
              )}
              <select
                className="form-select w-full text-sm"
                {...register(`eventoItems.${index}.mes`, {
                  setValueAs: (v) => (v === "" ? undefined : Number(v)),
                })}
              >
                <option value="">Mes...</option>
                {MESES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              {errors.eventoItems?.[index]?.mes && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.eventoItems[index].mes?.message}
                </p>
              )}
            </div>

            <div className="col-span-3">
              {index === 0 && (
                <label className="block text-xs font-medium mb-1 text-gray-500 dark:text-gray-400">
                  Presupuesto ($)
                </label>
              )}
              <input
                className="form-input w-full text-sm"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register(`eventoItems.${index}.presupuesto`, {
                  valueAsNumber: true,
                })}
              />
              {errors.eventoItems?.[index]?.presupuesto && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.eventoItems[index].presupuesto?.message}
                </p>
              )}
            </div>

            <div className="col-span-1 flex items-end">
              {index === 0 && (
                <label className="block text-xs font-medium mb-1 text-transparent">
                  &nbsp;
                </label>
              )}
              <button
                type="button"
                onClick={() => remove(index)}
                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Eliminar item"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => append({ itemId: 0, mes: 1, presupuesto: 0 })}
          className="flex items-center gap-2 text-sm text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-medium"
        >
          <Plus className="w-4 h-4" />
          Agregar item presupuestario
        </button>

        {fields.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500 italic">
            No hay items presupuestarios asignados.
          </p>
        )}
      </div>

      {/* Seccion: Archivo */}
      <div className="px-5 py-4 border-t border-b border-gray-100 dark:border-gray-700/60">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">
          Archivo adjunto
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Imagen o PDF del evento (opcional, max 5MB).
        </p>
      </div>

      <div className="p-5 space-y-4">
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleArchivoDragOver}
          onDragLeave={handleArchivoDragLeave}
          onDrop={handleArchivoDrop}
          className={`
            relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
            ${draggingArchivo
              ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
              : archivo
                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10"
                : "border-gray-300 hover:border-indigo-400 dark:border-gray-600"}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          {archivo ? (
            <div className="flex flex-col items-center">
              <Upload className="w-10 h-10 text-indigo-500 mb-2" />
              <p className="font-medium text-gray-900 dark:text-gray-100">{archivo.name}</p>
              <p className="text-sm text-gray-500">{(archivo.size / 1024).toFixed(1)} KB</p>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeFile(); }}
                className="mt-2 text-sm text-red-500 hover:text-red-600 flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Quitar archivo
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Upload className="w-10 h-10 text-gray-400 mb-2" />
              <p className="font-medium text-gray-700 dark:text-gray-200">
                {draggingArchivo ? "Suelta el archivo aqui" : "Arrastra o haz clic para seleccionar"}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                JPG, PNG o PDF (max 5MB)
              </p>
            </div>
          )}
        </div>

        {archivoPreview && (
          <div className="mt-2">
            <img
              src={archivoPreview}
              alt="Vista previa"
              className="max-w-xs rounded-lg border border-gray-200 dark:border-gray-700"
            />
          </div>
        )}

        {mode === "edit" && evento?.archivo && !archivo && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Archivo actual: {evento.archivo}
          </p>
        )}
      </div>

      {/* Errores y Submit */}
      <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-700/60">
        {catalogError && (
          <p className="text-sm text-red-600 mb-4">{catalogError}</p>
        )}

        {submitError && (
          <p className="text-sm text-red-600 mb-4">{submitError}</p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || catalogLoading}
            className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white"
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
