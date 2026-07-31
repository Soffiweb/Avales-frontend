"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { getCatalog } from "@/lib/api/catalog";
import { listRoles } from "@/lib/api/roles";
import {
  getPronosticoProfile,
  type PronosticoProfile,
} from "@/lib/utils/aval-pronostico";
import type { CatalogItem } from "@/types/catalog";
import type { Evento } from "@/types/evento";
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
    // Se compara contra `null` a propósito: el backend manda `null` cuando la
    // disciplina no tiene plantilla, y omite el campo si aún no soporta la
    // funcionalidad. Con `!plantilla` un backend viejo dejaría todas las
    // disciplinas como "sin plantilla" y bloquearía la creación de avales.
    sinPlantilla: disciplina?.pronosticoPlantilla === null,
  };
}

type EventoPronostico = Pick<Evento, "disciplina" | "disciplinaCodigo">;

/**
 * Perfil de pronóstico del evento (qué campos se piden por deportista),
 * resuelto con la plantilla que el catálogo trae para la disciplina. El nombre
 * de la disciplina no alcanza: la plantilla se configura desde catálogos, así
 * que una disciplina nueva (ej. "Voleibol Playa") solo muestra sus campos si
 * se lee del catálogo.
 */
export function usePronosticoProfile(
  evento?: EventoPronostico | null,
): PronosticoProfile | null {
  const { disciplinas } = useCatalog();
  const disciplinaId = evento?.disciplina?.id;
  const disciplinaNombre = evento?.disciplina?.nombre;
  const disciplinaCodigo = evento?.disciplinaCodigo ?? evento?.disciplina?.codigo;

  const plantilla = disciplinaId
    ? disciplinas.find((item) => item.id === disciplinaId)?.pronosticoPlantilla
    : undefined;
  // `undefined` (disciplina no encontrada o backend sin el campo) deja que el
  // perfil caiga al mapa por código; `null` es "sin plantilla configurada".
  const motor = plantilla ? plantilla.motor : plantilla;

  // El objeto `evento` cambia de identidad en cada render de los pasos del
  // aval, así que el memo se apoya en los datos de la disciplina.
  return useMemo(
    () =>
      getPronosticoProfile(
        {
          disciplina: disciplinaId
            ? { id: disciplinaId, nombre: disciplinaNombre ?? "" }
            : null,
          disciplinaCodigo,
        },
        motor,
      ),
    [disciplinaId, disciplinaNombre, disciplinaCodigo, motor],
  );
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
