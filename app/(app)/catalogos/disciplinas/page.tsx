"use client";

import { useCallback, useEffect, useState } from "react";

import CatalogCrudView from "../_components/catalog-crud-view";
import {
  createDisciplina,
  deleteDisciplina,
  getDisciplinas,
  updateDisciplina,
} from "@/lib/api/disciplinas";
import type { CatalogItem } from "@/types/catalog";

export default function DisciplinasPage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDisciplinas = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getDisciplinas();
      setItems(res.data ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las disciplinas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDisciplinas();
  }, [fetchDisciplinas]);

  return (
    <CatalogCrudView
      title="Disciplinas"
      description="Listado de disciplinas obtenidas desde el backend."
      items={items}
      loading={loading}
      error={error}
      emptyMessage="No hay disciplinas registradas."
      onReload={fetchDisciplinas}
      onCreate={async (payload) => {
        await createDisciplina(payload);
      }}
      onUpdate={async (id, payload) => {
        await updateDisciplina(id, payload);
      }}
      onDelete={async (id) => {
        await deleteDisciplina(id);
      }}
      singularTitle="Disciplina"
    />
  );
}
