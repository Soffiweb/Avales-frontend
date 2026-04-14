import { apiFetch } from "@/lib/api/client";
import type { CatalogItem } from "@/types/catalog";

export type CatalogPayload = {
  nombre: string;
  codigo?: string | null;
};

export function getCategorias() {
  return apiFetch<CatalogItem[]>("/catalog/categorias");
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
