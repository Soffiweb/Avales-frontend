import { apiFetch } from "@/lib/api/client";
import {
  normalizeCategoryCatalogItems,
  sortCategoriesByPreferredOrder,
} from "@/lib/utils/categories";
import type { CatalogItem, CatalogItemPresupuestario } from "@/types/catalog";

export function getCatalog() {
  return apiFetch<{ categorias: CatalogItem[]; disciplinas: CatalogItem[] }>("/catalog").then(
    (response) => ({
      ...response,
      data: {
        ...response.data,
        categorias: sortCategoriesByPreferredOrder(
          normalizeCategoryCatalogItems(response.data?.categorias ?? [])
        ),
      },
    })
  );
}

export function getDisciplinas() {
  return apiFetch<CatalogItem[]>("/catalog/disciplinas");
}

export function getItemsPresupuestarios(actividadId?: number) {
  const qs = actividadId ? `?actividadId=${actividadId}` : "";
  return apiFetch<CatalogItemPresupuestario[]>(`/catalog/items${qs}`);
}
