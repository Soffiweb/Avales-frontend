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
import { getTodayDateInputValue } from "@/lib/utils/formatters/dates";
import { matchesSearchTerm } from "@/lib/utils/normalize-text";
import { useAuth } from "@/app/providers/auth-provider";
import { getNormalizedRoles, isAdminUser } from "@/lib/auth/access";
import {
  getAllowedModalidadesByTipoAval,
  getModalidadParticipacionLabel,
} from "@/lib/constants";
import type { ModalidadParticipacion, TipoAval } from "@/types/aval";

const DEPORTISTA_SEARCH_MIN_LENGTH = 3;
const DEPORTISTA_SEARCH_LIMIT = 10;
const DEPORTISTA_SEARCH_DEBOUNCE_MS = 400;

type FormData = {
  deportistas: Array<{
    id: number;
    deportistaExternoId?: string;
    nombre: string;
    apellido?: string;
    nombres?: string;
    apellidos?: string;
    cedula?: string;
    fechaNacimiento?: string;
    genero?: string;
    club?: string;
    afiliacion?: boolean;
    payload?: Record<string, unknown>;
    observacion?: string;
    rol?: string;
    modalidadParticipacion?: ModalidadParticipacion;
  }>;
  entrenadores: Array<{ id: number; nombre: string; esTextoLibre?: boolean }>;
  fechaEmision?: string;
  fechaHoraSalida: string;
  fechaHoraRetorno: string;
  lugarSalida: string;
  lugarRetorno: string;
  transporteSalida: string;
  transporteRetorno: string;
  objetivos: string[];
  criterios: string[];
  observaciones?: string;
  tipoAval?: TipoAval;
};

type Paso01DeportistasProps = {
  formData: FormData;
  aval: Aval;
  onComplete: (data: Partial<FormData>) => void;
  onPreviewChange?: (data: Partial<FormData>) => void;
  onBack: () => void;
};

type SelectedDeportista = Deportista & {
  rol?: string;
  modalidadParticipacion?: ModalidadParticipacion;
};
type SelectedEntrenador = User | { id: number; nombre: string; apellido: string; cedula?: undefined; esTextoLibre: true };

function formatDeportistaNombre(
  deportista: Pick<Deportista, "nombres" | "apellidos">
) {
  return `${deportista.apellidos} ${deportista.nombres}`.trim();
}

function sortDeportistasByApellido<T extends Pick<Deportista, "nombres" | "apellidos" | "cedula">>(
  deportistas: T[]
) {
  return [...deportistas].sort((a, b) => {
    const apellidoCompare = (a.apellidos ?? "").localeCompare(b.apellidos ?? "", "es", {
      sensitivity: "base",
    });

    if (apellidoCompare !== 0) return apellidoCompare;

    const nombreCompare = (a.nombres ?? "").localeCompare(b.nombres ?? "", "es", {
      sensitivity: "base",
    });

    if (nombreCompare !== 0) return nombreCompare;

    return (a.cedula ?? "").localeCompare(b.cedula ?? "", "es", {
      sensitivity: "base",
    });
  });
}

function getDefaultModalidad(tipoAval?: TipoAval | null): ModalidadParticipacion {
  if (tipoAval === "AUTOGESTION") return "CUBIERTO_AUTOGESTION";
  if (tipoAval === "SOLO_RESULTADO") return "SOLO_RESULTADO";
  return "CUBIERTO_FONDOS_PUBLICOS";
}

export default function Paso01Deportistas({
  formData,
  aval,
  onComplete,
  onPreviewChange,
  onBack,
}: Paso01DeportistasProps) {
  const evento = aval.evento;
  const { user } = useAuth();
  const [fechaEmision, setFechaEmision] = useState(
    formData.fechaEmision || getTodayDateInputValue(),
  );

  const [searchDeportistas, setSearchDeportistas] = useState("");
  const [deportistas, setDeportistas] = useState<Deportista[]>([]);
  const [loadingDeportistas, setLoadingDeportistas] = useState(false);
  const [deportistasFocused, setDeportistasFocused] = useState(false);
  const [selectedDeportistas, setSelectedDeportistas] = useState<
    SelectedDeportista[]
  >(() =>
    sortDeportistasByApellido(
      (formData.deportistas ?? []).map((d) => ({
        id: d.id,
        nombres: d.nombres ?? d.nombre ?? "",
        apellidos: d.apellidos ?? d.apellido ?? "",
        cedula: d.cedula ?? "",
        fechaNacimiento: d.fechaNacimiento ?? "",
        genero: (d.genero as Deportista["genero"]) ?? undefined,
        afiliacion: d.afiliacion ?? false,
        rol: d.rol ?? "ATLETA",
        modalidadParticipacion:
          d.modalidadParticipacion ??
          getDefaultModalidad(formData.tipoAval ?? aval.tipoAval ?? undefined),
        // Campos extras que el form principal no guarda — usan defaults.
        ...(d.payload as Partial<Deportista> | undefined),
      })) as SelectedDeportista[],
    ),
  );

  const [searchEntrenadores, setSearchEntrenadores] = useState("");
  const [entrenadores, setEntrenadores] = useState<User[]>([]);
  const [loadingEntrenadores, setLoadingEntrenadores] = useState(false);
  const [entrenadoresFocused, setEntrenadoresFocused] = useState(false);
  const freeTextIdCounterRef = useRef(-1);
  const [selectedEntrenadores, setSelectedEntrenadores] = useState<
    SelectedEntrenador[]
  >(() =>
    (formData.entrenadores ?? []).map((e) => {
      if (e.esTextoLibre) {
        return {
          id: e.id,
          nombre: e.nombre,
          apellido: "",
          esTextoLibre: true as const,
        };
      }
      const [nombre = "", ...apellidoParts] = (e.nombre ?? "").split(" ");
      return {
        id: e.id,
        nombre,
        apellido: apellidoParts.join(" "),
      } as SelectedEntrenador;
    }),
  );
  const [freeTextEntrenadorNombre, setFreeTextEntrenadorNombre] = useState("");

  const [principalEntrenadorId, setPrincipalEntrenadorId] = useState<
    number | null
  >(() => formData.entrenadores?.[0]?.id ?? null);
  const [error, setError] = useState<string | null>(null);
  const autoSelectEntrenadorRef = useRef(false);

  const totalDeportistasRequeridos =
    (evento.numAtletasHombres ?? 0) + (evento.numAtletasMujeres ?? 0);
  const totalEntrenadoresRequeridos =
    (evento.numEntrenadoresHombres ?? 0) +
    (evento.numEntrenadoresMujeres ?? 0);
  const tipoAval = formData.tipoAval ?? aval.tipoAval ?? undefined;
  const trimmedSearchDeportistas = searchDeportistas.trim();
  const canSearchDeportistas =
    trimmedSearchDeportistas.length >= DEPORTISTA_SEARCH_MIN_LENGTH;
  const modalidadesPermitidas =
    aval.modalidadesPermitidas?.length
      ? aval.modalidadesPermitidas
      : getAllowedModalidadesByTipoAval(tipoAval);

  const buildSelectedData = useCallback(() => {
    const principal =
      principalEntrenadorId != null
        ? selectedEntrenadores.find((e) => e.id === principalEntrenadorId)
        : undefined;
    const orderedEntrenadores = principal
      ? [
          principal,
          ...selectedEntrenadores.filter((e) => e.id !== principal.id),
        ]
      : selectedEntrenadores;

    return {
      deportistas: sortDeportistasByApellido(selectedDeportistas).map((d) => ({
        id: d.id,
        deportistaExternoId: d.externoId ?? String(d.id),
        nombre: formatDeportistaNombre(d),
        apellido: d.apellidos ?? undefined,
        nombres: d.nombres ?? undefined,
        apellidos: d.apellidos ?? undefined,
        cedula: d.cedula,
        fechaNacimiento: d.fechaNacimiento,
        genero: d.genero,
        club: d.club,
        afiliacion: d.afiliacion,
        payload: {
          genero: d.genero ?? null,
          fechaNacimiento: d.fechaNacimiento ?? null,
          afiliado: Boolean(d.afiliacion),
          club: d.club ?? null,
        },
        observacion: d.afiliacion ? "AFILIADO/A 2026" : "SIN AFILIACION",
        rol: d.rol ?? "ATLETA",
        modalidadParticipacion:
          d.modalidadParticipacion ?? getDefaultModalidad(tipoAval),
      })),
      entrenadores: orderedEntrenadores.map((e) => ({
        id: e.id,
        nombre: "esTextoLibre" in e && e.esTextoLibre
          ? e.nombre
          : `${e.nombre} ${e.apellido ?? ""}`.trim(),
        esTextoLibre: "esTextoLibre" in e && e.esTextoLibre ? true : undefined,
      })),
      fechaEmision,
      tipoAval,
    };
  }, [
    fechaEmision,
    principalEntrenadorId,
    selectedDeportistas,
    selectedEntrenadores,
    tipoAval,
  ]);

  useEffect(() => {
    onPreviewChange?.(buildSelectedData());
  }, [buildSelectedData, onPreviewChange]);

  useEffect(() => {
    if (autoSelectEntrenadorRef.current) return;
    if (!user?.id) return;
    const isEntrenador =
      getNormalizedRoles(user).includes("ENTRENADOR") && !isAdminUser(user);
    if (!isEntrenador) return;

    const alreadySelected = selectedEntrenadores.some((e) => e.id === user.id);
    if (alreadySelected) {
      autoSelectEntrenadorRef.current = true;
      return;
    }

    if (selectedEntrenadores.length > 0) {
      autoSelectEntrenadorRef.current = true;
      return;
    }

    setSelectedEntrenadores([user]);
    setPrincipalEntrenadorId(user.id);
    autoSelectEntrenadorRef.current = true;
  }, [selectedEntrenadores, totalEntrenadoresRequeridos, user]);

  const fetchDeportistas = useCallback(async () => {
    const trimmed = searchDeportistas.trim();

    if (trimmed.length < DEPORTISTA_SEARCH_MIN_LENGTH) {
      setDeportistas([]);
      setLoadingDeportistas(false);
      return;
    }

    try {
      setLoadingDeportistas(true);
      const options: ListDeportistasOptions = {
        limit: DEPORTISTA_SEARCH_LIMIT,
        query: trimmed,
      };

      const res = await listDeportistas(options);
      setDeportistas(sortDeportistasByApellido(res.data ?? []));
    } catch (err: any) {
      console.error("Error al cargar deportistas:", err);
    } finally {
      setLoadingDeportistas(false);
    }
  }, [searchDeportistas]);

  const fetchEntrenadores = useCallback(async () => {
    try {
      setLoadingEntrenadores(true);
      const options: ListEntrenadoresOptions = {
        limit: 50,
      };

      const res = await listEntrenadores(options);
      const items = res.data ?? [];
      const trimmed = searchEntrenadores.trim();
      setEntrenadores(
        trimmed
          ? items.filter((entrenador) =>
              matchesSearchTerm(trimmed, [
                entrenador.nombre,
                entrenador.apellido,
                entrenador.cedula,
              ]),
            )
          : items,
      );
    } catch (err: any) {
      console.error("Error al cargar entrenadores:", err);
    } finally {
      setLoadingEntrenadores(false);
    }
  }, [searchEntrenadores]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchDeportistas();
    }, DEPORTISTA_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [fetchDeportistas]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchEntrenadores();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchEntrenadores]);

  const handleAddDeportista = (deportista: Deportista) => {
    const alreadySelected = selectedDeportistas.some((d) => d.id === deportista.id);
    if (alreadySelected || selectedDeportistas.length >= totalDeportistasRequeridos) {
      return;
    }

    setSelectedDeportistas((prev) =>
      sortDeportistasByApellido([
        ...prev,
        {
          ...deportista,
          rol: "ATLETA",
          modalidadParticipacion: getDefaultModalidad(tipoAval),
        },
      ])
    );
    setSearchDeportistas("");
  };

  const handleRemoveDeportista = (deportistaId: number) => {
    setSelectedDeportistas((prev) => prev.filter((d) => d.id !== deportistaId));
  };

  const handleModalidadChange = (
    deportistaId: number,
    modalidadParticipacion: ModalidadParticipacion,
  ) => {
    setSelectedDeportistas((prev) =>
      prev.map((deportista) =>
        deportista.id === deportistaId
          ? { ...deportista, modalidadParticipacion }
          : deportista,
      ),
    );
  };

  const handleAddEntrenador = (entrenador: User) => {
    const alreadySelected = selectedEntrenadores.some((e) => e.id === entrenador.id);
    const limitReached =
      totalEntrenadoresRequeridos > 0 &&
      selectedEntrenadores.length >= totalEntrenadoresRequeridos;
    if (alreadySelected || limitReached) {
      return;
    }

    setSelectedEntrenadores((prev) => [...prev, entrenador]);
    if (principalEntrenadorId == null) {
      setPrincipalEntrenadorId(entrenador.id);
    }
    setSearchEntrenadores("");
  };

  const handleAddEntrenadorTextoLibre = () => {
    const nombre = freeTextEntrenadorNombre.trim();
    if (!nombre) return;
    const freeTextId = freeTextIdCounterRef.current;
    freeTextIdCounterRef.current -= 1;
    const entry: SelectedEntrenador = {
      id: freeTextId,
      nombre,
      apellido: "",
      esTextoLibre: true,
    };
    setSelectedEntrenadores((prev) => [...prev, entry]);
    if (principalEntrenadorId == null) {
      setPrincipalEntrenadorId(freeTextId);
    }
    setFreeTextEntrenadorNombre("");
  };

  const handleRemoveEntrenador = (entrenadorId: number) => {
    const remaining = selectedEntrenadores.filter((e) => e.id !== entrenadorId);
    setSelectedEntrenadores(remaining);
    if (principalEntrenadorId === entrenadorId) {
      setPrincipalEntrenadorId(remaining[0]?.id ?? null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedDeportistas.length !== totalDeportistasRequeridos) {
      setError(
        `Debes seleccionar exactamente ${totalDeportistasRequeridos} ${
          totalDeportistasRequeridos === 1 ? "deportista" : "deportistas"
        } según los requisitos del evento.`
      );
      return;
    }

    if (
      totalEntrenadoresRequeridos > 0 &&
      selectedEntrenadores.length !== totalEntrenadoresRequeridos
    ) {
      setError(
        `Debes seleccionar exactamente ${totalEntrenadoresRequeridos} ${
          totalEntrenadoresRequeridos === 1 ? "entrenador" : "entrenadores"
        } según los requisitos del evento.`
      );
      return;
    }

    if (selectedEntrenadores.length > 0 && principalEntrenadorId == null) {
      setError("Debes seleccionar un entrenador principal.");
      return;
    }

    onComplete(buildSelectedData());
  };

  const renderDeportistaSearch = () => {
    if (totalDeportistasRequeridos === 0) {
      return (
        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Este evento no requiere deportistas para esta delegación.
          </p>
        </div>
      );
    }

    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Deportistas
          </label>
          <span
            className={`text-sm font-medium ${
              selectedDeportistas.length === totalDeportistasRequeridos
                ? "text-emerald-600 dark:text-emerald-400"
                : selectedDeportistas.length > totalDeportistasRequeridos
                ? "text-rose-600 dark:text-rose-400"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {selectedDeportistas.length} / {totalDeportistasRequeridos}
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          El evento requiere {totalDeportistasRequeridos}{" "}
          {totalDeportistasRequeridos === 1 ? "deportista" : "deportistas"}.
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          Escribe al menos {DEPORTISTA_SEARCH_MIN_LENGTH} letras. Se muestran hasta{" "}
          {DEPORTISTA_SEARCH_LIMIT} resultados.
        </p>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            className="form-input w-full pl-10 pr-10"
            placeholder="Buscar deportista..."
            value={searchDeportistas}
            onChange={(e) => setSearchDeportistas(e.target.value)}
            onFocus={() => setDeportistasFocused(true)}
            onBlur={() => setTimeout(() => setDeportistasFocused(false), 150)}
            disabled={selectedDeportistas.length >= totalDeportistasRequeridos}
          />
          {searchDeportistas.trim() && (
            <button
              type="button"
              onClick={() => setSearchDeportistas("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {deportistasFocused &&
            trimmedSearchDeportistas.length > 0 &&
            !canSearchDeportistas && (
              <div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                  Escribe al menos {DEPORTISTA_SEARCH_MIN_LENGTH} letras para buscar.
                </div>
              </div>
            )}

          {deportistasFocused && canSearchDeportistas && (
            <div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {loadingDeportistas ? (
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
                  const alreadySelected = selectedDeportistas.some(
                    (d) => d.id === deportista.id
                  );
                  const limitReached =
                    selectedDeportistas.length >= totalDeportistasRequeridos;
                  const isDisabled = alreadySelected || limitReached;

                  return (
                    <button
                      key={deportista.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleAddDeportista(deportista)}
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
                            {formatDeportistaNombre(deportista)}
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

        {selectedDeportistas.length > 0 && (
          <div className="mt-3 space-y-2">
            {selectedDeportistas.map((deportista) => (
              <div
                key={deportista.id}
                className="flex items-start gap-2 bg-white dark:bg-gray-700 text-sm font-medium text-gray-800 dark:text-gray-100 p-2 rounded-md border border-gray-200 dark:border-gray-600"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">
                    {formatDeportistaNombre(deportista)}
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
                  <div className="mt-2">
                    {modalidadesPermitidas.length > 1 ? (
                      <select
                        value={
                          deportista.modalidadParticipacion ??
                          getDefaultModalidad(tipoAval)
                        }
                        onChange={(e) =>
                          handleModalidadChange(
                            deportista.id,
                            e.target.value as ModalidadParticipacion,
                          )
                        }
                        className="form-select w-full text-xs sm:max-w-[240px]"
                      >
                        {modalidadesPermitidas.map((modalidad) => (
                          <option key={modalidad} value={modalidad}>
                            {getModalidadParticipacionLabel(modalidad)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="inline-flex rounded-full bg-indigo-50 px-2 py-1 text-[11px] font-medium text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                        {getModalidadParticipacionLabel(
                          deportista.modalidadParticipacion ??
                            modalidadesPermitidas[0],
                        )}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveDeportista(deportista.id)}
                  className="text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderEntrenadorSearch = () => {
    const dropdownLimitReached =
      totalEntrenadoresRequeridos > 0 &&
      selectedEntrenadores.length >= totalEntrenadoresRequeridos;

    return (
      <div>
        {totalEntrenadoresRequeridos > 0 && (
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Entrenadores
            </label>
            <span
              className={`text-sm font-medium ${
                selectedEntrenadores.length === totalEntrenadoresRequeridos
                  ? "text-emerald-600 dark:text-emerald-400"
                  : selectedEntrenadores.length > totalEntrenadoresRequeridos
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              {selectedEntrenadores.length} / {totalEntrenadoresRequeridos}
            </span>
          </div>
        )}
        {totalEntrenadoresRequeridos > 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            El evento requiere {totalEntrenadoresRequeridos}{" "}
            {totalEntrenadoresRequeridos === 1 ? "entrenador" : "entrenadores"}.
          </p>
        ) : (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Asigna al menos un entrenador responsable para continuar.
          </p>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            className="form-input w-full pl-10 pr-10"
            placeholder="Buscar entrenador registrado..."
            value={searchEntrenadores}
            onChange={(e) => setSearchEntrenadores(e.target.value)}
            onFocus={() => setEntrenadoresFocused(true)}
            onBlur={() => setTimeout(() => setEntrenadoresFocused(false), 150)}
            disabled={dropdownLimitReached}
          />
          {searchEntrenadores.trim() && (
            <button
              type="button"
              onClick={() => setSearchEntrenadores("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {entrenadoresFocused && (loadingEntrenadores || entrenadores.length > 0) && (
            <div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {loadingEntrenadores ? (
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
                  const alreadySelected = selectedEntrenadores.some(
                    (e) => e.id === entrenador.id
                  );
                  const isDisabled = alreadySelected || dropdownLimitReached;

                  return (
                    <button
                      key={entrenador.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleAddEntrenador(entrenador)}
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

        {!dropdownLimitReached && (
          <div className="mt-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              ¿El entrenador no está en el sistema?
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                className="form-input flex-1"
                placeholder="Nombre completo del entrenador"
                value={freeTextEntrenadorNombre}
                onChange={(e) => setFreeTextEntrenadorNombre(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddEntrenadorTextoLibre();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddEntrenadorTextoLibre}
                disabled={!freeTextEntrenadorNombre.trim()}
                className="px-3 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-md"
              >
                Agregar
              </button>
            </div>
          </div>
        )}

        {selectedEntrenadores.length > 0 && (
          <div className="mt-3 space-y-2">
            {selectedEntrenadores.map((entrenador) => {
              const isFreeText = "esTextoLibre" in entrenador && entrenador.esTextoLibre;
              const displayName = isFreeText
                ? entrenador.nombre
                : `${entrenador.nombre} ${entrenador.apellido ?? ""}`.trim();
              return (
                <div
                  key={entrenador.id}
                  className="flex items-start gap-2 bg-white dark:bg-gray-700 text-sm font-medium text-gray-800 dark:text-gray-100 p-2 rounded-md border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">
                      {displayName}
                    </p>
                    {!isFreeText && entrenador.cedula && (
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {entrenador.cedula}
                      </p>
                    )}
                    {isFreeText && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                        No registrado en el sistema
                      </p>
                    )}
                    <div className="mt-1">
                      <button
                        type="button"
                        onClick={() => setPrincipalEntrenadorId(entrenador.id)}
                        className={`text-[11px] font-semibold ${
                          principalEntrenadorId === entrenador.id
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        }`}
                      >
                        {principalEntrenadorId === entrenador.id
                          ? "Principal"
                          : "Marcar como principal"}
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveEntrenador(entrenador.id)}
                    className="text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 p-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              );
            })}
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
        <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Fecha de emisión
            </h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Se puede editar al inicio para cargar avales históricos.
            </p>
          </div>
          <input
            type="date"
            value={fechaEmision}
            onChange={(e) => setFechaEmision(e.target.value)}
            className="form-input w-full max-w-xs"
            required
          />
        </section>

        <section className="space-y-4 rounded-xl border border-indigo-200/70 dark:border-indigo-800/70 bg-indigo-50/30 dark:bg-indigo-900/10 p-4">
          <div className="pb-2 border-b border-indigo-200 dark:border-indigo-800">
            <h2 className="text-sm font-semibold text-indigo-900 dark:text-indigo-300">
              Deportistas
            </h2>
          </div>
          {renderDeportistaSearch()}
        </section>

        <section className="space-y-4 rounded-xl border border-emerald-200/70 dark:border-emerald-800/70 bg-emerald-50/30 dark:bg-emerald-900/10 p-4">
          <div className="pb-2 border-b border-emerald-200 dark:border-emerald-800">
            <h2 className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">
              Entrenadores
            </h2>
          </div>
          {renderEntrenadorSearch()}
        </section>

        {error && (
          <div className="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

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
