import { ROLES } from "@/lib/constants";
import type { CatalogItem } from "@/types/catalog";
import type { ColumnDef, UploadType } from "./template-columns";

export type RowIssues = Record<string, string>;
export type RowIssuesByIndex = Record<number, RowIssues>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CEDULA_REGEX = /^\d{10}$/;
const PHONE_REGEX = /^\d{7,15}$/;

const normalizeComparable = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

const roleValues = new Set(ROLES.map((role) => normalizeComparable(role)));

const roleAliases: Record<string, string> = {
  ADMINISTRADOR_GENERAL: "ADMIN",
  ADMINISTRADORA_GENERAL: "ADMIN",
  ADMINISTRADOR: "ADMIN",
  ADMINISTRADORA: "ADMIN",
  ADMINISTRADORA_FINACIERA: "FINANCIERO",
  ADMINISTRADORA_FINANCIERA: "FINANCIERO",
  DIRECTOR_DEL_DTM: "DTM",
  SECRETARIO: "SECRETARIA",
  SECRETARIA: "SECRETARIA",
  METODOLOGO: "METODOLOGO",
  ENTRENADOR: "ENTRENADOR",
  ENTRENADORA: "ENTRENADOR",
  MONITOR: "ENTRENADOR",
  MONITORA: "ENTRENADOR",
  PDA: "PDA",
  COMPRAS_PUBLICAS: "COMPRAS_PUBLICAS",
  CONTROL_PREVIO: "CONTROL_PREVIO",
  FINANCIERO: "FINANCIERO",
  SUPER_ADMIN: "SUPER_ADMIN",
  DTM: "DTM",
};

function splitDisciplinaCandidates(value: string) {
  return value
    .split(/(?:,|;|\/|\||\+|\s+y\s+|\s+e\s+)/i)
    .map((item) => item.trim())
    .filter(Boolean);
}

function isValidRole(value: string) {
  const normalized = normalizeComparable(value);
  const resolved = roleAliases[normalized] ?? normalized;
  return roleValues.has(resolved);
}

function isValidDiscipline(value: string, disciplines: CatalogItem[]) {
  const normalized = normalizeComparable(value);
  if (!normalized) return false;
  if (normalized === "TODAS") return true;

  const candidates = splitDisciplinaCandidates(value);
  if (candidates.length === 0) return false;

  return candidates.every((candidate) => {
    const candidateNormalized = normalizeComparable(candidate);
    return disciplines.some((item) => {
      const code = item.codigo?.trim() ?? "";
      const itemName = item.nombre?.trim() ?? "";
      return (
        normalizeComparable(itemName) === candidateNormalized ||
        normalizeComparable(code) === candidateNormalized ||
        String(item.id) === candidateNormalized
      );
    });
  });
}

function getInvalidDisciplines(value: string, disciplines: CatalogItem[]) {
  const normalized = normalizeComparable(value);
  if (!normalized || normalized === "TODAS") return [];

  const candidates = splitDisciplinaCandidates(value);
  if (candidates.length === 0) return [value.trim()].filter(Boolean);

  return candidates.filter((candidate) => {
    const candidateNormalized = normalizeComparable(candidate);
    return !disciplines.some((item) => {
      const code = item.codigo?.trim() ?? "";
      const itemName = item.nombre?.trim() ?? "";
      return (
        normalizeComparable(itemName) === candidateNormalized ||
        normalizeComparable(code) === candidateNormalized ||
        String(item.id) === candidateNormalized
      );
    });
  });
}

function pushIssue(issues: RowIssues, key: string, message: string) {
  if (!issues[key]) issues[key] = message;
}

function validateNumericField(
  issues: RowIssues,
  row: Record<string, string>,
  key: string,
  label: string,
  options: { required?: boolean; min?: number; max?: number; integer?: boolean } = {}
) {
  const value = row[key]?.trim() ?? "";
  if (!value) {
    if (options.required) pushIssue(issues, key, `${label} es obligatorio`);
    return;
  }

  const num = Number(value);
  if (Number.isNaN(num)) {
    pushIssue(issues, key, `${label} debe ser numérico`);
    return;
  }

  if (options.integer && !Number.isInteger(num)) {
    pushIssue(issues, key, `${label} debe ser entero`);
  }
  if (options.min !== undefined && num < options.min) {
    pushIssue(issues, key, `${label} no puede ser menor que ${options.min}`);
  }
  if (options.max !== undefined && num > options.max) {
    pushIssue(issues, key, `${label} no puede ser mayor que ${options.max}`);
  }
}

export function validatePreviewRows(
  type: UploadType,
  rows: Record<string, string>[],
  columns: ColumnDef[],
  disciplines: CatalogItem[]
): RowIssuesByIndex {
  const issuesByRow: RowIssuesByIndex = {};

  rows.forEach((row, rowIndex) => {
    const issues: RowIssues = {};

    columns.forEach((col) => {
      const value = row[col.key]?.trim() ?? "";
      if (col.required && !value) {
        pushIssue(issues, col.key, `${col.label} es obligatorio`);
      }
    });

    if (type === "usuarios") {
      const cedula = row.CEDULA?.trim() ?? "";
      if (cedula && !CEDULA_REGEX.test(cedula)) {
        pushIssue(issues, "CEDULA", "Cédula inválida: deben ser 10 dígitos");
      }

      const cargo = row.CARGO?.trim() ?? "";
      if (cargo && !isValidRole(cargo)) {
        pushIssue(issues, "CARGO", "Cargo no encontrado en el sistema");
      }

      const disciplina = row.DISCIPLINA?.trim() ?? "";
      if (disciplina && disciplines.length > 0 && !isValidDiscipline(disciplina, disciplines)) {
        const invalidDisciplines = getInvalidDisciplines(disciplina, disciplines);
        const detail =
          invalidDisciplines.length > 0
            ? invalidDisciplines.map((item) => `"${item}"`).join(", ")
            : `"${disciplina}"`;
        pushIssue(
          issues,
          "DISCIPLINA",
          `Disciplina no encontrada: ${detail}`,
        );
      }

      const correo = row.CORREO?.trim() ?? "";
      if (correo && !EMAIL_REGEX.test(correo)) {
        pushIssue(issues, "CORREO", "Correo inválido");
      }

      const telefono = row.TELEFONO?.trim() ?? "";
      if (telefono && !PHONE_REGEX.test(telefono.replace(/\s+/g, ""))) {
        pushIssue(issues, "TELEFONO", "Teléfono inválido");
      }
    }

    if (type === "eventos") {
      const deporte = row.Deporte?.trim() ?? "";
      if (deporte && disciplines.length > 0 && !isValidDiscipline(deporte, disciplines)) {
        pushIssue(issues, "Deporte", "Disciplina inválida");
      }

      validateNumericField(issues, row, "Mes", "Mes", {
        required: true,
        integer: true,
        min: 1,
        max: 12,
      });
      validateNumericField(issues, row, "Entrenadores", "Entrenadores", {
        integer: true,
        min: 0,
      });
      validateNumericField(issues, row, "Atletas", "Atletas", {
        integer: true,
        min: 0,
      });

      columns
        .filter((col) => col.itemDescription)
        .forEach((col) => {
          const value = row[col.key]?.trim() ?? "";
          if (!value) return;
          const num = Number(value);
          if (Number.isNaN(num)) {
            pushIssue(issues, col.key, "Presupuesto debe ser numérico");
            return;
          }
          if (num < 0) {
            pushIssue(issues, col.key, "Presupuesto no puede ser negativo");
          }
        });
    }

    if (Object.keys(issues).length > 0) {
      issuesByRow[rowIndex] = issues;
    }
  });

  return issuesByRow;
}
