"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  lastPage: number;
};

/**
 * Extrae paginación de cualquier forma de respuesta del backend:
 * - res.pagination.current_page / per_page / last_page / total  (Soffimedh / Events API)
 * - res.pagination.page / limit / lastPage / total              (Users API)
 * - res.meta.page / limit / total                              (estándar propio)
 */
export function extractPagination(
  res: unknown,
  fallbackPage: number,
  fallbackLimit: number
): PaginationMeta {
  const r = res as Record<string, unknown>;
  const meta = (r?.meta ?? {}) as Record<string, unknown>;
  const pg = (r?.pagination ?? {}) as Record<string, unknown>;

  const rawPage =
    (pg.current_page as number | undefined) ??
    (pg.page as number | undefined) ??
    (meta.page as number | undefined);

  const rawLimit =
    (pg.per_page as number | undefined) ??
    (pg.limit as number | undefined) ??
    (meta.limit as number | undefined);

  const rawTotal =
    (pg.total as number | undefined) ??
    (meta.total as number | undefined);

  const rawLastPage =
    (pg.last_page as number | undefined) ??
    (pg.lastPage as number | undefined);

  const page =
    typeof rawPage === "number" && rawPage > 0 ? rawPage : fallbackPage;
  const limit =
    typeof rawLimit === "number" && rawLimit > 0 ? rawLimit : fallbackLimit;
  const total =
    typeof rawTotal === "number" && rawTotal >= 0 ? rawTotal : 0;
  const lastPage =
    typeof rawLastPage === "number" && rawLastPage > 0
      ? rawLastPage
      : Math.max(1, Math.ceil(total / limit));

  return { page, limit, total, lastPage };
}

type UseResourceListOptions<TData> = {
  queryKey: unknown[];
  queryFn: (signal?: AbortSignal) => Promise<unknown>;
  page: number;
  limit?: number;
  enabled?: boolean;
  /** Extractor personalizado cuando `res.data` no es el array directamente. */
  select?: (res: unknown) => TData[];
};

export type UseResourceListResult<TData> = {
  items: TData[];
  loading: boolean;
  error: string | null;
  pagination: PaginationMeta;
  totalPages: number;
  currentPage: number;
  refetch: () => void;
};

export function useResourceList<TData>({
  queryKey,
  queryFn,
  page,
  limit = DEFAULT_PAGE_SIZE,
  enabled = true,
  select,
}: UseResourceListOptions<TData>): UseResourceListResult<TData> {
  const {
    data: res,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: ({ signal }) => queryFn(signal),
    enabled,
    placeholderData: (prev: unknown) => prev,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const pagination = useMemo(
    () => extractPagination(res, page, limit),
    [res, page, limit]
  );

  const totalPages = Math.max(1, pagination.lastPage);
  const currentPage = Math.min(page, totalPages);

  const items = useMemo<TData[]>(() => {
    if (!res) return [];
    if (select) return select(res);
    const r = res as Record<string, unknown>;
    return (Array.isArray(r?.data) ? r.data : []) as TData[];
  }, [res, select]);

  return {
    items,
    loading: isFetching,
    error: error ? ((error as Error).message ?? "Error desconocido") : null,
    pagination,
    totalPages,
    currentPage,
    refetch,
  };
}
