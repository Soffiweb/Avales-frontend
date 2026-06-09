"use client";

import { useEffect, useRef, useState } from "react";
import { X, Search } from "lucide-react";
import type { Evento } from "@/types/evento";
import { listEventos } from "@/lib/api/eventos";
import type { FuentePresupuestoReforma } from "@/types/reforma-multi";
import { formatCurrencyFromString } from "@/lib/utils/formatters";

export type SelectedEvento = {
  eventoId: number;
  nombre: string;
  codigo: string;
  monto: number;
  totalDisponible: number;
};

type Props = {
  label: string;
  fuente: FuentePresupuestoReforma | "";
  selected: SelectedEvento[];
  onChange: (updated: SelectedEvento[]) => void;
  excludeIds?: number[];
};

export default function MultiEventSelector({
  label,
  fuente,
  selected,
  onChange,
  excludeIds = [],
}: Props) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [results, setResults] = useState<Evento[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const montoErrors = useRef<Record<number, string>>({});

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch events when search or fuente changes
  useEffect(() => {
    if (!fuente) {
      setResults([]);
      return;
    }

    let cancelled = false;

    async function fetchEvents() {
      setLoadingSearch(true);
      try {
        const res = await listEventos({
          search: debouncedSearch || undefined,
          limit: 20,
        });
        if (!cancelled) {
          const eventos = (res.data ?? []).filter((e) => {
            if (excludeIds.includes(e.id)) return false;
            if (selected.some((s) => s.eventoId === e.id)) return false;
            // Filter by fuente: event must have items with matching fuente
            if (fuente) {
              const hasMatchingFuente = e.eventoItems?.some(
                (item) => item.fuente === fuente,
              );
              if (e.eventoItems && e.eventoItems.length > 0 && !hasMatchingFuente) {
                return false;
              }
            }
            return true;
          });
          setResults(eventos);
        }
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoadingSearch(false);
      }
    }

    void fetchEvents();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, fuente]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function getTotalDisponible(evento: Evento): number {
    if (!evento.eventoItems) return 0;
    return evento.eventoItems
      .filter((item) => !fuente || item.fuente === fuente)
      .reduce((sum, item) => {
        const presupuesto = parseFloat(item.presupuesto) || 0;
        const comprometido = parseFloat(item.montoComprometido) || 0;
        const ejecutado = parseFloat(item.montoEjecutado) || 0;
        return sum + presupuesto - comprometido - ejecutado;
      }, 0);
  }

  function handleSelect(evento: Evento) {
    const totalDisponible = getTotalDisponible(evento);
    onChange([
      ...selected,
      {
        eventoId: evento.id,
        nombre: evento.nombre,
        codigo: evento.codigo,
        monto: 0,
        totalDisponible,
      },
    ]);
    setSearch("");
    setOpen(false);
  }

  function handleRemove(eventoId: number) {
    onChange(selected.filter((s) => s.eventoId !== eventoId));
    const next = { ...montoErrors.current };
    delete next[eventoId];
    montoErrors.current = next;
  }

  function handleMontoChange(eventoId: number, rawValue: string) {
    const parsed = parseFloat(rawValue);
    const monto = Number.isNaN(parsed) ? 0 : parsed;

    const item = selected.find((s) => s.eventoId === eventoId);
    if (item && monto > item.totalDisponible) {
      montoErrors.current = {
        ...montoErrors.current,
        [eventoId]: `Supera el disponible (${formatCurrencyFromString(String(item.totalDisponible))})`,
      };
    } else {
      const next = { ...montoErrors.current };
      delete next[eventoId];
      montoErrors.current = next;
    }

    onChange(
      selected.map((s) =>
        s.eventoId === eventoId ? { ...s, monto } : s,
      ),
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</p>

      {/* Search dropdown */}
      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            className="form-input w-full pl-9 pr-4"
            placeholder={fuente ? "Buscar evento por nombre o código..." : "Selecciona una fuente primero"}
            value={search}
            disabled={!fuente}
            onChange={(e) => {
              setSearch(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
          />
        </div>

        {open && fuente && (
          <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
            {loadingSearch ? (
              <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                Buscando...
              </div>
            ) : results.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                No se encontraron eventos disponibles.
              </div>
            ) : (
              <ul className="max-h-48 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                {results.map((evento) => (
                  <li key={evento.id}>
                    <button
                      type="button"
                      className="w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      onClick={() => handleSelect(evento)}
                    >
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {evento.nombre}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {evento.codigo}
                        {evento.disciplina ? ` · ${evento.disciplina.nombre}` : ""}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Selected chips with monto inputs */}
      {selected.length > 0 && (
        <ul className="space-y-2">
          {selected.map((item) => {
            const err = montoErrors.current[item.eventoId];
            return (
              <li
                key={item.eventoId}
                className="flex flex-col gap-1.5 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                      {item.nombre}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {item.codigo}
                      {item.totalDisponible > 0
                        ? ` · Disponible: ${formatCurrencyFromString(String(item.totalDisponible))}`
                        : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(item.eventoId)}
                    className="flex-shrink-0 rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                    aria-label={`Quitar ${item.nombre}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                    Monto (USD)
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={item.monto === 0 ? "" : item.monto}
                    onChange={(e) =>
                      handleMontoChange(item.eventoId, e.target.value)
                    }
                    className={`form-input w-full text-sm ${err ? "border-rose-400 dark:border-rose-500" : ""}`}
                    placeholder="0.00"
                  />
                  {err ? (
                    <p className="mt-1 text-xs text-rose-500">{err}</p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {selected.length === 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Ningún evento seleccionado.
        </p>
      )}
    </div>
  );
}
