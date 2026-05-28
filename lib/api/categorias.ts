import { apiFetch } from "@/lib/api/client";
import {
  normalizeCategoryCatalogItems,
  sortCategoriesByPreferredOrder,
} from "@/lib/utils/categories";
import type { CatalogItem } from "@/types/catalog";

export type CatalogPayload = {
  nombre: string;
  codigo?: string | null;
};

export function getCategorias() {
  return apiFetch<CatalogItem[]>("/catalog/categorias").then((response) => ({
    ...response,
    data: sortCategoriesByPreferredOrder(
      normalizeCategoryCatalogItems(response.data ?? [])
    ),
  }));
}

export function createCategoria(payload: CatalogPayload) {
  return apiFetch<CatalogItem>("/catalog/categorias", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateCategoria(id: number, payload: CatalogPayload) {
  return apiFetch<CatalogItem>(`/catalog/categorias/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteCategoria(id: number) {
  return apiFetch<null>(`/catalog/categorias/${id}`, {
    method: "DELETE",
  });
}
