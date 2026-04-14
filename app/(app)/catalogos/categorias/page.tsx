"use client";

import { useCallback, useEffect, useState } from "react";

import CatalogCrudView from "../_components/catalog-crud-view";
import {
  createCategoria,
  deleteCategoria,
  getCategorias,
  updateCategoria,
} from "@/lib/api/categorias";
import type { CatalogItem } from "@/types/catalog";

export default function CategoriasPage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategorias = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getCategorias();
      setItems(res.data ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las categorías.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCategorias();
  }, [fetchCategorias]);

  return (
    <CatalogCrudView
      title="Categorías"
      description="Listado de categorías obtenidas desde el backend."
      items={items}
      loading={loading}
      error={error}
      emptyMessage="No hay categorías registradas."
      onReload={fetchCategorias}
      onCreate={async (payload) => {
        await createCategoria(payload);
      }}
      onUpdate={async (id, payload) => {
        await updateCategoria(id, payload);
      }}
      onDelete={async (id) => {
        await deleteCategoria(id);
      }}
      singularTitle="Categoría"
    />
  );
}
