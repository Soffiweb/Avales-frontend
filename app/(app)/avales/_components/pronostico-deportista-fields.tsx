"use client";

import type { PropositoDto } from "@/types/aval";
import {
  PROCEDENCIA_GROUP_FIELDS,
  getPropositoFieldDefinitions,
  type DeportistaPronosticoFieldPath,
  type PronosticoFieldDefinition,
  type PronosticoProfile,
} from "@/lib/utils/aval-pronostico";
import type { PronosticoFieldErrors } from "@/lib/validation/aval-pronostico";

type PronosticoEditableDeportista = {
  categoriaNombre?: string;
  afiliacion?: string;
  canton?: string;
  club?: string;
  entrenadorNombre?: string;
  propositos?: PropositoDto[];
};

type PronosticoDeportistaFieldsProps = {
  deportista: PronosticoEditableDeportista;
  profile: PronosticoProfile;
  defaultCategoriaNombre?: string;
  errors?: PronosticoFieldErrors;
  /** Chips de cantón/club/entrenador actualmente activos para este deportista. */
  activePaths: ReadonlySet<DeportistaPronosticoFieldPath>;
  onToggleActive: (path: DeportistaPronosticoFieldPath) => void;
  onChange: (
    path: DeportistaPronosticoFieldPath,
    value: string,
  ) => void;
  /** Plantilla 3: ítems de propositos[] repetibles por deportista. Plantillas
   * 1/2 también los usan, con índice fijo 0 (un solo ítem, sin repetidor). */
  onAddPrueba?: () => void;
  onRemovePrueba?: (index: number) => void;
  onPruebaFieldChange: (
    index: number,
    path: DeportistaPronosticoFieldPath,
    value: string,
  ) => void;
};

function getFieldValue(
  deportista: PronosticoEditableDeportista,
  path: DeportistaPronosticoFieldPath,
) {
  switch (path) {
    case "categoriaNombre":
      return deportista.categoriaNombre ?? "";
    case "afiliacion":
      return deportista.afiliacion ?? "";
    case "canton":
      return deportista.canton ?? "";
    case "club":
      return deportista.club ?? "";
    case "entrenadorNombre":
      return deportista.entrenadorNombre ?? "";
    default:
      return "";
  }
}

function getRowFieldValue(row: PropositoDto, path: DeportistaPronosticoFieldPath) {
  switch (path) {
    case "proposito.prueba":
      return row.prueba ?? "";
    case "proposito.marcaActual":
      return row.marcaActual ?? "";
    case "proposito.unidadMarcaActual":
      return row.unidadMarcaActual ?? "";
    case "proposito.marcaProposito":
      return row.marcaProposito ?? "";
    case "proposito.unidadMarcaProposito":
      return row.unidadMarcaProposito ?? "";
    case "proposito.ubicacionActual":
      return row.ubicacionActual ?? "";
    case "proposito.ubicacionProposito":
      return row.ubicacionProposito ?? "";
    case "proposito.divisionPeso":
      return row.divisionPeso ?? "";
    default:
      return "";
  }
}

// Marca/ubicación propósito van en la mini-sección "Propósito" (igual que en
// el Excel real: grupo PROPOSITO/PROPOSITOS agrupando esas columnas), no
// mezcladas con los datos "actuales" de la prueba.
const PROPOSITO_ROW_PATHS: DeportistaPronosticoFieldPath[] = [
  "proposito.marcaProposito",
  "proposito.unidadMarcaProposito",
  "proposito.ubicacionProposito",
];

// Dentro de "Propósito" el encabezado ya deja claro de qué se trata; se
// acortan las etiquetas para no repetir la palabra (como "MARCAS" /
// "UBICACIÓN" en el Excel, sin decir "propósito" de nuevo).
const PROPOSITO_LABELS: Partial<Record<DeportistaPronosticoFieldPath, string>> = {
  "proposito.marcaProposito": "Marca",
  "proposito.unidadMarcaProposito": "Unidad marca",
  "proposito.ubicacionProposito": "Ubicación",
};

function PruebaRowFieldInput({
  row,
  field,
  label,
  error,
  onChange,
}: {
  row: PropositoDto;
  field: PronosticoFieldDefinition;
  label?: string;
  error?: string;
  onChange: (path: DeportistaPronosticoFieldPath, value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
        {label ?? field.label}
      </span>
      <input
        type="text"
        value={getRowFieldValue(row, field.path)}
        onChange={(e) => onChange(field.path, e.target.value)}
        placeholder={field.placeholder}
        className={`form-input w-full text-sm ${
          error ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500" : ""
        }`}
      />
      {error ? (
        <span className="mt-1 block text-[11px] text-rose-600 dark:text-rose-400">{error}</span>
      ) : null}
    </label>
  );
}

function PruebasRepeater({
  profile,
  propositos,
  rowErrors,
  onAddPrueba,
  onRemovePrueba,
  onPruebaFieldChange,
}: {
  profile: PronosticoProfile;
  propositos: PropositoDto[];
  rowErrors?: PronosticoFieldErrors["pruebas"];
  onAddPrueba: () => void;
  onRemovePrueba: (index: number) => void;
  onPruebaFieldChange: (
    index: number,
    path: DeportistaPronosticoFieldPath,
    value: string,
  ) => void;
}) {
  const rowFields = getPropositoFieldDefinitions(profile);
  const actualFields = rowFields.filter((f) => !PROPOSITO_ROW_PATHS.includes(f.path));
  const propositoFields = rowFields.filter((f) => PROPOSITO_ROW_PATHS.includes(f.path));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="block text-xs font-medium text-slate-700 dark:text-slate-300">
          Pruebas
        </span>
        <button
          type="button"
          onClick={onAddPrueba}
          className="rounded-md border border-indigo-300 bg-white px-2 py-1 text-[11px] font-medium text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50 dark:border-indigo-700 dark:bg-slate-800 dark:text-indigo-300"
        >
          + Agregar prueba
        </button>
      </div>

      {propositos.length === 0 ? (
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Agrega al menos una prueba.
        </p>
      ) : (
        propositos.map((row, index) => (
          <div
            key={index}
            className="rounded-md border border-slate-200 bg-white p-2.5 dark:border-slate-600 dark:bg-slate-800/60"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Prueba {index + 1}
              </span>
              <button
                type="button"
                onClick={() => onRemovePrueba(index)}
                className="text-[11px] font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400"
              >
                Quitar
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {actualFields.map((field) => (
                <PruebaRowFieldInput
                  key={field.path}
                  row={row}
                  field={field}
                  error={rowErrors?.[index]?.[field.path]}
                  onChange={(path, value) => onPruebaFieldChange(index, path, value)}
                />
              ))}
            </div>

            {propositoFields.length > 0 ? (
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2.5 dark:border-amber-800 dark:bg-amber-900/10">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                  Propósito
                </span>
                <div className="grid gap-3 md:grid-cols-2">
                  {propositoFields.map((field) => (
                    <PruebaRowFieldInput
                      key={field.path}
                      row={row}
                      field={field}
                      label={PROPOSITO_LABELS[field.path]}
                      error={rowErrors?.[index]?.[field.path]}
                      onChange={(path, value) => onPruebaFieldChange(index, path, value)}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ))
      )}
    </div>
  );
}

function FieldInput({
  deportista,
  field,
  label,
  error,
  defaultCategoriaNombre,
  onChange,
}: {
  deportista: PronosticoEditableDeportista;
  field: PronosticoFieldDefinition;
  label?: string;
  error?: string;
  defaultCategoriaNombre?: string;
  onChange: (path: DeportistaPronosticoFieldPath, value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
        {label ?? field.label}
      </span>
      <input
        type="text"
        value={getFieldValue(deportista, field.path)}
        onChange={(e) => onChange(field.path, e.target.value)}
        placeholder={field.placeholder}
        className={`form-input w-full text-sm ${
          error ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500" : ""
        }`}
      />
      {field.path === "categoriaNombre" && defaultCategoriaNombre ? (
        <span className="mt-1 block text-[11px] text-slate-500 dark:text-slate-400">
          Sugerida por el evento: {defaultCategoriaNombre}
        </span>
      ) : null}
      {error ? (
        <span className="mt-1 block text-[11px] text-rose-600 dark:text-rose-400">{error}</span>
      ) : null}
    </label>
  );
}

export default function PronosticoDeportistaFields({
  deportista,
  profile,
  defaultCategoriaNombre,
  errors,
  activePaths,
  onToggleActive,
  onChange,
  onAddPrueba,
  onRemovePrueba,
  onPruebaFieldChange,
}: PronosticoDeportistaFieldsProps) {
  const groupFields = profile.fields.filter((field) =>
    PROCEDENCIA_GROUP_FIELDS.includes(field.path),
  );
  // Campos que viven en propositos[]: en plantilla 3 se editan en el
  // repetidor (N ítems); en 1/2 son los mismos campos pero sueltos, sobre un
  // único ítem fijo (propositos[0]).
  const rowFieldPaths = new Set(getPropositoFieldDefinitions(profile).map((f) => f.path));
  const otherFields = profile.fields.filter(
    (field) => !PROCEDENCIA_GROUP_FIELDS.includes(field.path) && !rowFieldPaths.has(field.path),
  );
  const flatPropositoFields = profile.multiplePruebas
    ? []
    : getPropositoFieldDefinitions(profile);
  const flatActualFields = flatPropositoFields.filter((f) => !PROPOSITO_ROW_PATHS.includes(f.path));
  const flatPropositoOnlyFields = flatPropositoFields.filter((f) =>
    PROPOSITO_ROW_PATHS.includes(f.path),
  );
  const firstProposito = deportista.propositos?.[0] ?? {};
  const noneActive = groupFields.length > 0 && groupFields.every((f) => !activePaths.has(f.path));
  const groupError = noneActive ? errors?.[groupFields[0]?.path] : undefined;

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-800/40">
      <div className="mb-3 flex justify-end">
        <span className="rounded-full bg-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-200">
          {profile.disciplinaLabel}
        </span>
      </div>

      {groupFields.length > 0 ? (
        <div className="mb-3">
          <span className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
            Procedencia (selecciona lo que aplique)
          </span>
          <div className="flex flex-wrap gap-1.5">
            {groupFields.map((field) => {
              const active = activePaths.has(field.path);
              return (
                <button
                  key={field.path}
                  type="button"
                  onClick={() => onToggleActive(field.path)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    active
                      ? "border-indigo-500 bg-indigo-500 text-white"
                      : "border-slate-300 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {field.label}
                </button>
              );
            })}
          </div>
          {groupError ? (
            <span className="mt-1 block text-[11px] text-rose-600 dark:text-rose-400">
              {groupError}
            </span>
          ) : null}

          {groupFields.some((field) => activePaths.has(field.path)) ? (
            <div className="mt-2 grid gap-3 md:grid-cols-2">
              {groupFields
                .filter((field) => activePaths.has(field.path))
                .map((field) => (
                  <FieldInput
                    key={field.path}
                    deportista={deportista}
                    field={field}
                    error={errors?.[field.path]}
                    onChange={onChange}
                  />
                ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {otherFields.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {otherFields.map((field) => (
            <FieldInput
              key={field.path}
              deportista={deportista}
              field={field}
              error={errors?.[field.path]}
              defaultCategoriaNombre={defaultCategoriaNombre}
              onChange={onChange}
            />
          ))}
        </div>
      ) : null}

      {!profile.multiplePruebas && flatActualFields.length > 0 ? (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {flatActualFields.map((field) => (
            <PruebaRowFieldInput
              key={field.path}
              row={firstProposito}
              field={field}
              error={errors?.pruebas?.[0]?.[field.path]}
              onChange={(path, value) => onPruebaFieldChange(0, path, value)}
            />
          ))}
        </div>
      ) : null}

      {!profile.multiplePruebas && flatPropositoOnlyFields.length > 0 ? (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2.5 dark:border-amber-800 dark:bg-amber-900/10">
          <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
            Propósito
          </span>
          <div className="grid gap-3 md:grid-cols-2">
            {flatPropositoOnlyFields.map((field) => (
              <PruebaRowFieldInput
                key={field.path}
                row={firstProposito}
                field={field}
                label={PROPOSITO_LABELS[field.path]}
                error={errors?.pruebas?.[0]?.[field.path]}
                onChange={(path, value) => onPruebaFieldChange(0, path, value)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {profile.multiplePruebas && onAddPrueba && onRemovePrueba ? (
        <div className="mt-3">
          <PruebasRepeater
            profile={profile}
            propositos={deportista.propositos ?? []}
            rowErrors={errors?.pruebas}
            onAddPrueba={onAddPrueba}
            onRemovePrueba={onRemovePrueba}
            onPruebaFieldChange={onPruebaFieldChange}
          />
          {errors?.["proposito.prueba"] && !deportista.propositos?.length ? (
            <span className="mt-1 block text-[11px] text-rose-600 dark:text-rose-400">
              {errors["proposito.prueba"]}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
