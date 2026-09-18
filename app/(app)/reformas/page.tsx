"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";

import { useAuth } from "@/app/providers/auth-provider";
import AlertBanner from "@/components/ui/alert-banner";
import ReformaTable from "./_components/reforma-table";
import {
  listReforms,
  TIPO_REFORMA_OPTIONS,
  type ReformResponse,
  type TipoReforma,
} from "@/lib/api/reforms";
import { listEventos } from "@/lib/api/eventos";
import {
  canAccessReforms,
  canCreateReforma,
  getNormalizedRoles,
} from "@/lib/auth/access";
import { matchesSearchTerm } from "@/lib/utils/normalize-text";
import {
  getInvolvedEventoIds,
  getInvolvedEventoLabels,
} from "./_lib/summary";

export default function ReformasPage() {
  const { user, loading: authLoading } = useAuth();
  const [reforms, setReforms] = useState<ReformResponse[]>([]);
  const [disciplinaMap, setDisciplinaMap] = useState<Map<number, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [tipoFilter, setTipoFilter] = useState<TipoReforma | "">("");
  const [search, setSearch] = useState("");

  const userRoles = getNormalizedRoles(user);
  const isEntrenador = userRoles.includes("ENTRENADOR");
  const canViewReforms = canAccessReforms(user);
  const canCreate = canCreateReforma(user);

  useEffect(() => {
    if (authLoading) return;
    if (!canViewReforms) {
      setReforms([]);
      setLoading(false);
      setError("No tienes permisos para ver reformas.");
      return;
    }

    async function fetchReforms() {
      try {
        setLoading(true);
        setError(null);

        const [reformsResponse, eventosResponse] = await Promise.all([
          listReforms(tipoFilter ? { tipo: tipoFilter } : undefined),
          listEventos({ limit: 1000 }),
        ]);

        let filteredReforms = reformsResponse.data ?? [];
        const eventos = eventosResponse.data ?? [];

        const map = new Map<number, string>();
        for (const evento of eventos) {
          if (evento.disciplina?.nombre) {
            map.set(evento.id, evento.disciplina.nombre);
          }
        }
        setDisciplinaMap(map);

        if (isEntrenador) {
          const allowedEventoIds = new Set(eventos.map((evento) => evento.id));
          filteredReforms = filteredReforms.filter((reform) =>
            Array.from(getInvolvedEventoIds(reform)).some((eventoId) =>
              allowedEventoIds.has(eventoId),
            ),
          );
        }

        setReforms(filteredReforms);
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar las reformas.",
        );
      } finally {
        setLoading(false);
      }
    }

    void fetchReforms();
  }, [authLoading, canViewReforms, isEntrenador, tipoFilter]);

  const filteredReforms = useMemo(() => {
    return reforms.filter((reform) => {
      const matchesStatus = statusFilter
        ? reform.estado === statusFilter
        : true;
      const matchesSearch = matchesSearchTerm(search, [
        reform.motivo,
        ...getInvolvedEventoLabels(reform),
        String(reform.id),
      ]);
      return matchesStatus && matchesSearch;
    });
  }, [reforms, search, statusFilter]);

  if (authLoading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-7xl mx-auto">
        {/* Mismo esqueleto que mientras cargan las reformas: si acá se dibujara
            otra cosa, la pantalla cambiaría de forma dos veces antes de
            mostrar datos (auth → fetch → listado). */}
        <ReformaTable reformas={[]} disciplinaMap={disciplinaMap} loading />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-7xl mx-auto">
      {error ? (
        <div className="mb-6">
          <AlertBanner
            variant="error"
            message={error}
            onClose={() => setError(null)}
          />
        </div>
      ) : null}

      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Reformas
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Revisa las solicitudes de reforma registradas para los eventos.
              </p>
            </div>

            {canCreate ? (
              <Link
                href="/reformas/nueva"
                className="inline-flex items-center gap-2 self-start rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
              >
                <Plus className="h-4 w-4" />
                Nueva reforma
              </Link>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por evento, código o motivo"
                className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-9 pr-4 text-sm text-gray-900 outline-none transition focus:border-gray-900 sm:w-72 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-gray-300"
              />
            </label>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-gray-300"
            >
              <option value="">Todos los estados</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="APROBADA">Aprobada</option>
              <option value="RECHAZADA">Rechazada</option>
            </select>

            <select
              value={tipoFilter}
              onChange={(e) =>
                setTipoFilter((e.target.value as TipoReforma) || "")
              }
              className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-gray-300"
            >
              <option value="">Todos los tipos</option>
              {TIPO_REFORMA_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <ReformaTable
          reformas={filteredReforms}
          disciplinaMap={disciplinaMap}
          loading={loading}
        />
      </div>
    </div>
  );
}
