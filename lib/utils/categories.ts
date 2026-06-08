import type { CatalogItem } from "@/types/catalog";

export const APP_CATEGORIES = [
  "PERSONAS_CON_DISCAPACIDAD",
  "MENORES",
  "JUVENIL",
  "SENIOR",
  "ESCUELAS_INICIACION",
  "TODOS",
  "FORMACION",
  "PREJUVENIL",
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
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

const categoryOrder = new Map(
  APP_CATEGORIES.map((name, index) => [normalizeCategoryValue(name), index])
);

const categoryLabels = new Map<AppCategory, string>([
  ["PERSONAS_CON_DISCAPACIDAD", "Personas con discapacidad"],
  ["MENORES", "Menores"],
  ["JUVENIL", "Juvenil"],
  ["SENIOR", "Senior"],
  ["ESCUELAS_INICIACION", "Escuelas de iniciación"],
  ["TODOS", "Todos"],
  ["FORMACION", "Formación"],
  ["PREJUVENIL", "Prejuvenil"],
  ["TODAS", "Todas"],
]);

const categoryAliases = new Map<string, AppCategory>([
  ["PERSONAS_CON_DISCAPACIDAD", "PERSONAS_CON_DISCAPACIDAD"],
  ["MENORES", "MENORES"],
  ["JUVENIL", "JUVENIL"],
  ["SENIOR", "SENIOR"],
  ["PRE_JUVENIL", "PREJUVENIL"],
  ["ESCUELAS_DE_INICIACION", "ESCUELAS_INICIACION"],
  ["ESCUELAS_INICIACION", "ESCUELAS_INICIACION"],
  ["TODOS", "TODOS"],
  ["FORMACION", "FORMACION"],
  ["PREJUVENIL", "PREJUVENIL"],
  ["TODAS", "TODAS"],
]);

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
