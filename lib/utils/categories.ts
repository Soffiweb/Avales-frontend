import type { CatalogItem } from "@/types/catalog";

export const APP_CATEGORIES = [
  "FORMACIÓN",
  "MENORES",
  "PREJUVENIL",
  "JUVENIL",
  "SENIOR",
  "PERSONAS CON DISCAPACIDAD",
  "ESCUELAS DE INICIACIÓN",
  "TODAS",
] as const;

export type AppCategory = (typeof APP_CATEGORIES)[number];

export type CategoryOption = {
  value: AppCategory;
  label: string;
};

export function normalizeCategoryValue(value?: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

const categoryOrder = new Map(
  APP_CATEGORIES.map((name, index) => [normalizeCategoryValue(name), index])
);

const categoryLabels = new Map<AppCategory, string>([
  ["FORMACIÓN", "Formación"],
  ["MENORES", "Menores"],
  ["PREJUVENIL", "Prejuvenil"],
  ["JUVENIL", "Juvenil"],
  ["SENIOR", "Senior"],
  ["PERSONAS CON DISCAPACIDAD", "Personas con discapacidad"],
  ["ESCUELAS DE INICIACIÓN", "Escuelas de iniciación"],
  ["TODAS", "Todas"],
]);

export function isValidAppCategory(value?: string | null) {
  return categoryOrder.has(normalizeCategoryValue(value));
}

export function getCanonicalCategory(value?: string | null) {
  const normalized = normalizeCategoryValue(value);
  return APP_CATEGORIES.find(
    (category) => normalizeCategoryValue(category) === normalized
  );
}

export function formatCategoryLabel(value?: string | null, fallback = "-") {
  const canonical = getCanonicalCategory(value);
  if (!canonical) return value?.trim() || fallback;
  return categoryLabels.get(canonical) ?? canonical;
}

export function getCategoryOptions(): CategoryOption[] {
  return APP_CATEGORIES.map((category) => ({
    value: category,
    label: formatCategoryLabel(category, category),
  }));
}

export function getCategoryCodeValue(value?: string | null) {
  return getCanonicalCategory(value) ?? "";
}

export function getCategoryByCatalogValue(
  items: CatalogItem[],
  value?: string | number | null
) {
  const normalized = normalizeCategoryValue(
    value === undefined || value === null ? "" : String(value)
  );

  return items.find((item) => {
    const code = normalizeCategoryValue(item.codigo);
    const name = normalizeCategoryValue(item.nombre);
    return (
      code === normalized ||
      name === normalized ||
      String(item.id) === String(value ?? "")
    );
  });
}

export function getCategoryIdOptions(items: CatalogItem[]): CatalogItem[] {
  return APP_CATEGORIES.reduce<CatalogItem[]>((acc, category) => {
    const item = getCategoryByCatalogValue(items, category);
    if (!item) return acc;
    acc.push({
      id: item.id,
      codigo: item.codigo,
      nombre: formatCategoryLabel(category, category),
    });
    return acc;
  }, []);
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
