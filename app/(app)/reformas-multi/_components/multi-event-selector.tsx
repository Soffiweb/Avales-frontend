"use client";

import { useEffect, useRef, useState } from "react";
import { X, Search, Plus } from "lucide-react";
import type { Evento, EventoItem } from "@/types/evento";
import type { CatalogItemPresupuestario } from "@/types/catalog";
import { listEventos } from "@/lib/api/eventos";
import { getItemsPresupuestarios } from "@/lib/api/catalog";
import type { FuentePresupuestoReforma } from "@/types/reforma-multi";
import { formatCurrency, formatCurrencyFromString } from "@/lib/utils/formatters";
import { MES_NOMBRES, MES_OPCIONES } from "@/lib/api/reforms-multi";

export type EventoLineItem = {
  itemId: number;
  itemNombre: string;
  mes: number;
  fuente: FuentePresupuestoReforma;
  monto: number;
  presupuesto: number;
  disponible: number;
};

export type SelectedEvento = {
  eventoId: number;
  nombre: string;
  codigo: string;
  items: EventoLineItem[];
};

type AddingItem = {
  itemId: number | "";
  mes: number | "";
};

type Props = {
  label: string;
  fuente: FuentePresupuestoReforma | "";
  selected: SelectedEvento[];
  onChange: (updated: SelectedEvento[]) => void;
  mode: "origen" | "destino";
  defaultMes?: number | "";
  highlightEventoIds?: number[];
  excludeEventoIds?: number[];
};

function getFuenteLabel(fuente: FuentePresupuestoReforma) {
  return fuente === "FONDOS_PUBLICOS" ? "Fondos Públicos" : "Autogestión";
}

function getItemDisponible(ei: EventoItem): number {
  const presupuesto = parseFloat(ei.presupuesto) || 0;
  const comprometido = parseFloat(ei.montoComprometido) || 0;
  const ejecutado = parseFloat(ei.montoEjecutado) || 0;
  return Math.max(0, presupuesto - comprometido - ejecutado);
}

export default function EventoItemsPanel({
  label,
  fuente,
  selected,
  onChange,
  mode,
  defaultMes,
  highlightEventoIds = [],
  excludeEventoIds = [],
}: Props) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [results, setResults] = useState<Evento[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef(selected);

  const [catalogItems, setCatalogItems] = useState<CatalogItemPresupuestario[]>([]);
  const [addingItem, setAddingItem] = useState<Record<number, AddingItem>>({});

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!fuente) { setResults([]); return; }
    let cancelled = false;

    async function fetchEvents() {
      setLoadingSearch(true);
      try {
        const res = await listEventos({
          search: debouncedSearch || undefined,
          limit: 20,
          sinAval: true,
        });
        if (!cancelled) {
          setResults(
            (res.data ?? []).filter(
              (e) =>
                !e.tieneReformaPendiente &&
                !selectedRef.current.some((s) => s.eventoId === e.id) &&
                !excludeEventoIds.includes(e.id),
            ),
          );
        }
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoadingSearch(false);
      }
    }

    void fetchEvents();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, excludeEventoIds, fuente]);

  useEffect(() => {
    getItemsPresupuestarios()
      .then((r) => setCatalogItems(r.data ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(evento: Evento) {
    const eventoItems = (evento.eventoItems ?? [])
      .filter((ei) => !fuente || ei.fuente === fuente)
      .map((ei): EventoLineItem => {
        const presupuesto = parseFloat(ei.presupuesto) || 0;
        const disponible = getItemDisponible(ei);
        return {
          itemId: ei.item.id,
          itemNombre: ei.item.nombre,
          mes: ei.mes,
          fuente: ei.fuente,
          monto: presupuesto,
          presupuesto,
          disponible,
        };
      });

    onChange([
      ...selected,
      { eventoId: evento.id, nombre: evento.nombre, codigo: evento.codigo, items: eventoItems },
    ]);
    setSearch("");
    setOpen(false);
  }

  function handleRemoveEvento(eventoId: number) {
    onChange(selected.filter((s) => s.eventoId !== eventoId));
    setAddingItem((prev) => {
      const next = { ...prev };
      delete next[eventoId];
      return next;
    });
  }

  function handleMontoChange(
    eventoId: number,
    itemId: number,
    mes: number,
    fuenteItem: FuentePresupuestoReforma,
    raw: string,
  ) {
    const parsed = parseFloat(raw);
    const monto = Number.isNaN(parsed) ? 0 : parsed;
    onChange(
      selected.map((s) =>
        s.eventoId !== eventoId
          ? s
          : {
              ...s,
              items: s.items.map((it) =>
                it.itemId === itemId && it.mes === mes && it.fuente === fuenteItem
                  ? { ...it, monto }
                  : it,
              ),
            },
      ),
    );
  }

  function handleRemoveItem(
    eventoId: number,
    itemId: number,
    mes: number,
    fuenteItem: FuentePresupuestoReforma,
  ) {
    onChange(
      selected.map((s) =>
        s.eventoId !== eventoId
          ? s
          : {
              ...s,
              items: s.items.filter(
                (it) =>
                  !(it.itemId === itemId && it.mes === mes && it.fuente === fuenteItem),
              ),
            },
      ),
    );
  }

  function handleOpenAdd(eventoId: number) {
    setAddingItem((prev) => ({
      ...prev,
      [eventoId]: { itemId: "", mes: typeof defaultMes === "number" ? defaultMes : "" },
    }));
  }

  function handleConfirmAdd(eventoId: number) {
    const state = addingItem[eventoId];
    if (!state?.itemId || !state.mes || !fuente) return;

    const ev = selected.find((s) => s.eventoId === eventoId);
    if (!ev) return;

    const itemId = Number(state.itemId);
    const mes = Number(state.mes);

    if (ev.items.some((it) => it.itemId === itemId && it.mes === mes && it.fuente === fuente)) {
      setAddingItem((prev) => { const next = { ...prev }; delete next[eventoId]; return next; });
      return;
    }

    const catalogItem = catalogItems.find((ci) => ci.id === itemId);
    if (!catalogItem) return;

    const newItem: EventoLineItem = {
      itemId,
      itemNombre: catalogItem.nombre,
      mes,
      fuente,
      monto: 0,
      presupuesto: 0,
      disponible: 0,
    };

    onChange(
      selected.map((s) =>
        s.eventoId === eventoId ? { ...s, items: [...s.items, newItem] } : s,
      ),
    );
    setAddingItem((prev) => { const next = { ...prev }; delete next[eventoId]; return next; });
  }

  function handleCancelAdd(eventoId: number) {
    setAddingItem((prev) => { const next = { ...prev }; delete next[eventoId]; return next; });
  }

  const sorted = [...selected].sort((a, b) => {
    const aH = highlightEventoIds.includes(a.eventoId) ? 0 : 1;
    const bH = highlightEventoIds.includes(b.eventoId) ? 0 : 1;
    return aH - bH;
  });

  const isOrigen = mode === "origen";

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</p>

      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            className="form-input w-full pl-9 pr-4 text-sm"
            placeholder={fuente ? "Buscar y agregar evento..." : "Selecciona una fuente primero"}
            value={search}
            disabled={!fuente}
            onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
          />
        </div>

        {open && fuente && (
          <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
            {loadingSearch ? (
              <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">Buscando...</div>
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

      <div className="space-y-3">
        {sorted.map((ev) => {
          const isHighlighted = highlightEventoIds.includes(ev.eventoId);
          const adding = addingItem[ev.eventoId];
          const totalEvento = ev.items.reduce((s, it) => s + it.monto, 0);

          return (
            <div
              key={ev.eventoId}
              className={`rounded-xl border p-3 space-y-2 ${
                isHighlighted
                  ? "border-indigo-300 bg-indigo-50/40 dark:border-indigo-700 dark:bg-indigo-950/20"
                  : "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  {isHighlighted && (
                    <p className="text-[0.6rem] font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400 mb-0.5">
                      mismo evento
                    </p>
                  )}
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {ev.nombre}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{ev.codigo}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 mt-0.5">
                  {totalEvento > 0 && (
                    <span
                      className={`text-xs font-semibold tabular-nums ${
                        isOrigen
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {isOrigen ? "-" : "+"}
                      {formatCurrency(totalEvento)}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveEvento(ev.eventoId)}
                    className="p-1 rounded-full text-gray-400 hover:text-rose-500 hover:bg-gray-200 dark:hover:bg-gray-700"
                    aria-label={`Quitar ${ev.nombre}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {ev.items.length === 0 && !adding && (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  No hay ítems de {fuente ? getFuenteLabel(fuente) : "esta fuente"}. Agrega uno abajo.
                </p>
              )}

              {ev.items.length > 0 && (
                <ul className="space-y-1.5">
                  {ev.items.map((it) => {
                    const mesLabel = MES_NOMBRES[it.mes] ?? `Mes ${it.mes}`;
                    const delta = isOrigen ? it.presupuesto - it.monto : it.monto - it.presupuesto;
                    const overLimit = isOrigen && it.disponible > 0 && delta > it.disponible;
                    const hasPresupuesto = it.presupuesto > 0;
                    return (
                      <li
                        key={`${it.itemId}-${it.mes}-${it.fuente}`}
                        className="rounded-lg border border-gray-200 bg-white px-2.5 py-2 space-y-1.5 dark:border-gray-700 dark:bg-gray-800"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
                              {it.itemNombre}
                            </p>
                            <p className="text-[0.65rem] text-gray-500 dark:text-gray-400">
                              {mesLabel}
                              {` · ${getFuenteLabel(it.fuente)}`}
                              {isOrigen && hasPresupuesto
                                ? ` · Disp: ${formatCurrency(it.disponible)}`
                                : ""}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveItem(ev.eventoId, it.itemId, it.mes, it.fuente)
                            }
                            className="p-0.5 text-gray-400 hover:text-rose-500 shrink-0"
                            aria-label="Quitar ítem"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>

                        <div>
                          <label className="mb-1 block text-[0.65rem] text-gray-500 dark:text-gray-400">
                            Nuevo presupuesto
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={it.monto === 0 && !hasPresupuesto ? "" : it.monto}
                            onChange={(e) =>
                              handleMontoChange(
                                ev.eventoId,
                                it.itemId,
                                it.mes,
                                it.fuente,
                                e.target.value,
                              )
                            }
                            className={`form-input w-full text-xs ${
                              overLimit ? "border-rose-400 dark:border-rose-500" : ""
                            }`}
                            placeholder="0.00"
                          />
                        </div>

                        {delta !== 0 && (
                          <div
                            className={`flex items-center justify-between text-[0.65rem] rounded px-2 py-1 font-medium tabular-nums ${
                              overLimit
                                ? "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400"
                                : delta > 0
                                  ? isOrigen
                                    ? "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400"
                                    : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                                  : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                            }`}
                          >
                            <span>
                              {isOrigen
                                ? delta > 0 ? "Cortaste" : "Aumentaste"
                                : delta > 0 ? "Agregaste" : "Redujiste"}
                            </span>
                            <span>
                              {delta > 0 ? "-" : "+"}
                              {formatCurrency(Math.abs(delta))}
                              {overLimit ? " ✗" : ""}
                            </span>
                          </div>
                        )}

                        {overLimit && (
                          <p className="text-[0.65rem] text-rose-500">
                            El recorte supera el disponible ({formatCurrency(it.disponible)})
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              {adding ? (
                <div className="rounded-lg border border-dashed border-indigo-300 bg-white p-2.5 space-y-2 dark:border-indigo-700 dark:bg-gray-800">
                  <p className="text-[0.65rem] text-gray-500 dark:text-gray-400">
                    El nuevo ítem se creará en {fuente ? getFuenteLabel(fuente) : "la fuente seleccionada"}.
                    Si este evento ya tiene el mismo ítem en otra fuente, quedará como una línea separada.
                  </p>
                  <select
                    className="form-select w-full text-xs"
                    value={adding.itemId}
                    onChange={(e) =>
                      setAddingItem((prev) => ({
                        ...prev,
                        [ev.eventoId]: { ...prev[ev.eventoId], itemId: e.target.value ? Number(e.target.value) : "" },
                      }))
                    }
                  >
                    <option value="">Selecciona ítem...</option>
                    {catalogItems.map((ci) => (
                      <option key={ci.id} value={ci.id}>
                        {ci.nombre}
                      </option>
                    ))}
                  </select>
                  <select
                    className="form-select w-full text-xs"
                    value={adding.mes}
                    onChange={(e) =>
                      setAddingItem((prev) => ({
                        ...prev,
                        [ev.eventoId]: { ...prev[ev.eventoId], mes: e.target.value ? Number(e.target.value) : "" },
                      }))
                    }
                  >
                    <option value="">Selecciona mes...</option>
                    {MES_OPCIONES.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleConfirmAdd(ev.eventoId)}
                      disabled={!adding.itemId || !adding.mes}
                      className="flex-1 btn bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 text-xs py-1.5"
                    >
                      Agregar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCancelAdd(ev.eventoId)}
                      className="btn border border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300 text-xs py-1.5"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleOpenAdd(ev.eventoId)}
                  className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Agregar ítem
                </button>
              )}
            </div>
          );
        })}
      </div>

      {selected.length === 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500">Ningún evento seleccionado.</p>
      )}
    </div>
  );
}
