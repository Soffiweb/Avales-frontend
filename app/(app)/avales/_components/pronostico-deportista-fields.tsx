"use client";

import { useState } from "react";
import type { DeportistaPronosticoDto } from "@/types/aval";
import type {
  DeportistaPronosticoFieldPath,
  PronosticoFieldDefinition,
  PronosticoProfile,
} from "@/lib/utils/aval-pronostico";
import type { PronosticoFieldErrors } from "@/lib/validation/aval-pronostico";

const PROCEDENCIA_GROUP = new Set<DeportistaPronosticoFieldPath>([
  "canton",
  "club",
  "entrenadorNombre",
]);

type PronosticoEditableDeportista = {
  categoriaNombre?: string;
  afiliacion?: string;
  canton?: string;
  club?: string;
  entrenadorNombre?: string;
  pronostico?: DeportistaPronosticoDto;
};

type PronosticoDeportistaFieldsProps = {
  deportista: PronosticoEditableDeportista;
  profile: PronosticoProfile;
  defaultCategoriaNombre?: string;
  errors?: PronosticoFieldErrors;
  onChange: (
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
    case "pronostico.ubicacionActual":
      return deportista.pronostico?.ubicacionActual ?? "";
    case "pronostico.ubicacionPronosticada":
      return deportista.pronostico?.ubicacionPronosticada ?? "";
    case "pronostico.divisionPeso":
      return deportista.pronostico?.divisionPeso ?? "";
    case "pronostico.prueba":
      return deportista.pronostico?.prueba ?? "";
    case "pronostico.marcaActual":
      return deportista.pronostico?.marcaActual ?? "";
    case "pronostico.unidadMarcaActual":
      return deportista.pronostico?.unidadMarcaActual ?? "";
    case "pronostico.marcaPronosticada":
      return deportista.pronostico?.marcaPronosticada ?? "";
    case "pronostico.unidadMarcaPronostico":
      return deportista.pronostico?.unidadMarcaPronostico ?? "";
    default:
      return "";
  }
}

function isFilled(deportista: PronosticoEditableDeportista, path: DeportistaPronosticoFieldPath) {
  return getFieldValue(deportista, path).trim().length > 0;
}

function FieldInput({
  deportista,
  field,
  error,
  defaultCategoriaNombre,
  onChange,
}: {
  deportista: PronosticoEditableDeportista;
  field: PronosticoFieldDefinition;
  error?: string;
  defaultCategoriaNombre?: string;
  onChange: (path: DeportistaPronosticoFieldPath, value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
        {field.label}
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
  onChange,
}: PronosticoDeportistaFieldsProps) {
  const groupFields = profile.fields.filter((field) => PROCEDENCIA_GROUP.has(field.path));
  const otherFields = profile.fields.filter((field) => !PROCEDENCIA_GROUP.has(field.path));

  const [activeGroupPaths, setActiveGroupPaths] = useState<Set<DeportistaPronosticoFieldPath>>(
    () => new Set(groupFields.filter((field) => isFilled(deportista, field.path)).map((f) => f.path)),
  );

  const toggleGroupField = (path: DeportistaPronosticoFieldPath) => {
    setActiveGroupPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
        onChange(path, "");
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const groupError = groupFields.map((field) => errors?.[field.path]).find(Boolean);

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
            Procedencia (selecciona lo que apliquen)
          </span>
          <div className="flex flex-wrap gap-1.5">
            {groupFields.map((field) => {
              const active = activeGroupPaths.has(field.path);
              return (
                <button
                  key={field.path}
                  type="button"
                  onClick={() => toggleGroupField(field.path)}
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

          {groupFields.some((field) => activeGroupPaths.has(field.path)) ? (
            <div className="mt-2 grid gap-3 md:grid-cols-2">
              {groupFields
                .filter((field) => activeGroupPaths.has(field.path))
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
    </div>
  );
}
