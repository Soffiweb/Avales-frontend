"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type StringFilters = Record<string, string>;

export type UseUrlFiltersResult<T extends StringFilters> = {
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
export function useUrlFilters<T extends StringFilters>(
  pathname: string,
  defaults: T
): UseUrlFiltersResult<T> {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mounted = useRef(false);

  const [filters, setFilters] = useState<T>(() => {
    const result = { ...defaults } as T;
    for (const key of Object.keys(defaults)) {
      const val = searchParams.get(key);
      if (val !== null) (result as StringFilters)[key] = val;
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
      const v = value.trim();
      if (v) params.set(key, v);
    }
    if (page > 1) params.set("page", String(page));

    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [filters, page, pathname, router]);

  return { filters, page, setFilter, setPage };
}
