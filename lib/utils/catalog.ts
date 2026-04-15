import type { CatalogItem } from "@/types/catalog";

export function getCatalogItemLabel(
  item?: Pick<CatalogItem, "nombre" | "codigo"> | null,
  fallback = "-"
) {
  return item?.nombre?.trim() || item?.codigo?.trim() || fallback;
}

export function getCatalogItemCode(
  item?: Pick<CatalogItem, "id" | "codigo"> | null
) {
  return item?.codigo?.trim() || (item?.id != null ? String(item.id) : "");
}

export function getCatalogItemId(
  item?: Pick<CatalogItem, "id"> | null
) {
  return item?.id;
}

export function resolveCatalogItemCode(
  item?: number | Pick<CatalogItem, "id" | "codigo"> | null
) {
  if (typeof item === "number") {
    return String(item);
  }

  return getCatalogItemCode(item);
}

export function resolveCatalogItemCodeFromList(
  items: Array<Pick<CatalogItem, "id" | "codigo">>,
  value?: string | number | null
) {
  if (value === undefined || value === null) return "";

  const normalized = String(value).trim();
  if (!normalized) return "";

  const match = items.find(
    (item) =>
      item.codigo?.trim() === normalized || String(item.id) === normalized
  );

  return match ? getCatalogItemCode(match) : normalized;
}

export function resolveCatalogItemIdFromList(
  items: Array<Pick<CatalogItem, "id" | "codigo">>,
  value?: string | number | null
) {
  if (value === undefined || value === null) return undefined;

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const normalized = String(value).trim();
  if (!normalized) return undefined;

  const match = items.find(
    (item) =>
      String(item.id) === normalized || item.codigo?.trim() === normalized
  );

  if (match) return match.id;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function getCatalogItemCodeSet(
  items: Array<Pick<CatalogItem, "id" | "codigo"> | number | null | undefined>
) {
  return new Set(
    items
      .map((item) => {
        if (typeof item === "number") return String(item);
        if (!item) return "";
        return getCatalogItemCode(item);
      })
      .filter(Boolean)
  );
}

export function getCatalogItemIdSet(
  items: Array<Pick<CatalogItem, "id"> | number | null | undefined>
) {
  return new Set(
    items
      .map((item) => {
        if (typeof item === "number") return item;
        if (!item) return undefined;
        return item.id;
      })
      .filter((value): value is number => typeof value === "number")
  );
}
