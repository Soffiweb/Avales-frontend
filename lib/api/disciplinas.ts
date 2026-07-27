import { apiFetch } from "@/lib/api/client";
import type { CatalogItem, PronosticoPlantilla } from "@/types/catalog";

export type CatalogPayload = {
  nombre: string;
  codigo?: string | null;
};

export type DisciplinaPayload = CatalogPayload & {
  /** `null` desasigna la plantilla; omitirlo la deja como esta. */
  pronosticoPlantillaId?: number | null;
};

export function getDisciplinas() {
  return apiFetch<CatalogItem[]>("/catalog/disciplinas");
}

/** Plantillas disponibles para asignar a una disciplina (solo admin). */
export function getPronosticoPlantillas() {
  return apiFetch<PronosticoPlantilla[]>("/catalog/pronostico-plantillas");
}

export function createDisciplina(payload: DisciplinaPayload) {
  return apiFetch<CatalogItem>("/catalog/disciplinas", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateDisciplina(id: number, payload: DisciplinaPayload) {
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
