"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type FilterValue = string | string[];
type FiltersShape = Record<string, FilterValue>;

export type UseUrlFiltersResult<T extends FiltersShape> = {
  filters: T;
  page: number;
  setFilter: <K extends keyof T>(key: K, value: T[K]) => void;
  setPage: (p: number) => void;
};

/**
 * Inicializa filtros desde URL params y los sincroniza de vuelta.
 * Claves del objeto `defaults` deben coincidir con los URL param names.
 * Resetea page a 1 automáticamente cuando cambia cualquier filtro.
 */
export function useUrlFilters<T extends FiltersShape>(
  pathname: string,
  defaults: T
): UseUrlFiltersResult<T> {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mounted = useRef(false);

  const [filters, setFilters] = useState<T>(() => {
    const result = { ...defaults } as T;
    for (const key of Object.keys(defaults) as Array<keyof T>) {
      const defaultValue = defaults[key];
      if (Array.isArray(defaultValue)) {
        result[key] = searchParams.getAll(String(key)) as T[keyof T];
        continue;
      }

      const val = searchParams.get(String(key));
      if (val !== null) result[key] = val as T[keyof T];
    }
    return result;
  });

  const [page, setPageState] = useState(() => {
    const v = Number(searchParams.get("page") ?? "1");
    return Number.isFinite(v) && v > 0 ? v : 1;
  });

  const setFilter = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPageState(1);
  }, []);

  const setPage = useCallback((p: number) => setPageState(p), []);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (Array.isArray(value)) {
        const items = value.map((item) => item.trim()).filter(Boolean);
        for (const item of items) {
          params.append(key, item);
        }
        continue;
      }

      const v = value.trim();
      if (v) params.set(key, v);
    }
    if (page > 1) params.set("page", String(page));

    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [filters, page, pathname, router]);

  return { filters, page, setFilter, setPage };
}
