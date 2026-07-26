"use client";

import type { DeportistaPronosticoDto } from "@/types/aval";
import type {
  DeportistaPronosticoFieldPath,
  PronosticoProfile,
} from "@/lib/utils/aval-pronostico";
import type { PronosticoFieldErrors } from "@/lib/validation/aval-pronostico";

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
  index: number;
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

export default function PronosticoDeportistaFields({
  deportista,
  index,
  profile,
  defaultCategoriaNombre,
  errors,
  onChange,
}: PronosticoDeportistaFieldsProps) {
  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-800/40">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
            {profile.template.replace("_", " ")}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Orden pronóstico #{index + 1}
          </p>
        </div>
        <span className="rounded-full bg-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-200">
          {profile.disciplinaLabel}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {profile.fields.map((field) => {
          const error = errors?.[field.path];
          return (
            <label key={field.path} className="block">
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
                <span className="mt-1 block text-[11px] text-rose-600 dark:text-rose-400">
                  {error}
                </span>
              ) : null}
            </label>
          );
        })}
      </div>
    </div>
  );
}
