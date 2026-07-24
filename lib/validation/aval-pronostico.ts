import type { DeportistaPronosticoDto } from "@/types/aval";
import type {
  DeportistaPronosticoFieldPath,
  PronosticoProfile,
} from "@/lib/utils/aval-pronostico";

// Cantón, club y entrenador son alternativas del mismo dato de procedencia:
// se completa el que aplique (federación → entrenador, club → club, provincia → cantón),
// no los tres a la vez.
const PROCEDENCIA_GROUP: DeportistaPronosticoFieldPath[] = [
  "canton",
  "club",
  "entrenadorNombre",
];

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

export function validatePronosticoDeportista(
  deportista: PronosticoEditableDeportista,
  profile: PronosticoProfile | null,
): PronosticoFieldErrors {
  if (!profile) return {};

  const groupFields = profile.fields.filter((field) =>
    PROCEDENCIA_GROUP.includes(field.path),
  );
  const groupSatisfied = groupFields.some((field) => isFilled(deportista, field.path));

  return profile.fields.reduce<PronosticoFieldErrors>((errors, field) => {
    if (PROCEDENCIA_GROUP.includes(field.path)) {
      if (!groupSatisfied) {
        const labels = groupFields.map((f) => f.label.toLowerCase());
        errors[field.path] = `Completa al menos uno: ${labels.join(", ")}.`;
      }
      return errors;
    }

    if (!isFilled(deportista, field.path)) {
      errors[field.path] = `Completa ${field.label.toLowerCase()}.`;
    }
    return errors;
  }, {});
}
