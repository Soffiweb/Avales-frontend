"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Plus, X, Loader2 } from "lucide-react";
import {
  listDeportistas,
  type ListDeportistasOptions,
} from "@/lib/api/deportistas";
import type { Deportista } from "@/types/deportista";
import type { DeportistaAvalDto } from "@/types/aval";
import { formatDate, formatGenero } from "@/lib/utils/formatters";

type AvalTecnicoFormProps = {
  eventoId: number;
  onNext?: (deportistas: DeportistaAvalDto[]) => void;
  onBack?: () => void;
};

type SelectedDeportista = {
  deportista: Deportista;
  rol: string;
};

export default function AvalTecnicoForm({
  eventoId,
  onNext,
  onBack,
}: AvalTecnicoFormProps) {
  // State for deportistas search
  const [search, setSearch] = useState("");
  const [deportistas, setDeportistas] = useState<Deportista[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for selected deportistas
  const [selectedDeportistas, setSelectedDeportistas] = useState<
    SelectedDeportista[]
  >([]);
  const [showSearch, setShowSearch] = useState(false);

  const fetchDeportistas = useCallback(async () => {
    if (!search.trim()) {
      setDeportistas([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const options: ListDeportistasOptions = {
        query: search.trim(),
        limit: 20,
      };

      const res = await listDeportistas(options);
      const items = res.data ?? [];
      setDeportistas(items);
    } catch (err: any) {
      console.error("Error al cargar deportistas:", err);
      setError(err?.message ?? "No se pudieron cargar los deportistas.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchDeportistas();
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchDeportistas]);

  const handleAddDeportista = (deportista: Deportista) => {
    // Check if already selected
    const alreadySelected = selectedDeportistas.some(
      (sd) => sd.deportista.id === deportista.id
    );

    if (alreadySelected) {
      return;
    }

    setSelectedDeportistas([
      ...selectedDeportistas,
      { deportista, rol: "DEPORTISTA" },
    ]);
    setSearch("");
    setDeportistas([]);
    setShowSearch(false);
  };

  const handleRemoveDeportista = (deportistaId: number) => {
    setSelectedDeportistas(
      selectedDeportistas.filter((sd) => sd.deportista.id !== deportistaId)
    );
  };

  const handleRolChange = (deportistaId: number, newRol: string) => {
    setSelectedDeportistas(
      selectedDeportistas.map((sd) =>
        sd.deportista.id === deportistaId ? { ...sd, rol: newRol } : sd
      )
    );
  };

  const handleNext = () => {
    if (selectedDeportistas.length === 0) {
      setError("Debes seleccionar al menos un deportista");
      return;
    }

    const deportistasDto: DeportistaAvalDto[] = selectedDeportistas.map(
      (sd) => ({
        deportistaId: sd.deportista.id,
        rol: sd.rol,
      })
    );

    onNext?.(deportistasDto);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* Left side - Form */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Selección de deportistas
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Busca y agrega los deportistas que participarán en el evento.
          </p>
        </div>

        {/* Search deportistas */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Agregar deportista
          </label>

          {!showSearch ? (
            <button
              type="button"
              onClick={() => setShowSearch(true)}
              className="w-full btn border-dashed border-2 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300"
            >
              <Plus className="w-4 h-4 mr-2" />
              Buscar deportista
            </button>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                className="form-input w-full pl-10 pr-10"
                placeholder="Buscar por nombre, apellido o cédula..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
              <button
                type="button"
                onClick={() => {
                  setShowSearch(false);
                  setSearch("");
                  setDeportistas([]);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Search results dropdown */}
              {(loading || deportistas.length > 0 || error) && (
                <div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {loading ? (
                    <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Buscando...
                    </div>
                  ) : error ? (
                    <div className="px-4 py-3 text-sm text-rose-600 dark:text-rose-400">
                      {error}
                    </div>
                  ) : deportistas.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                      No se encontraron deportistas
                    </div>
                  ) : (
                    deportistas.map((deportista) => {
                      const alreadySelected = selectedDeportistas.some(
                        (sd) => sd.deportista.id === deportista.id
                      );

                      return (
                        <button
                          key={deportista.id}
                          type="button"
                          onClick={() => handleAddDeportista(deportista)}
                          disabled={alreadySelected}
                          className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors ${
                            alreadySelected
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                {deportista.nombres} {deportista.apellidos}
                              </p>
                              <div className="flex items-center gap-3 mt-1">
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {deportista.cedula}
                                </p>
                                {deportista.disciplina?.nombre && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {deportista.disciplina.nombre}
                                  </p>
                                )}
                              </div>
                            </div>
                            {alreadySelected && (
                              <span className="text-xs text-indigo-600 dark:text-indigo-400 ml-2">
                                Agregado
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected deportistas list */}
        {selectedDeportistas.length > 0 && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Deportistas seleccionados ({selectedDeportistas.length})
            </label>

            <div className="space-y-2">
              {selectedDeportistas.map((sd) => (
                <div
                  key={sd.deportista.id}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {sd.deportista.nombres} {sd.deportista.apellidos}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {sd.deportista.cedula}
                        </span>
                        {sd.deportista.genero && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatGenero(sd.deportista.genero)}
                          </span>
                        )}
                        {sd.deportista.disciplina?.nombre && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {sd.deportista.disciplina.nombre}
                          </span>
                        )}
                      </div>

                      {/* Rol selector */}
                      <div className="mt-3">
                        <select
                          value={sd.rol}
                          onChange={(e) =>
                            handleRolChange(sd.deportista.id, e.target.value)
                          }
                          className="form-select text-sm"
                        >
                          <option value="DEPORTISTA">Deportista</option>
                          <option value="CAPITAN">Capitán</option>
                          <option value="SUPLENTE">Suplente</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveDeportista(sd.deportista.id)}
                      className="text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error message */}
        {error && !loading && (
          <div className="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="btn border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300"
            >
              Volver
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={handleNext}
            disabled={selectedDeportistas.length === 0}
            className="btn bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Siguiente paso
          </button>
        </div>
      </div>

      {/* Right side - Empty for now */}
      <div className="hidden lg:block bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 p-8">
        <div className="h-full flex items-center justify-center">
          <p className="text-gray-400 dark:text-gray-500 text-sm text-center">
            Vista previa del aval
            <br />
            <span className="text-xs">(Disponible en siguientes pasos)</span>
          </p>
        </div>
      </div>
    </div>
  );
}
