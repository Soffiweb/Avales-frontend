import type { CatalogItem } from "@/types/catalog";
import {
  EVENTO_CATEGORIA_ALIASES,
  EVENTO_CATEGORIA_LABELS,
  EVENTO_CATEGORIA_VALUES,
} from "@/lib/domain/evento-options";

export const APP_CATEGORIES = EVENTO_CATEGORIA_VALUES;

export type AppCategory = (typeof APP_CATEGORIES)[number];

export function normalizeCategoryValue(value?: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

const categoryOrder = new Map(
  APP_CATEGORIES.map((name, index) => [normalizeCategoryValue(name), index])
);

const categoryLabels = new Map<AppCategory, string>(
  Object.entries(EVENTO_CATEGORIA_LABELS) as Array<[AppCategory, string]>,
);

const categoryAliases = new Map<string, AppCategory>(
  Object.entries(EVENTO_CATEGORIA_ALIASES) as Array<[string, AppCategory]>,
);

export function isValidAppCategory(value?: string | null) {
  return Boolean(getCanonicalCategory(value));
}

export function getCanonicalCategory(value?: string | null) {
  const normalized = normalizeCategoryValue(value);
  return categoryAliases.get(normalized);
}

export function formatCategoryLabel(value?: string | null, fallback = "-") {
  const canonical = getCanonicalCategory(value);
  if (!canonical) return value?.trim() || fallback;
  return categoryLabels.get(canonical) ?? canonical;
}

export function getCategoryByCatalogValue(
  items: CatalogItem[],
  value?: string | number | null
) {
  const normalizedInput = normalizeCategoryValue(
    value === undefined || value === null ? "" : String(value)
  );
  const canonicalInput = categoryAliases.get(normalizedInput) ?? normalizedInput;

  return items.find((item) => {
    const code = categoryAliases.get(normalizeCategoryValue(item.codigo)) ??
      normalizeCategoryValue(item.codigo);
    const name = categoryAliases.get(normalizeCategoryValue(item.nombre)) ??
      normalizeCategoryValue(item.nombre);
    return (
      code === canonicalInput ||
      name === canonicalInput ||
      String(item.id) === String(value ?? "")
    );
  });
}

export function getCategoryIdOptions(items: CatalogItem[]): CatalogItem[] {
  // Se incluyen TODAS las categorías del catálogo (no solo las conocidas), para
  // que una categoría nueva creada en el backend aparezca en los selects sin
  // tocar código. El `nombre` ya viene normalizado desde `getCatalog`.
  return items.map((item) => ({
    id: item.id,
    codigo: item.codigo,
    nombre: formatCategoryLabel(item.nombre, item.nombre),
  }));
}

export function normalizeCategoryCatalogItems<T extends Pick<CatalogItem, "nombre">>(
  items: T[]
) {
  return items.map((item) => ({
    ...item,
    nombre: formatCategoryLabel(item.nombre, item.nombre),
  }));
}

export function sortCategoriesByPreferredOrder<T extends Pick<CatalogItem, "nombre">>(
  items: T[]
) {
  return [...items].sort((a, b) => {
    const aOrder = categoryOrder.get(normalizeCategoryValue(a.nombre));
    const bOrder = categoryOrder.get(normalizeCategoryValue(b.nombre));

    if (aOrder != null && bOrder != null) return aOrder - bOrder;
    if (aOrder != null) return -1;
    if (bOrder != null) return 1;

    return a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" });
  });
}
