"use client";

import {
  useFieldArray,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormGetValues,
  type UseFormRegister,
} from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";

import { EVENTO_MES_OPTIONS, getTipoAvalLabel } from "@/lib/constants";
import type { CatalogItemPresupuestario } from "@/types/catalog";
import type { EventoFormValues } from "@/lib/validation/evento";
import { parseDecimalInput, parseIntegerInput } from "./evento-form-helpers";

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

type Props = {
  control: Control<EventoFormValues>;
  register: UseFormRegister<EventoFormValues>;
  errors: FieldErrors<EventoFormValues>;
  getValues: UseFormGetValues<EventoFormValues>;
  formaIndex: number;
  itemsByActividad: Record<string, CatalogItemPresupuestario[]>;
  onRemove: () => void;
};

export default function FormaParticipacionCard({
  control,
  register,
  errors,
  getValues,
  formaIndex,
  itemsByActividad,
  onRemove,
}: Props) {
  const tipoAval = useWatch({
    control,
    name: `formasParticipacion.${formaIndex}.tipoAval`,
  });
  const fuente = tipoAvalToFuente(tipoAval);
  const sectionInfo = fuente ? PRESUPUESTO_SECTION_INFO[fuente] : undefined;

  const {
    fields: itemFields,
    append: appendItem,
    remove: removeItem,
  } = useFieldArray({
    control,
    name: `formasParticipacion.${formaIndex}.items`,
  });

  const itemsValues =
    useWatch({ control, name: `formasParticipacion.${formaIndex}.items` }) ?? [];

  const sectionTotal = itemsValues.reduce(
    (sum, item) => sum + (item?.presupuesto || 0),
    0,
  );

  const formaErrors = errors.formasParticipacion?.[formaIndex];

  const handleAddItem = () => {
    if (!fuente) return;
    appendItem({
      itemId: 0,
      mes: getValues("mesProgramado") || 1,
      presupuesto: 0,
      fuente,
      montoComprometido: 0,
      montoEjecutado: 0,
    });
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-700/60 dark:bg-gray-900/20">
      <input
        type="hidden"
        {...register(`formasParticipacion.${formaIndex}.tipoAval`)}
      />

      <div className="mb-4 flex items-start justify-between gap-3">
        <span className="inline-flex items-center rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
          {getTipoAvalLabel(tipoAval)}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
          title="Eliminar tipo de participación"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-1">
            Referencia <span className="text-red-600">*</span>
          </label>
          <input
            className="form-input w-full"
            type="text"
            placeholder="Referencia de la participación (ej: nombre de la organización, institución o similar)"
            required
            {...register(`formasParticipacion.${formaIndex}.referencia`)}
          />
          {formaErrors?.referencia && (
            <p className="mt-1 text-xs text-red-600">
              {formaErrors.referencia.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Observación</label>
          <input
            className="form-input w-full"
            type="text"
            placeholder="Detalle opcional"
            {...register(`formasParticipacion.${formaIndex}.observacion`)}
          />
          {formaErrors?.observacion && (
            <p className="mt-1 text-xs text-red-600">
              {formaErrors.observacion.message}
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
          {formaErrors?.numEntrenadoresHombres && (
            <p className="mt-1 text-xs text-red-600">
              {formaErrors.numEntrenadoresHombres.message}
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
          {formaErrors?.numEntrenadoresMujeres && (
            <p className="mt-1 text-xs text-red-600">
              {formaErrors.numEntrenadoresMujeres.message}
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
            {...register(`formasParticipacion.${formaIndex}.numAtletasHombres`, {
              setValueAs: parseIntegerInput,
            })}
          />
          {formaErrors?.numAtletasHombres && (
            <p className="mt-1 text-xs text-red-600">
              {formaErrors.numAtletasHombres.message}
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
            {...register(`formasParticipacion.${formaIndex}.numAtletasMujeres`, {
              setValueAs: parseIntegerInput,
            })}
          />
          {formaErrors?.numAtletasMujeres && (
            <p className="mt-1 text-xs text-red-600">
              {formaErrors.numAtletasMujeres.message}
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

          {itemFields.map((field, index) => (
            <div
              key={field.id}
              className="space-y-2 rounded-lg bg-white p-3 dark:bg-gray-800/70"
            >
              <input
                type="hidden"
                {...register(
                  `formasParticipacion.${formaIndex}.items.${index}.fuente`,
                )}
              />

              <div className="grid grid-cols-12 gap-3 items-start">
                <div className="col-span-11">
                  {index === 0 && (
                    <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                      Item
                    </label>
                  )}
                  <select
                    className="form-select w-full text-sm"
                    {...register(
                      `formasParticipacion.${formaIndex}.items.${index}.itemId`,
                      { setValueAs: (v) => (v === "" ? undefined : Number(v)) },
                    )}
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
                  {formaErrors?.items?.[index]?.itemId && (
                    <p className="mt-1 text-xs text-red-600">
                      {formaErrors.items[index]?.itemId?.message}
                    </p>
                  )}
                </div>

                <div className="col-span-1 flex items-end">
                  {index === 0 && (
                    <span className="mb-1 block select-none text-xs text-transparent">
                      .
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
                    title="Eliminar item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-4 items-start">
                <div>
                  {index === 0 && (
                    <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                      Mes
                    </label>
                  )}
                  <select
                    className="form-select w-full text-sm"
                    {...register(
                      `formasParticipacion.${formaIndex}.items.${index}.mes`,
                      { setValueAs: (v) => (v === "" ? undefined : Number(v)) },
                    )}
                  >
                    <option value="">Mes...</option>
                    {EVENTO_MES_OPTIONS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  {formaErrors?.items?.[index]?.mes && (
                    <p className="mt-1 text-xs text-red-600">
                      {formaErrors.items[index]?.mes?.message}
                    </p>
                  )}
                </div>

                <div>
                  {index === 0 && (
                    <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                      Presupuesto ($)
                    </label>
                  )}
                  <input
                    className="form-input w-full text-sm"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    {...register(
                      `formasParticipacion.${formaIndex}.items.${index}.presupuesto`,
                      { setValueAs: parseDecimalInput },
                    )}
                  />
                  {formaErrors?.items?.[index]?.presupuesto && (
                    <p className="mt-1 text-xs text-red-600">
                      {formaErrors.items[index]?.presupuesto?.message}
                    </p>
                  )}
                </div>

                <div>
                  {index === 0 && (
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
                      `formasParticipacion.${formaIndex}.items.${index}.montoComprometido`,
                      { setValueAs: parseDecimalInput },
                    )}
                  />
                </div>

                <div>
                  {index === 0 && (
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
                      `formasParticipacion.${formaIndex}.items.${index}.montoEjecutado`,
                      { setValueAs: parseDecimalInput },
                    )}
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddItem}
            className="flex items-center gap-2 text-sm font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
          >
            <Plus className="h-4 w-4" />
            Agregar item de {sectionInfo.title.toLowerCase()}
          </button>

          {itemFields.length === 0 && (
            <p className="text-sm italic text-gray-400 dark:text-gray-500">
              {sectionInfo.empty}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
