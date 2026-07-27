"use client";

import { useQuery } from "@tanstack/react-query";

import { getCatalog } from "@/lib/api/catalog";
import { listRoles } from "@/lib/api/roles";
import type { CatalogItem } from "@/types/catalog";
import type { Role } from "@/types/role";

/** Los catálogos cambian con muy poca frecuencia: cache más largo que el default. */
const CATALOG_STALE_TIME = 5 * 60_000;

/**
 * Catálogos de categorías y disciplinas traídos del backend (`/catalog`).
 * Cacheado y compartido por react-query (queryKey `["catalog"]`).
 */
export function useCatalog() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["catalog"],
    queryFn: () => getCatalog(),
    staleTime: CATALOG_STALE_TIME,
  });

  return {
    categorias: (data?.data?.categorias ?? []) as CatalogItem[],
    disciplinas: (data?.data?.disciplinas ?? []) as CatalogItem[],
    isLoading,
    error,
  };
}

/**
 * Estado de la plantilla de pronóstico de una disciplina. El backend rechaza
 * la creación del aval cuando la disciplina no tiene plantilla configurada,
 * así que conviene avisarlo antes de que el usuario cargue los documentos.
 */
export function useDisciplinaPronosticoPlantilla(disciplinaId?: number | null) {
  const { disciplinas, isLoading } = useCatalog();

  const disciplina = disciplinaId
    ? disciplinas.find((item) => item.id === disciplinaId)
    : undefined;

  return {
    isLoading,
    disciplina,
    // Solo se afirma que falta cuando la disciplina vino en el catálogo: si
    // aún está cargando o el catálogo falló, no se bloquea el flujo.
    sinPlantilla: Boolean(disciplina && !disciplina.pronosticoPlantilla),
  };
}

/**
 * Catálogo de roles del sistema (`/roles`), con `id`, `codigo` y `nombre`.
 * Comparte queryKey `["roles"]` con la administración de roles, así que
 * renombrar un rol se refleja en todos los selects tras invalidar.
 */
export function useRoles() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["roles"],
    queryFn: () => listRoles(),
    staleTime: CATALOG_STALE_TIME,
  });

  return {
    roles: (data?.data ?? []) as Role[],
    isLoading,
    error,
  };
}
