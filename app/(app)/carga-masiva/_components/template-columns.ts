export type UploadType = "usuarios" | "eventos";

export type ColumnDef = {
  key: string;
  label: string;
  required: boolean;
  itemDescription?: string;
};

export const USERS_COLUMNS: ColumnDef[] = [
  { key: "N°", label: "N°", required: false },
  { key: "CEDULA", label: "Cedula", required: true },
  { key: "APELLIDOS", label: "Apellidos", required: false },
  { key: "NOMBRES", label: "Nombres", required: false },
  { key: "CARGO", label: "Cargo", required: true },
  { key: "CATEGORIA", label: "Categoria", required: false },
  { key: "DISCIPLINA", label: "Disciplina", required: true },
  { key: "TELEFONO", label: "Telefono", required: false },
  { key: "CORREO", label: "Correo", required: false },
];

export const USERS_OPTIONAL_COLUMNS = ["CATEGORIA"] as const;

export const EVENTS_BASE_COLUMNS: ColumnDef[] = [
  { key: "Actividad", label: "Actividad", required: true },
  { key: "Tarea", label: "Tarea", required: false },
  { key: "Evento", label: "Evento", required: true },
  { key: "Provincia", label: "Provincia", required: false },
  { key: "País", label: "Pais", required: false },
  { key: "Deporte", label: "Deporte", required: false },
  { key: "Sector", label: "Sector", required: false },
  { key: "Tipo Participación", label: "Tipo Participacion", required: false },
  { key: "Alcance", label: "Alcance", required: false },
  { key: "Entrenadores", label: "Entrenadores", required: false },
  { key: "Atletas", label: "Atletas", required: false },
  { key: "Mes", label: "Mes", required: true },
];

export function getColumnsForType(type: UploadType): ColumnDef[] {
  return type === "usuarios" ? USERS_COLUMNS : EVENTS_BASE_COLUMNS;
}

export function getUploadLabel(type: UploadType): string {
  return type === "usuarios" ? "Usuarios" : "Eventos";
}

/**
 * Detect if a header value is a budget item code (numeric > 100000)
 */
export function isBudgetItemCode(value: string): boolean {
  const num = Number(value);
  return !isNaN(num) && num > 100000;
}
