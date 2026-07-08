import type { DeportistaPronosticoDto } from "@/types/aval";
import type {
  DeportistaPronosticoFieldPath,
  PronosticoProfile,
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

export function validatePronosticoDeportista(
  deportista: PronosticoEditableDeportista,
  profile: PronosticoProfile | null,
): PronosticoFieldErrors {
  if (!profile) return {};

  return profile.fields.reduce<PronosticoFieldErrors>((errors, field) => {
    const value = getValue(deportista, field.path);
    if (typeof value !== "string" || value.trim().length === 0) {
      errors[field.path] = `Completa ${field.label.toLowerCase()}.`;
    }
    return errors;
  }, {});
}
