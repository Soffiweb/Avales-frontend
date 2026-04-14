const GENERO_MAP: Record<string, string> = {
  M: "Masculino",
  MASCULINO: "Masculino",
  F: "Femenino",
  FEMENINO: "Femenino",
  O: "Otro",
  OTRO: "Otro",
  MASCULINO_FEMENINO: "Mixto",
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
  if (role === "SUPERADMIN") return "Super Admin";
  if (role === "ADMINISTRADOR") return "Administrador";
  return role
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatRoles(roles?: string[] | null): string {
  if (!roles || roles.length === 0) return "-";
  return roles.map(formatRole).join(", ");
}

export function truncate(text?: string | null, maxLength = 50): string {
  if (!text) return "-";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}
