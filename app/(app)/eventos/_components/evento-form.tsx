"use client";

import { Controller } from "react-hook-form";
import { Plus, Sparkles, Trash2 } from "lucide-react";

import DatePicker from "@/components/forms/DatePicker";
import type { Evento } from "@/types/evento";
import {
  EVENTO_ALCANCE_OPTIONS,
  EVENTO_CATEGORIA_OPTIONS,
  EVENTO_GENERO_OPTIONS,
  EVENTO_MES_OPTIONS,
  EVENTO_TAREA_OPTIONS,
  EVENTO_TIPO_PARTICIPACION_OPTIONS,
  TIPO_AVAL_OPTIONS,
  getTipoAvalLabel,
} from "@/lib/constants";
import { getCatalogItemCode } from "@/lib/utils/catalog";
import { parseDecimalInput, parseIntegerInput } from "./evento-form-helpers";
import EventoFileUpload from "./evento-file-upload";
import { useEventoForm } from "./use-evento-form";

type Props = {
  mode?: "create" | "edit";
  evento?: Evento;
  onCreated?: () => Promise<void>;
  onUpdated?: () => Promise<void>;
};

function tipoAvalToFuente(
  tipoAval?: string,
): "FONDOS_PUBLICOS" | "AUTOGESTION" | undefined {
  return tipoAval === "FONDOS_PUBLICOS" || tipoAval === "AUTOGESTION"
    ? tipoAval
    : undefined;
}

const PRESUPUESTO_SECTION_INFO: Record<
  "FONDOS_PUBLICOS" | "AUTOGESTION",
  { title: string; description: string; empty: string }
> = {
  FONDOS_PUBLICOS: {
    title: "Fondos públicos",
    description: "Items financiados con presupuesto público.",
    empty: "No hay items de fondos públicos.",
  },
  AUTOGESTION: {
    title: "Fondos de autogestión",
    description: "Items financiados con recursos de autogestión.",
    empty: "No hay items de autogestión.",
  },
};

export default function EventoForm({
  mode = "create",
  evento,
  onCreated,
  onUpdated,
}: Props) {
  const {
    addFormaParticipacion,
    appendBudgetItem,
    archivo,
    archivoPreview,
    buttonLabel,
    catalogError,
    catalogLoading,
    control,
    disciplinas,
    draggingArchivo,
    errors,
    eventoItemsValues,
    fields,
    formasParticipacionFields,
    formasParticipacionValues,
    generateCodigoError,
    generatingCodigo,
    handleArchivoDragLeave,
    handleArchivoDragOver,
    handleArchivoDrop,
    handleFileChange,
    handleGenerateCodigo,
    handleSubmit,
    isSubmitting,
    itemsByActividad,
    onSubmit,
    register,
    remove,
    removeFormaParticipacion,
    removeFile,
    submitError,
    totalPresupuestoAutogestion,
    totalPresupuestoFondosPublicos,
    totalPresupuesto,
  } = useEventoForm({
    mode,
    evento,
    onCreated,
    onUpdated,
  });

  const usedTiposAval = new Set(
    formasParticipacionValues.map((forma) => forma?.tipoAval),
  );
  const availableTipoAvalOptions = TIPO_AVAL_OPTIONS.filter(
    (option) => !usedTiposAval.has(option.value),
  );
  const canAddFormaParticipacion =
    formasParticipacionFields.length < 3 && availableTipoAvalOptions.length > 0;

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
            <div className="flex gap-2">
              <input
                id="codigo"
                className="form-input flex-1"
                type="text"
                placeholder="EVT-202606-FUTBO-001"
                {...register("codigo")}
              />
              <button
                type="button"
                onClick={handleGenerateCodigo}
                disabled={generatingCodigo}
                className="btn bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                title="Genera automaticamente con el patron EVT-YYYYMM-NOMBRE-SEQ. Requiere nombre y mes programado."
              >
                <Sparkles className="w-4 h-4" />
                <span className="ml-1 hidden sm:inline">
                  {generatingCodigo ? "Generando..." : "Generar"}
                </span>
              </button>
            </div>
            {errors.codigo && (
              <p className="mt-1 text-xs text-red-600">
                {errors.codigo.message}
              </p>
            )}
            {generateCodigoError && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                {generateCodigoError}
              </p>
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
            <select
              id="tipoEvento"
              className="form-select w-full"
              {...register("tipoEvento")}
            >
              <option value="">Selecciona una opción</option>
              {EVENTO_TAREA_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
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
              <option value="">Selecciona una opción</option>
              {EVENTO_GENERO_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.genero && (
              <p className="mt-1 text-xs text-red-600">
                {errors.genero.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="alcance">
              Alcance
            </label>
            <select
              id="alcance"
              className="form-select w-full"
              {...register("alcance")}
            >
              <option value="">Selecciona una opción</option>
              {EVENTO_ALCANCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.alcance && (
              <p className="mt-1 text-xs text-red-600">
                {errors.alcance.message}
              </p>
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
              {...register("categoriaCodigo", {
                setValueAs: (v) => String(v),
              })}
            >
              <option value="">Selecciona una opción</option>
              {EVENTO_CATEGORIA_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
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
              <p className="mt-1 text-xs text-red-600">
                {errors.ciudad.message}
              </p>
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
                  if (v === "" || v === null || v === undefined)
                    return undefined;
                  const parsed = Number(v);
                  return Number.isFinite(parsed) ? parsed : undefined;
                },
              })}
            >
              <option value="">Selecciona un mes</option>
              {EVENTO_MES_OPTIONS.map((mes) => (
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

      {/* Seccion: Tipos de participacion */}
      <div className="px-5 py-4 border-t border-b border-gray-100 dark:border-gray-700/60">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-800 dark:text-gray-100">
              Tipos de participación
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Cupos de participantes por tipo de aval. Fondos públicos y
              autogestión incluyen sus items presupuestarios.
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Total presupuesto
            </p>
            <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              $
              {totalPresupuesto.toLocaleString("es-EC", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
        </div>
        {errors.formasParticipacion?.message && (
          <p className="mt-2 text-xs text-red-600">
            {errors.formasParticipacion.message}
          </p>
        )}
      </div>

      <div className="p-5 space-y-3">
        {formasParticipacionFields.map((formaField, formaIndex) => {
          const tipoAval =
            formasParticipacionValues[formaIndex]?.tipoAval ??
            formaField.tipoAval;
          const fuente = tipoAvalToFuente(tipoAval);
          const sectionInfo = fuente
            ? PRESUPUESTO_SECTION_INFO[fuente]
            : undefined;
          const sectionTotal =
            fuente === "FONDOS_PUBLICOS"
              ? totalPresupuestoFondosPublicos
              : fuente === "AUTOGESTION"
                ? totalPresupuestoAutogestion
                : 0;
          const sectionItems = fuente
            ? fields
                .map((field, index) => ({
                  field,
                  index,
                  itemFuente:
                    eventoItemsValues[index]?.fuente ?? "FONDOS_PUBLICOS",
                }))
                .filter((item) => item.itemFuente === fuente)
            : [];

          return (
            <div
              key={formaField.id}
              className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-700/60 dark:bg-gray-900/20"
            >
              <input
                type="hidden"
                {...register(`formasParticipacion.${formaIndex}.tipoAval`)}
                value={tipoAval}
              />

              <div className="mb-4 flex items-start justify-between gap-3">
                <span className="inline-flex items-center rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                  {getTipoAvalLabel(tipoAval)}
                </span>
                <button
                  type="button"
                  onClick={() => removeFormaParticipacion(formaIndex)}
                  className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
                  title="Eliminar tipo de participación"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mb-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Referencia
                  </label>
                  <input
                    className="form-input w-full"
                    type="text"
                    placeholder="Referencia de la participación (ej: nombre de la organización, institución o similar)"
                    {...register(
                      `formasParticipacion.${formaIndex}.referencia`,
                    )}
                  />
                  {errors.formasParticipacion?.[formaIndex]?.referencia && (
                    <p className="mt-1 text-xs text-red-600">
                      {
                        errors.formasParticipacion[formaIndex]?.referencia
                          ?.message
                      }
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Observación
                  </label>
                  <input
                    className="form-input w-full"
                    type="text"
                    placeholder="Detalle opcional"
                    {...register(
                      `formasParticipacion.${formaIndex}.observacion`,
                    )}
                  />
                  {errors.formasParticipacion?.[formaIndex]?.observacion && (
                    <p className="mt-1 text-xs text-red-600">
                      {
                        errors.formasParticipacion[formaIndex]?.observacion
                          ?.message
                      }
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Entrenadores y otro personal (hombres)
                  </label>
                  <input
                    className="form-input w-full"
                    type="text"
                    inputMode="numeric"
                    {...register(
                      `formasParticipacion.${formaIndex}.numEntrenadoresHombres`,
                      { setValueAs: parseIntegerInput },
                    )}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Cupo compartido: entrenadores, jueces, delegados, etc.
                  </p>
                  {errors.formasParticipacion?.[formaIndex]
                    ?.numEntrenadoresHombres && (
                    <p className="mt-1 text-xs text-red-600">
                      {
                        errors.formasParticipacion[formaIndex]
                          ?.numEntrenadoresHombres?.message
                      }
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Entrenadores y otro personal (mujeres)
                  </label>
                  <input
                    className="form-input w-full"
                    type="text"
                    inputMode="numeric"
                    {...register(
                      `formasParticipacion.${formaIndex}.numEntrenadoresMujeres`,
                      { setValueAs: parseIntegerInput },
                    )}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Cupo compartido: entrenadores, jueces, delegados, etc.
                  </p>
                  {errors.formasParticipacion?.[formaIndex]
                    ?.numEntrenadoresMujeres && (
                    <p className="mt-1 text-xs text-red-600">
                      {
                        errors.formasParticipacion[formaIndex]
                          ?.numEntrenadoresMujeres?.message
                      }
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Atletas hombres
                  </label>
                  <input
                    className="form-input w-full"
                    type="text"
                    inputMode="numeric"
                    {...register(
                      `formasParticipacion.${formaIndex}.numAtletasHombres`,
                      { setValueAs: parseIntegerInput },
                    )}
                  />
                  {errors.formasParticipacion?.[formaIndex]
                    ?.numAtletasHombres && (
                    <p className="mt-1 text-xs text-red-600">
                      {
                        errors.formasParticipacion[formaIndex]
                          ?.numAtletasHombres?.message
                      }
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Atletas mujeres
                  </label>
                  <input
                    className="form-input w-full"
                    type="text"
                    inputMode="numeric"
                    {...register(
                      `formasParticipacion.${formaIndex}.numAtletasMujeres`,
                      { setValueAs: parseIntegerInput },
                    )}
                  />
                  {errors.formasParticipacion?.[formaIndex]
                    ?.numAtletasMujeres && (
                    <p className="mt-1 text-xs text-red-600">
                      {
                        errors.formasParticipacion[formaIndex]
                          ?.numAtletasMujeres?.message
                      }
                    </p>
                  )}
                </div>
              </div>

              {fuente && sectionInfo && (
                <div className="mt-4 space-y-3 border-t border-gray-200 pt-4 dark:border-gray-700/60">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-gray-800 dark:text-gray-100">
                        {sectionInfo.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {sectionInfo.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Total
                      </p>
                      <p className="text-base font-semibold text-gray-800 dark:text-gray-100">
                        $
                        {sectionTotal.toLocaleString("es-EC", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  </div>

                  {sectionItems.map(({ field, index }, sectionIndex) => (
                    <div
                      key={field.id}
                      className="space-y-2 rounded-lg bg-white p-3 dark:bg-gray-800/70"
                    >
                      <input
                        type="hidden"
                        {...register(`eventoItems.${index}.fuente`)}
                        value={fuente}
                      />

                      <div className="grid grid-cols-12 gap-3 items-start">
                        <div className="col-span-11">
                          {sectionIndex === 0 && (
                            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                              Item
                            </label>
                          )}
                          <select
                            className="form-select w-full text-sm"
                            {...register(`eventoItems.${index}.itemId`, {
                              setValueAs: (v) =>
                                v === "" ? undefined : Number(v),
                            })}
                          >
                            <option value="">Seleccionar item...</option>
                            {Object.entries(itemsByActividad).map(
                              ([actName, items]) => (
                                <optgroup key={actName} label={actName}>
                                  {items.map((item) => (
                                    <option key={item.id} value={item.id}>
                                      {item.numero} - {item.nombre}
                                    </option>
                                  ))}
                                </optgroup>
                              ),
                            )}
                          </select>
                          {errors.eventoItems?.[index]?.itemId && (
                            <p className="mt-1 text-xs text-red-600">
                              {errors.eventoItems[index].itemId?.message}
                            </p>
                          )}
                        </div>

                        <div className="col-span-1 flex items-end">
                          {sectionIndex === 0 && (
                            <span className="mb-1 block select-none text-xs text-transparent">
                              .
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
                            title="Eliminar item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-4 items-start">
                        <div>
                          {sectionIndex === 0 && (
                            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                              Mes
                            </label>
                          )}
                          <select
                            className="form-select w-full text-sm"
                            {...register(`eventoItems.${index}.mes`, {
                              setValueAs: (v) =>
                                v === "" ? undefined : Number(v),
                            })}
                          >
                            <option value="">Mes...</option>
                            {EVENTO_MES_OPTIONS.map((m) => (
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

                        <div>
                          {sectionIndex === 0 && (
                            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                              Presupuesto ($)
                            </label>
                          )}
                          <input
                            className="form-input w-full text-sm"
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            {...register(`eventoItems.${index}.presupuesto`, {
                              setValueAs: parseDecimalInput,
                            })}
                          />
                          {errors.eventoItems?.[index]?.presupuesto && (
                            <p className="mt-1 text-xs text-red-600">
                              {errors.eventoItems[index].presupuesto?.message}
                            </p>
                          )}
                        </div>

                        <div>
                          {sectionIndex === 0 && (
                            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                              Comprometido ($)
                            </label>
                          )}
                          <input
                            className="form-input w-full text-sm"
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            {...register(
                              `eventoItems.${index}.montoComprometido`,
                              {
                                setValueAs: parseDecimalInput,
                              },
                            )}
                          />
                        </div>

                        <div>
                          {sectionIndex === 0 && (
                            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                              Ejecutado ($)
                            </label>
                          )}
                          <input
                            className="form-input w-full text-sm"
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            {...register(
                              `eventoItems.${index}.montoEjecutado`,
                              {
                                setValueAs: parseDecimalInput,
                              },
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => appendBudgetItem(fuente)}
                    className="flex items-center gap-2 text-sm font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
                  >
                    <Plus className="h-4 w-4" />
                    Agregar item de {sectionInfo.title.toLowerCase()}
                  </button>

                  {sectionItems.length === 0 && (
                    <p className="text-sm italic text-gray-400 dark:text-gray-500">
                      {sectionInfo.empty}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {canAddFormaParticipacion && (
          <div className="flex flex-wrap gap-2">
            {availableTipoAvalOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => addFormaParticipacion(option.value)}
                className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-violet-600 hover:border-violet-400 hover:text-violet-700 dark:border-gray-700 dark:text-violet-400 dark:hover:text-violet-300"
              >
                <Plus className="h-4 w-4" />
                Agregar {option.label}
              </button>
            ))}
          </div>
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

      <EventoFileUpload
        archivo={archivo}
        archivoPreview={archivoPreview}
        draggingArchivo={draggingArchivo}
        currentArchivoLabel={mode === "edit" ? (evento?.archivo ?? null) : null}
        onFileChange={handleFileChange}
        onDragOver={handleArchivoDragOver}
        onDragLeave={handleArchivoDragLeave}
        onDrop={handleArchivoDrop}
        onRemove={removeFile}
      />

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
