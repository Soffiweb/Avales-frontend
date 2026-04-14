import { apiFetch } from "@/lib/api/client";
import type { CatalogItem } from "@/types/catalog";

export type CatalogPayload = {
  nombre: string;
  codigo?: string | null;
};

export function getDisciplinas() {
  return apiFetch<CatalogItem[]>("/catalog/disciplinas");
}

export function createDisciplina(payload: CatalogPayload) {
  return apiFetch<CatalogItem>("/catalog/disciplinas", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateDisciplina(id: number, payload: CatalogPayload) {
  return apiFetch<CatalogItem>(`/catalog/disciplinas/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteDisciplina(id: number) {
  return apiFetch<null>(`/catalog/disciplinas/${id}`, {
    method: "DELETE",
  });
}
