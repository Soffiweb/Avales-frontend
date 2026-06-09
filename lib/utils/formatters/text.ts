const GENERO_MAP: Record<string, string> = {
  M: "Masculino",
  MASCULINO: "Masculino",
  F: "Femenino",
  FEMENINO: "Femenino",
  O: "Otro",
  OTRO: "Otro",
  MASCULINO_FEMENINO: "Ambos",
};

export function formatGenero(genero?: string | null): string {
  if (!genero) return "-";
  return GENERO_MAP[genero.toUpperCase()] ?? genero;
}

export function formatBoolean(
  value?: boolean | null,
  labels: { true: string; false: string } = { true: "Sí", false: "No" },
): string {
  if (value === null || value === undefined) return "-";
  return value ? labels.true : labels.false;
}

export function formatEnum<T extends string>(
  value: T | null | undefined,
  map: Record<T, string>,
): string {
  if (!value) return "-";
  return map[value] ?? value;
}

export function formatEnumLabel(
  value?: string | null,
  separator = " ",
  fallback = "-",
): string {
  if (!value) return fallback;
  return value.replaceAll("_", separator);
}

export function formatRole(role?: string | null): string {
  if (!role) return "-";
  const key = role
    .trim()
    .replaceAll("-", "_")
    .replaceAll(" ", "_")
    .toUpperCase();

  const map: Record<string, string> = {
    SUPER_ADMIN: "Administrador",
    SUPERADMIN: "Administrador",
    ADMIN: "Administrador",
    ADMINISTRADOR: "Administrador",
    SECRETARIA: "Secretaría",
    SECRETARIA_DTM: "Secretaría del DTM",
    DTM: "Director técnico metodológico",
    METODOLOGO: "Metodólogo",
    ENTRENADOR: "Entrenador",
    USUARIO: "Usuario",
    DEPORTISTA: "Deportista",
    PDA: "PDA",
    CONTROL_PREVIO: "Control previo",
    COMPRAS_PUBLICAS: "Compras públicas",
    FINANCIERO: "Financiero",
  };
  if (map[key]) return map[key];

  return key
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatRoles(
  roles?:
    | Array<string | { codigo?: string | null; nombre?: string | null }>
    | null,
): string {
  if (!roles || roles.length === 0) return "-";
  return roles
    .map((role) => {
      if (typeof role === "string") return formatRole(role);
      const code = role?.codigo?.trim();
      if (code) return formatRole(code);
      const name = role?.nombre?.trim();
      return name || "-";
    })
    .join(", ");
}

export function truncate(text?: string | null, maxLength = 50): string {
  if (!text) return "-";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}
