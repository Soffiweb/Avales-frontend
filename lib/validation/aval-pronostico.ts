import type { DeportistaPronosticoDto } from "@/types/aval";
import {
  PROCEDENCIA_GROUP_FIELDS,
  type DeportistaPronosticoFieldPath,
  type PronosticoProfile,
} from "@/lib/utils/aval-pronostico";

export type PronosticoEditableDeportista = {
  categoriaNombre?: string;
  afiliacion?: string;
  canton?: string;
  club?: string;
  entrenadorNombre?: string;
  pronostico?: DeportistaPronosticoDto;
};

export type PronosticoFieldErrors = Partial<
  Record<DeportistaPronosticoFieldPath, string>
>;

function getValue(
  deportista: PronosticoEditableDeportista,
  path: DeportistaPronosticoFieldPath,
) {
  switch (path) {
    case "categoriaNombre":
      return deportista.categoriaNombre;
    case "afiliacion":
      return deportista.afiliacion;
    case "canton":
      return deportista.canton;
    case "club":
      return deportista.club;
    case "entrenadorNombre":
      return deportista.entrenadorNombre;
    case "pronostico.ubicacionActual":
      return deportista.pronostico?.ubicacionActual;
    case "pronostico.ubicacionPronosticada":
      return deportista.pronostico?.ubicacionPronosticada;
    case "pronostico.divisionPeso":
      return deportista.pronostico?.divisionPeso;
    case "pronostico.prueba":
      return deportista.pronostico?.prueba;
    case "pronostico.marcaActual":
      return deportista.pronostico?.marcaActual;
    case "pronostico.unidadMarcaActual":
      return deportista.pronostico?.unidadMarcaActual;
    case "pronostico.marcaPronosticada":
      return deportista.pronostico?.marcaPronosticada;
    case "pronostico.unidadMarcaPronostico":
      return deportista.pronostico?.unidadMarcaPronostico;
    default:
      return undefined;
  }
}

function isFilled(deportista: PronosticoEditableDeportista, path: DeportistaPronosticoFieldPath) {
  const value = getValue(deportista, path);
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * @param procedenciaActiva Qué chips de cantón/club/entrenador están
 * activos para este deportista (decidido en la UI, no derivable de los
 * valores solos: un campo vacío puede ser "inactivo" o "activo sin llenar").
 */
export function validatePronosticoDeportista(
  deportista: PronosticoEditableDeportista,
  profile: PronosticoProfile | null,
  procedenciaActiva?: ReadonlySet<DeportistaPronosticoFieldPath>,
): PronosticoFieldErrors {
  if (!profile) return {};

  const activeSet = procedenciaActiva ?? new Set<DeportistaPronosticoFieldPath>();
  const groupFields = profile.fields.filter((field) =>
    PROCEDENCIA_GROUP_FIELDS.includes(field.path),
  );
  const anyGroupFieldActive = groupFields.some((field) => activeSet.has(field.path));

  return profile.fields.reduce<PronosticoFieldErrors>((errors, field) => {
    if (PROCEDENCIA_GROUP_FIELDS.includes(field.path)) {
      if (!anyGroupFieldActive) {
        const labels = groupFields.map((f) => f.label.toLowerCase());
        errors[field.path] = `Selecciona al menos uno: ${labels.join(", ")}.`;
        return errors;
      }
      if (activeSet.has(field.path) && !isFilled(deportista, field.path)) {
        errors[field.path] = `Completa ${field.label.toLowerCase()}.`;
      }
      return errors;
    }

    if (!isFilled(deportista, field.path)) {
      errors[field.path] = `Completa ${field.label.toLowerCase()}.`;
    }
    return errors;
  }, {});
}
