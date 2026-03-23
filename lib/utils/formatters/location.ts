export function formatLocation(location?: {
  ciudad?: string | null;
  pais?: string | null;
}): string {
  if (!location) return "-";
  const parts = [location.ciudad, location.pais].filter(Boolean);
  return parts.length ? parts.join(", ") : "-";
}

export function formatLocationWithProvince(location?: {
  ciudad?: string | null;
  provincia?: string | null;
  pais?: string | null;
}): string {
  if (!location) return "-";
  const parts = [location.ciudad, location.provincia, location.pais].filter(
    Boolean,
  );
  return parts.length ? parts.join(", ") : "-";
}

export function formatFullLocation(location?: {
  lugar?: string | null;
  ciudad?: string | null;
  provincia?: string | null;
  pais?: string | null;
}): string {
  if (!location) return "-";
  const parts = [
    location.lugar,
    location.ciudad,
    location.provincia,
    location.pais,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "-";
}
