"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, X, Loader2 } from "lucide-react";
import {
  listDeportistas,
  type ListDeportistasOptions,
} from "@/lib/api/deportistas";
import { listEntrenadores, type ListEntrenadoresOptions } from "@/lib/api/user";
import type { Deportista } from "@/types/deportista";
import type { User } from "@/types/user";
import type { Aval } from "@/types/aval";
import { formatGenero } from "@/lib/utils/formatters";
import { useAuth } from "@/app/providers/auth-provider";

type FormData = {
  deportistas: Array<{
    id: number;
    nombre: string;
    cedula?: string;
    fechaNacimiento?: string;
    observacion?: string;
    rol?: string;
  }>;
  entrenadores: Array<{ id: number; nombre: string }>;
  fechaHoraSalida: string;
  fechaHoraRetorno: string;
  lugarSalida: string;
  lugarRetorno: string;
  transporteSalida: string;
  transporteRetorno: string;
  objetivos: string[];
  criterios: string[];
  observaciones?: string;
};

type Paso01DeportistasProps = {
  formData: FormData;
  aval: Aval;
  onComplete: (data: Partial<FormData>) => void;
  onPreviewChange?: (data: Partial<FormData>) => void;
  onBack: () => void;
};

type SelectedDeportista = Deportista & { rol?: string };
type SelectedEntrenador = User;

const DEPORTISTA_ROLE_OPTIONS = [
  { value: "ATLETA", label: "Atleta" },
];

export default function Paso01Deportistas({
  formData,
  aval,
  onComplete,
  onPreviewChange,
  onBack,
}: Paso01DeportistasProps) {
  const evento = aval.evento;
  const { user } = useAuth();

  // State for deportistas hombres
  const [searchDeportistasHombres, setSearchDeportistasHombres] = useState("");
  const [deportistasHombres, setDeportistasHombres] = useState<Deportista[]>(
    []
  );
  const [loadingDeportistasHombres, setLoadingDeportistasHombres] =
    useState(false);
  const [selectedDeportistasHombres, setSelectedDeportistasHombres] = useState<
    SelectedDeportista[]
  >([]);

  // State for deportistas mujeres
  const [searchDeportistasMujeres, setSearchDeportistasMujeres] = useState("");
  const [deportistasMujeres, setDeportistasMujeres] = useState<Deportista[]>(
    []
  );
  const [loadingDeportistasMujeres, setLoadingDeportistasMujeres] =
    useState(false);
  const [selectedDeportistasMujeres, setSelectedDeportistasMujeres] = useState<
    SelectedDeportista[]
  >([]);

  // State for entrenadores hombres
  const [searchEntrenadoresHombres, setSearchEntrenadoresHombres] =
    useState("");
  const [entrenadoresHombres, setEntrenadoresHombres] = useState<User[]>([]);
  const [loadingEntrenadoresHombres, setLoadingEntrenadoresHombres] =
    useState(false);
  const [selectedEntrenadoresHombres, setSelectedEntrenadoresHombres] =
    useState<SelectedEntrenador[]>([]);

  // State for entrenadores mujeres
  const [searchEntrenadoresMujeres, setSearchEntrenadoresMujeres] =
    useState("");
  const [entrenadoresMujeres, setEntrenadoresMujeres] = useState<User[]>([]);
  const [loadingEntrenadoresMujeres, setLoadingEntrenadoresMujeres] =
    useState(false);
  const [selectedEntrenadoresMujeres, setSelectedEntrenadoresMujeres] =
    useState<SelectedEntrenador[]>([]);

  const [principalEntrenadorId, setPrincipalEntrenadorId] = useState<
    number | null
  >(null);

  const [error, setError] = useState<string | null>(null);
  const autoSelectEntrenadorRef = useRef(false);

  const getAllEntrenadores = useCallback(
    () => [...selectedEntrenadoresHombres, ...selectedEntrenadoresMujeres],
    [selectedEntrenadoresHombres, selectedEntrenadoresMujeres]
  );

  const buildSelectedData = useCallback(() => {
    const allDeportistas = [
      ...selectedDeportistasHombres,
      ...selectedDeportistasMujeres,
    ];
    const allEntrenadores = getAllEntrenadores();
    const principal =
      principalEntrenadorId != null
        ? allEntrenadores.find((e) => e.id === principalEntrenadorId)
        : undefined;
    const orderedEntrenadores = principal
      ? [principal, ...allEntrenadores.filter((e) => e.id !== principal.id)]
      : allEntrenadores;

    const deportistasData = allDeportistas.map((d) => ({
      id: d.id,
      nombre: `${d.nombres} ${d.apellidos}`,
      cedula: d.cedula,
      fechaNacimiento: d.fechaNacimiento,
      observacion: d.afiliacion ? "AFILIADO/A 2024" : "SIN AFILIACION",
      rol: d.rol ?? "ATLETA",
    }));

    return {
      deportistas: deportistasData,
      entrenadores: orderedEntrenadores.map((e) => ({
        id: e.id,
        nombre: `${e.nombre} ${e.apellido}`,
      })),
    };
  }, [
    selectedDeportistasHombres,
    selectedDeportistasMujeres,
    getAllEntrenadores,
    principalEntrenadorId,
  ]);

  useEffect(() => {
    onPreviewChange?.(buildSelectedData());
  }, [buildSelectedData, onPreviewChange]);

  useEffect(() => {
    if (autoSelectEntrenadorRef.current) return;
    if (!user?.id) return;
    const isEntrenador =
      user.roles?.includes("ENTRENADOR") &&
      !user.roles?.includes("SUPER_ADMIN") &&
      !user.roles?.includes("ADMIN");
    if (!isEntrenador) return;

    const alreadySelected =
      selectedEntrenadoresHombres.some((e) => e.id === user.id) ||
      selectedEntrenadoresMujeres.some((e) => e.id === user.id);
    if (alreadySelected) {
      autoSelectEntrenadorRef.current = true;
      return;
    }

    const hasSelection =
      selectedEntrenadoresHombres.length > 0 ||
      selectedEntrenadoresMujeres.length > 0;
    if (hasSelection) {
      autoSelectEntrenadorRef.current = true;
      return;
    }

    const allowMale = evento.numEntrenadoresHombres > 0;
    const allowFemale = evento.numEntrenadoresMujeres > 0;

    if ((user.genero === "MASCULINO" || user.genero === "MASCULINO_FEMENINO") && allowMale) {
      setSelectedEntrenadoresHombres([user]);
      setPrincipalEntrenadorId(user.id);
      autoSelectEntrenadorRef.current = true;
      return;
    }

    if ((user.genero === "FEMENINO" || user.genero === "MASCULINO_FEMENINO") && allowFemale) {
      setSelectedEntrenadoresMujeres([user]);
      setPrincipalEntrenadorId(user.id);
      autoSelectEntrenadorRef.current = true;
    }
    autoSelectEntrenadorRef.current = true;
  }, [
    evento.numEntrenadoresHombres,
    evento.numEntrenadoresMujeres,
    selectedEntrenadoresHombres,
    selectedEntrenadoresMujeres,
    user,
  ]);

  // Fetch deportistas hombres
  const fetchDeportistasHombres = useCallback(async () => {
    if (!searchDeportistasHombres.trim()) {
      setDeportistasHombres([]);
      return;
    }

    try {
      setLoadingDeportistasHombres(true);
      const options: ListDeportistasOptions = {
        query: searchDeportistasHombres.trim(),
        limit: 20,
        genero: "Masculino",
      };

      const res = await listDeportistas(options);
      const items = res.data ?? [];
      setDeportistasHombres(items);
    } catch (err: any) {
      console.error("Error al cargar deportistas hombres:", err);
    } finally {
      setLoadingDeportistasHombres(false);
    }
  }, [searchDeportistasHombres]);

  // Fetch deportistas mujeres
  const fetchDeportistasMujeres = useCallback(async () => {
    if (!searchDeportistasMujeres.trim()) {
      setDeportistasMujeres([]);
      return;
    }

    try {
      setLoadingDeportistasMujeres(true);
      const options: ListDeportistasOptions = {
        query: searchDeportistasMujeres.trim(),
        limit: 20,
        genero: "FEMENINO",
      };

      const res = await listDeportistas(options);
      const items = res.data ?? [];
      setDeportistasMujeres(items);
    } catch (err: any) {
      console.error("Error al cargar deportistas mujeres:", err);
    } finally {
      setLoadingDeportistasMujeres(false);
    }
  }, [searchDeportistasMujeres]);

  // Fetch entrenadores hombres
  const fetchEntrenadoresHombres = useCallback(async () => {
    if (!searchEntrenadoresHombres.trim()) {
      setEntrenadoresHombres([]);
      return;
    }

    try {
      setLoadingEntrenadoresHombres(true);
      const options: ListEntrenadoresOptions = {
        limit: 50,
        genero: "MASCULINO",
      };

      const res = await listEntrenadores(options);
      const items = res.data ?? [];

      const filtered = items.filter((e) =>
        `${e.nombre} ${e.apellido} ${e.cedula}`
          .toLowerCase()
          .includes(searchEntrenadoresHombres.toLowerCase())
      );

      setEntrenadoresHombres(filtered);
    } catch (err: any) {
      console.error("Error al cargar entrenadores hombres:", err);
    } finally {
      setLoadingEntrenadoresHombres(false);
    }
  }, [searchEntrenadoresHombres]);

  // Fetch entrenadores mujeres
  const fetchEntrenadoresMujeres = useCallback(async () => {
    if (!searchEntrenadoresMujeres.trim()) {
      setEntrenadoresMujeres([]);
      return;
    }

    try {
      setLoadingEntrenadoresMujeres(true);
      const options: ListEntrenadoresOptions = {
        limit: 50,
        genero: "FEMENINO",
      };

      const res = await listEntrenadores(options);
      const items = res.data ?? [];

      const filtered = items.filter((e) =>
        `${e.nombre} ${e.apellido} ${e.cedula}`
          .toLowerCase()
          .includes(searchEntrenadoresMujeres.toLowerCase())
      );

      setEntrenadoresMujeres(filtered);
    } catch (err: any) {
      console.error("Error al cargar entrenadores mujeres:", err);
    } finally {
      setLoadingEntrenadoresMujeres(false);
    }
  }, [searchEntrenadoresMujeres]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchDeportistasHombres();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchDeportistasHombres]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchDeportistasMujeres();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchDeportistasMujeres]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchEntrenadoresHombres();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchEntrenadoresHombres]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchEntrenadoresMujeres();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchEntrenadoresMujeres]);

  // Handlers for deportistas hombres
  const handleAddDeportistaHombre = (deportista: Deportista) => {
    const alreadySelected = selectedDeportistasHombres.some(
      (d) => d.id === deportista.id
    );
    if (alreadySelected) return;

    setSelectedDeportistasHombres([
      ...selectedDeportistasHombres,
      { ...deportista, rol: "ATLETA" },
    ]);
    setSearchDeportistasHombres("");
    setDeportistasHombres([]);
  };

  const handleRemoveDeportistaHombre = (deportistaId: number) => {
    setSelectedDeportistasHombres(
      selectedDeportistasHombres.filter((d) => d.id !== deportistaId)
    );
  };

  // Handlers for deportistas mujeres
  const handleAddDeportistaMujer = (deportista: Deportista) => {
    const alreadySelected = selectedDeportistasMujeres.some(
      (d) => d.id === deportista.id
    );
    if (alreadySelected) return;

    setSelectedDeportistasMujeres([
      ...selectedDeportistasMujeres,
      { ...deportista, rol: "ATLETA" },
    ]);
    setSearchDeportistasMujeres("");
    setDeportistasMujeres([]);
  };

  const handleRemoveDeportistaMujer = (deportistaId: number) => {
    setSelectedDeportistasMujeres(
      selectedDeportistasMujeres.filter((d) => d.id !== deportistaId)
    );
  };

  const handleDeportistaRoleChange = (
    deportistaId: number,
    rol: string,
    genero: "Masculino" | "Femenino"
  ) => {
    if (genero === "Masculino") {
      setSelectedDeportistasHombres((prev) =>
        prev.map((d) => (d.id === deportistaId ? { ...d, rol } : d))
      );
      return;
    }

    setSelectedDeportistasMujeres((prev) =>
      prev.map((d) => (d.id === deportistaId ? { ...d, rol } : d))
    );
  };

  // Handlers for entrenadores hombres
  const handleAddEntrenadorHombre = (entrenador: User) => {
    const alreadySelected = selectedEntrenadoresHombres.some(
      (e) => e.id === entrenador.id
    );
    if (alreadySelected) return;

    setSelectedEntrenadoresHombres([
      ...selectedEntrenadoresHombres,
      entrenador,
    ]);
    if (principalEntrenadorId == null) {
      setPrincipalEntrenadorId(entrenador.id);
    }
    setSearchEntrenadoresHombres("");
    setEntrenadoresHombres([]);
  };

  const handleRemoveEntrenadorHombre = (entrenadorId: number) => {
    setSelectedEntrenadoresHombres(
      selectedEntrenadoresHombres.filter((e) => e.id !== entrenadorId)
    );
    if (principalEntrenadorId === entrenadorId) {
      const remaining = getAllEntrenadores().filter((e) => e.id !== entrenadorId);
      setPrincipalEntrenadorId(remaining[0]?.id ?? null);
    }
  };

  // Handlers for entrenadores mujeres
  const handleAddEntrenadoraMujer = (entrenador: User) => {
    const alreadySelected = selectedEntrenadoresMujeres.some(
      (e) => e.id === entrenador.id
    );
    if (alreadySelected) return;

    setSelectedEntrenadoresMujeres([
      ...selectedEntrenadoresMujeres,
      entrenador,
    ]);
    if (principalEntrenadorId == null) {
      setPrincipalEntrenadorId(entrenador.id);
    }
    setSearchEntrenadoresMujeres("");
    setEntrenadoresMujeres([]);
  };

  const handleRemoveEntrenadoraMujer = (entrenadorId: number) => {
    setSelectedEntrenadoresMujeres(
      selectedEntrenadoresMujeres.filter((e) => e.id !== entrenadorId)
    );
    if (principalEntrenadorId === entrenadorId) {
      const remaining = getAllEntrenadores().filter((e) => e.id !== entrenadorId);
      setPrincipalEntrenadorId(remaining[0]?.id ?? null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (selectedDeportistasHombres.length !== evento.numAtletasHombres) {
      setError(
        `Debes seleccionar exactamente ${evento.numAtletasHombres} ${
          evento.numAtletasHombres === 1
            ? "deportista hombre"
            : "deportistas hombres"
        } según los requisitos del evento`
      );
      return;
    }

    if (selectedDeportistasMujeres.length !== evento.numAtletasMujeres) {
      setError(
        `Debes seleccionar exactamente ${evento.numAtletasMujeres} ${
          evento.numAtletasMujeres === 1
            ? "deportista mujer"
            : "deportistas mujeres"
        } según los requisitos del evento`
      );
      return;
    }

    if (selectedEntrenadoresHombres.length !== evento.numEntrenadoresHombres) {
      setError(
        `Debes seleccionar exactamente ${evento.numEntrenadoresHombres} ${
          evento.numEntrenadoresHombres === 1 ? "entrenador" : "entrenadores"
        } hombres según los requisitos del evento`
      );
      return;
    }

    if (selectedEntrenadoresMujeres.length !== evento.numEntrenadoresMujeres) {
      setError(
        `Debes seleccionar exactamente ${evento.numEntrenadoresMujeres} ${
          evento.numEntrenadoresMujeres === 1 ? "entrenadora" : "entrenadoras"
        } mujeres según los requisitos del evento`
      );
      return;
    }

    if (getAllEntrenadores().length > 0 && principalEntrenadorId == null) {
      setError("Debes seleccionar un entrenador principal.");
      return;
    }

    onComplete(buildSelectedData());
  };

  // Helper component for rendering search section
  const renderDeportistaSearch = (
    genero: "Masculino" | "Femenino",
    search: string,
    setSearch: (value: string) => void,
    deportistas: Deportista[],
    loading: boolean,
    setDeportistas: (value: Deportista[]) => void,
    selected: SelectedDeportista[],
    required: number,
    handleAdd: (d: Deportista) => void,
    handleRemove: (id: number) => void,
    handleRoleChange: (id: number, role: string) => void
  ) => {
    const label =
      genero === "Masculino" ? "Deportistas hombres" : "Deportistas mujeres";
    const placeholder =
      genero === "Masculino"
        ? "Buscar deportista hombre..."
        : "Buscar deportista mujer...";

    if (required === 0) {
      return (
        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">{label}:</span> Este evento no
            requiere {label.toLowerCase()} para esta delegación.
          </p>
        </div>
      );
    }

    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </label>
          <span
            className={`text-sm font-medium ${
              selected.length === required
                ? "text-emerald-600 dark:text-emerald-400"
                : selected.length > required
                ? "text-rose-600 dark:text-rose-400"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {selected.length} / {required}
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          El evento requiere {required}{" "}
          {required === 1
            ? label.toLowerCase().slice(0, -1)
            : label.toLowerCase()}
        </p>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            className="form-input w-full pl-10 pr-10"
            placeholder={placeholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={selected.length >= required}
          />
          {search.trim() && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setDeportistas([]);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {(loading || search.trim() !== "") && (
            <div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {loading ? (
                <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Buscando...
                </div>
              ) : deportistas.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                  No se encontraron deportistas
                </div>
              ) : (
                deportistas.map((deportista) => {
                  const alreadySelected = selected.some(
                    (d) => d.id === deportista.id
                  );
                  const limitReached = selected.length >= required;
                  const isDisabled = alreadySelected || limitReached;

                  return (
                    <button
                      key={deportista.id}
                      type="button"
                      onClick={() => handleAdd(deportista)}
                      disabled={isDisabled}
                      className={`w-full px-4 py-3 text-left border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors ${
                        isDisabled
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
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

        {selected.length > 0 && (
          <div className="mt-3 space-y-1.5">
            <div className="space-y-2">
              {selected.map((deportista) => (
                <div
                  key={deportista.id}
                  className="flex items-start gap-2 bg-white dark:bg-gray-700 text-sm font-medium text-gray-800 dark:text-gray-100 p-2 rounded-md border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">
                      {deportista.nombres} {deportista.apellidos}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                      <span>{deportista.cedula}</span>
                      {deportista.genero && (
                        <span>{formatGenero(deportista.genero)}</span>
                      )}
                      {deportista.disciplina?.nombre && (
                        <span>{deportista.disciplina.nombre}</span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemove(deportista.id)}
                    className="text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 p-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Helper component for rendering entrenador search section
  const renderEntrenadorSearch = (
    genero: "Masculino" | "Femenino",
    search: string,
    setSearch: (value: string) => void,
    entrenadores: User[],
    loading: boolean,
    setEntrenadores: (value: User[]) => void,
    selected: SelectedEntrenador[],
    required: number,
    handleAdd: (e: User) => void,
    handleRemove: (id: number) => void,
    principalId: number | null,
    onSetPrincipal: (id: number) => void
  ) => {
    const label =
      genero === "Masculino" ? "Entrenadores hombres" : "Entrenadoras mujeres";
    const placeholder =
      genero === "Masculino" ? "Buscar entrenador..." : "Buscar entrenadora...";

    if (required === 0) {
      return (
        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">{label}:</span> Este evento no
            requiere {label.toLowerCase()} para esta delegación.
          </p>
        </div>
      );
    }

    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </label>
          <span
            className={`text-sm font-medium ${
              selected.length === required
                ? "text-emerald-600 dark:text-emerald-400"
                : selected.length > required
                ? "text-rose-600 dark:text-rose-400"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {selected.length} / {required}
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          El evento requiere {required}{" "}
          {required === 1
            ? label.toLowerCase().slice(0, -1)
            : label.toLowerCase()}
        </p>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            className="form-input w-full pl-10 pr-10"
            placeholder={placeholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={selected.length >= required}
          />
          {search.trim() && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setEntrenadores([]);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {(loading || search.trim() !== "") && (
            <div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {loading ? (
                <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Cargando entrenadores...
                </div>
              ) : entrenadores.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                  No se encontraron entrenadores
                </div>
              ) : (
                entrenadores.map((entrenador) => {
                  const alreadySelected = selected.some(
                    (e) => e.id === entrenador.id
                  );
                  const limitReached = selected.length >= required;
                  const isDisabled = alreadySelected || limitReached;

                  return (
                    <button
                      key={entrenador.id}
                      type="button"
                      onClick={() => handleAdd(entrenador)}
                      disabled={isDisabled}
                      className={`w-full px-4 py-3 text-left border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors ${
                        isDisabled
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {entrenador.nombre} {entrenador.apellido}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {entrenador.cedula}
                          </p>
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

        {selected.length > 0 && (
          <div className="mt-3 space-y-1.5">
            <div className="space-y-2">
              {selected.map((entrenador) => (
                <div
                  key={entrenador.id}
                  className="flex items-start gap-2 bg-white dark:bg-gray-700 text-sm font-medium text-gray-800 dark:text-gray-100 p-2 rounded-md border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">
                      {entrenador.nombre} {entrenador.apellido}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      {entrenador.cedula}
                    </p>
                    <div className="mt-1">
                      <button
                        type="button"
                        onClick={() => onSetPrincipal(entrenador.id)}
                        className={`text-[11px] font-semibold ${
                          principalId === entrenador.id
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        }`}
                      >
                        {principalId === entrenador.id
                          ? "Principal"
                          : "Marcar como principal"}
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemove(entrenador.id)}
                    className="text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 p-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <h1 className="text-2xl text-gray-800 dark:text-gray-100 font-bold mb-2">
        Selecciona los participantes
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Agrega los deportistas y entrenadores que participarán en el evento
        según los requisitos establecidos.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="space-y-4 rounded-xl border border-indigo-200/70 dark:border-indigo-800/70 bg-indigo-50/30 dark:bg-indigo-900/10 p-4">
          <div className="pb-2 border-b border-indigo-200 dark:border-indigo-800">
            <h2 className="text-sm font-semibold text-indigo-900 dark:text-indigo-300">
              Deportistas
            </h2>
          </div>

          <div className="space-y-4">
            {renderDeportistaSearch(
              "Masculino",
              searchDeportistasHombres,
              setSearchDeportistasHombres,
              deportistasHombres,
              loadingDeportistasHombres,
              setDeportistasHombres,
              selectedDeportistasHombres,
              evento.numAtletasHombres,
              handleAddDeportistaHombre,
              handleRemoveDeportistaHombre,
              (id, role) => handleDeportistaRoleChange(id, role, "Masculino")
            )}

            <div className="pt-4 border-t border-indigo-100 dark:border-indigo-800/60">
              {renderDeportistaSearch(
                "Femenino",
                searchDeportistasMujeres,
                setSearchDeportistasMujeres,
                deportistasMujeres,
                loadingDeportistasMujeres,
                setDeportistasMujeres,
                selectedDeportistasMujeres,
                evento.numAtletasMujeres,
                handleAddDeportistaMujer,
                handleRemoveDeportistaMujer,
                (id, role) => handleDeportistaRoleChange(id, role, "Femenino")
              )}
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-emerald-200/70 dark:border-emerald-800/70 bg-emerald-50/30 dark:bg-emerald-900/10 p-4">
          <div className="pb-2 border-b border-emerald-200 dark:border-emerald-800">
            <h2 className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">
              Entrenadores
            </h2>
          </div>

          <div className="space-y-4">
            {renderEntrenadorSearch(
              "Masculino",
              searchEntrenadoresHombres,
              setSearchEntrenadoresHombres,
              entrenadoresHombres,
              loadingEntrenadoresHombres,
              setEntrenadoresHombres,
              selectedEntrenadoresHombres,
              evento.numEntrenadoresHombres,
              handleAddEntrenadorHombre,
              handleRemoveEntrenadorHombre,
              principalEntrenadorId,
              setPrincipalEntrenadorId
            )}

            <div className="pt-4 border-t border-emerald-100 dark:border-emerald-800/60">
              {renderEntrenadorSearch(
                "Femenino",
                searchEntrenadoresMujeres,
                setSearchEntrenadoresMujeres,
                entrenadoresMujeres,
                loadingEntrenadoresMujeres,
                setEntrenadoresMujeres,
                selectedEntrenadoresMujeres,
                evento.numEntrenadoresMujeres,
                handleAddEntrenadoraMujer,
                handleRemoveEntrenadoraMujer,
                principalEntrenadorId,
                setPrincipalEntrenadorId
              )}
            </div>
          </div>
        </section>

        {/* Error message */}
        {error && (
          <div className="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
          >
            ← Cancelar
          </button>
          <button
            type="submit"
            className="btn bg-indigo-500 hover:bg-indigo-600 text-white"
          >
            Siguiente paso →
          </button>
        </div>
      </form>
    </div>
  );
}
