"use client";

import { Controller } from "react-hook-form";
import { Plus, Sparkles } from "lucide-react";

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
} from "@/lib/constants";
import { getCatalogItemCode } from "@/lib/utils/catalog";
import EventoFileUpload from "./evento-file-upload";
import FormaParticipacionCard from "./forma-participacion-card";
import { useEventoForm } from "./use-evento-form";

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
  const {
    addFormaParticipacion,
    archivo,
    archivoPreview,
    buttonLabel,
    catalogError,
    catalogLoading,
    control,
    disciplinas,
    draggingArchivo,
    errors,
    formasParticipacionFields,
    generateCodigoError,
    generatingCodigo,
    getValues,
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
    removeFormaParticipacion,
    removeFile,
    submitError,
    totalPresupuesto,
  } = useEventoForm({
    mode,
    evento,
    onCreated,
    onUpdated,
  });

  const canAddFormaParticipacion = formasParticipacionFields.length < 3;

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
        {formasParticipacionFields.map((formaField, formaIndex) => (
          <FormaParticipacionCard
            key={formaField.id}
            control={control}
            register={register}
            errors={errors}
            getValues={getValues}
            formaIndex={formaIndex}
            itemsByActividad={itemsByActividad}
            onRemove={() => removeFormaParticipacion(formaIndex)}
          />
        ))}

        {canAddFormaParticipacion && (
          <div className="flex flex-wrap gap-2">
            {TIPO_AVAL_OPTIONS.map((option) => (
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
