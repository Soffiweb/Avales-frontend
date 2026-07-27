import type { PropositoDto } from "@/types/aval";
import {
  PROCEDENCIA_GROUP_FIELDS,
  getPropositoFieldDefinitions,
  isPropositoFieldPath,
  type DeportistaPronosticoFieldPath,
  type PronosticoProfile,
} from "@/lib/utils/aval-pronostico";

export type PronosticoEditableDeportista = {
  categoriaNombre?: string;
  afiliacion?: string;
  canton?: string;
  club?: string;
  entrenadorNombre?: string;
  propositos?: PropositoDto[];
};

export type PronosticoRowFieldErrors = Partial<
  Record<DeportistaPronosticoFieldPath, string>
>;

export type PronosticoFieldErrors = Partial<
  Record<DeportistaPronosticoFieldPath, string>
> & {
  /** Errores por ítem de `propositos` (plantilla 3: varios; 1/2: uno solo), en el mismo orden. */
  pruebas?: PronosticoRowFieldErrors[];
};

function getRowValue(row: PropositoDto, path: DeportistaPronosticoFieldPath) {
  switch (path) {
    case "proposito.prueba":
      return row.prueba;
    case "proposito.marcaActual":
      return row.marcaActual;
    case "proposito.unidadMarcaActual":
      return row.unidadMarcaActual;
    case "proposito.marcaProposito":
      return row.marcaProposito;
    case "proposito.unidadMarcaProposito":
      return row.unidadMarcaProposito;
    case "proposito.ubicacionActual":
      return row.ubicacionActual;
    case "proposito.ubicacionProposito":
      return row.ubicacionProposito;
    case "proposito.divisionPeso":
      return row.divisionPeso;
    default:
      return undefined;
  }
}

// Solo cubre los 5 campos deportista-level: los de propositos[] se validan
// aparte (validatePruebasRows), nunca llegan acá (ver fieldsToValidate).
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
    default:
      return undefined;
  }
}

function isFilled(deportista: PronosticoEditableDeportista, path: DeportistaPronosticoFieldPath) {
  const value = getValue(deportista, path);
  return typeof value === "string" && value.trim().length > 0;
}

function isRowFilled(row: PropositoDto, path: DeportistaPronosticoFieldPath) {
  const value = getRowValue(row, path);
  return typeof value === "string" && value.trim().length > 0;
}

function validatePruebasRows(
  propositos: PropositoDto[],
  profile: PronosticoProfile,
): PronosticoRowFieldErrors[] {
  const rowFields = getPropositoFieldDefinitions(profile);
  return propositos.map((row) =>
    rowFields.reduce<PronosticoRowFieldErrors>((errors, field) => {
      if (!isRowFilled(row, field.path)) {
        errors[field.path] = `Completa ${field.label.toLowerCase()}.`;
      }
      return errors;
    }, {}),
  );
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

  // Los campos de propositos[] se validan por ítem más abajo (uno solo en
  // 1/2, N en plantilla 3), no como campo suelto de este reduce.
  const fieldsToValidate = profile.fields.filter(
    (field) => !isPropositoFieldPath(field.path),
  );

  const errors = fieldsToValidate.reduce<PronosticoFieldErrors>((acc, field) => {
    if (PROCEDENCIA_GROUP_FIELDS.includes(field.path)) {
      if (!anyGroupFieldActive) {
        const labels = groupFields.map((f) => f.label.toLowerCase());
        acc[field.path] = `Selecciona al menos uno: ${labels.join(", ")}.`;
        return acc;
      }
      if (activeSet.has(field.path) && !isFilled(deportista, field.path)) {
        acc[field.path] = `Completa ${field.label.toLowerCase()}.`;
      }
      return acc;
    }

    if (!isFilled(deportista, field.path)) {
      acc[field.path] = `Completa ${field.label.toLowerCase()}.`;
    }
    return acc;
  }, {});

  const propositoFields = getPropositoFieldDefinitions(profile);
  if (propositoFields.length > 0) {
    const propositos = deportista.propositos ?? [];
    if (profile.multiplePruebas && propositos.length === 0) {
      errors["proposito.prueba"] = "Agrega al menos una prueba.";
    } else {
      // Plantillas 1/2: un solo ítem (propositos[0]); si aún no existe se
      // valida contra uno vacío para no perder los mensajes por campo.
      const rows = propositos.length ? propositos : [{}];
      const rowErrors = validatePruebasRows(rows, profile);
      if (rowErrors.some((row) => Object.keys(row).length > 0)) {
        errors.pruebas = rowErrors;
      }
    }
  }

  return errors;
}
