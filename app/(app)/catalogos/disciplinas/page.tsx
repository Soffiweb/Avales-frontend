"use client";

import { useCallback, useEffect, useState } from "react";

import CatalogCrudView from "../_components/catalog-crud-view";
import {
  createDisciplina,
  deleteDisciplina,
  getDisciplinas,
  getPronosticoPlantillas,
  updateDisciplina,
} from "@/lib/api/disciplinas";
import type { CatalogItem, PronosticoPlantilla } from "@/types/catalog";

export default function DisciplinasPage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [plantillas, setPlantillas] = useState<PronosticoPlantilla[]>([]);
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

  // Las plantillas cambian muy poco: se cargan una vez para llenar el select.
  const fetchPlantillas = useCallback(async () => {
    try {
      const res = await getPronosticoPlantillas();
      setPlantillas(res.data ?? []);
    } catch {
      setPlantillas([]);
    }
  }, []);

  useEffect(() => {
    void fetchDisciplinas();
    void fetchPlantillas();
  }, [fetchDisciplinas, fetchPlantillas]);

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
        await createDisciplina({
          nombre: payload.nombre,
          codigo: payload.codigo,
          pronosticoPlantillaId: payload.selectValue ?? null,
        });
      }}
      onUpdate={async (id, payload) => {
        await updateDisciplina(id, {
          nombre: payload.nombre,
          codigo: payload.codigo,
          pronosticoPlantillaId: payload.selectValue ?? null,
        });
      }}
      onDelete={async (id) => {
        await deleteDisciplina(id);
      }}
      singularTitle="Disciplina"
      selectField={{
        label: "Plantilla de pronostico",
        emptyLabel: "Sin plantilla asignada",
        helpText:
          "Define el formato del excel de pronostico. Sin plantilla no se pueden crear avales de esta disciplina.",
        options: plantillas.map((plantilla) => ({
          value: plantilla.id,
          label: plantilla.nombre,
        })),
        valueOf: (item) => item.pronosticoPlantilla?.id ?? null,
        labelOf: (item) => item.pronosticoPlantilla?.nombre ?? null,
        missingLabel: "Sin plantilla de pronostico",
      }}
    />
  );
}
