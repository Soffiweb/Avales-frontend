"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, X, Loader2 } from "lucide-react";
import {
  listDeportistas,
  type ListDeportistasOptions,
} from "@/lib/api/deportistas";
import { listEntrenadores, type ListEntrenadoresOptions } from "@/lib/api/user";
import type { Deportista } from "@/types/deportista";
import type { Genero, User } from "@/types/user";
import PronosticoDeportistaFields from "./pronostico-deportista-fields";
import type {
  Aval,
  PropositoDto,
  ModalidadParticipacion,
  TipoAval,
} from "@/types/aval";
import { formatGenero } from "@/lib/utils/formatters";
import { getTodayDateInputValue } from "@/lib/utils/formatters/dates";
import { matchesSearchTerm } from "@/lib/utils/normalize-text";
import { useAuth } from "@/app/providers/auth-provider";
import { getNormalizedRoles, isAdminUser } from "@/lib/auth/access";
import { getAvalCupos } from "@/lib/utils/aval-collections";
import {
  getPronosticoProfile,
  ensureAtLeastOneProposito,
  createEmptyProposito,
  PROCEDENCIA_GROUP_FIELDS,
  PROCEDENCIA_DEFAULT_FIELD,
  type DeportistaPronosticoFieldPath,
  type PronosticoProfile,
} from "@/lib/utils/aval-pronostico";
import {
  validatePronosticoDeportista,
  type PronosticoFieldErrors,
} from "@/lib/validation/aval-pronostico";

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
    categoriaId?: number;
    categoriaNombre?: string;
    afiliacion?: string;
    canton?: string;
    club?: string;
    entrenadorNombre?: string;
    ordenProposito?: number;
    propositos?: PropositoDto[];
    afiliado?: boolean;
    payload?: Record<string, unknown>;
    observacion?: string;
    rol?: string;
    modalidadParticipacion?: ModalidadParticipacion;
  }>;
  entrenadores: Array<{
    id: number;
    nombre: string;
    esTextoLibre?: boolean;
    genero?: Genero;
  }>;
  otrosParticipantes?: Array<{
    cargo: string;
    nombre?: string;
    usuarioId?: number;
    genero?: Genero;
  }>;
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

type SelectedDeportista = Omit<Deportista, "afiliacion"> & {
  rol?: string;
  modalidadParticipacion?: ModalidadParticipacion;
  categoriaNombre?: string;
  afiliacion?: string;
  canton?: string;
  entrenadorNombre?: string;
  ordenProposito?: number;
  propositos?: PropositoDto[];
  afiliado?: boolean;
  payload?: Record<string, unknown>;
};
type SelectedEntrenador =
  | User
  | {
      id: number;
      nombre: string;
      apellido: string;
      cedula?: undefined;
      esTextoLibre: true;
      genero?: Genero;
    };
type SelectedOtroParticipante = {
  id: number;
  cargo: string;
  nombre: string;
  genero?: Genero;
};

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

function toRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function toStringValue(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function toNumberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function toBooleanValue(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function toPropositoDto(source: Record<string, unknown>): PropositoDto {
  return {
    orden: toNumberValue(source.orden),
    ubicacionActual: toStringValue(source.ubicacionActual),
    divisionPeso: toStringValue(source.divisionPeso),
    prueba: toStringValue(source.prueba),
    marcaActual: toStringValue(source.marcaActual),
    unidadMarcaActual: toStringValue(source.unidadMarcaActual),
    ubicacionProposito: toStringValue(source.ubicacionProposito),
    marcaProposito: toStringValue(source.marcaProposito),
    unidadMarcaProposito: toStringValue(source.unidadMarcaProposito),
  };
}

function buildPropositosPayload(
  propositos: unknown,
  payload?: Record<string, unknown>,
): PropositoDto[] | undefined {
  const source = Array.isArray(propositos)
    ? propositos
    : Array.isArray(payload?.propositos)
      ? (payload!.propositos as unknown[])
      : undefined;
  if (!source) return undefined;

  return source
    .map((item) => toRecord(item))
    .filter((record): record is Record<string, unknown> => Boolean(record))
    .map(toPropositoDto);
}

function getDefaultProcedenciaActiva(
  deportista: Pick<SelectedDeportista, "canton" | "club" | "entrenadorNombre">,
  profile: PronosticoProfile | null,
): Set<DeportistaPronosticoFieldPath> {
  const active = new Set<DeportistaPronosticoFieldPath>();
  if (!profile) return active;

  const groupPathsPresent = profile.fields
    .map((f) => f.path)
    .filter((path) => PROCEDENCIA_GROUP_FIELDS.includes(path));

  const values: Partial<Record<DeportistaPronosticoFieldPath, string | undefined>> = {
    canton: deportista.canton,
    club: deportista.club,
    entrenadorNombre: deportista.entrenadorNombre,
  };

  for (const path of groupPathsPresent) {
    if (values[path]?.trim()) active.add(path);
  }
  // Si nada tiene valor todavía (deportista recién agregado, o guardado en
  // blanco), entrenador arranca seleccionado por defecto. Si ya hay algo
  // lleno (ej. club de un draft guardado), respetamos esa elección previa
  // en vez de forzar entrenador encima.
  if (active.size === 0 && groupPathsPresent.includes(PROCEDENCIA_DEFAULT_FIELD)) {
    active.add(PROCEDENCIA_DEFAULT_FIELD);
  }
  return active;
}

function getEntrenadorDisplayName(entrenador: SelectedEntrenador | undefined) {
  if (!entrenador) return "";
  return "esTextoLibre" in entrenador && entrenador.esTextoLibre
    ? entrenador.nombre
    : `${entrenador.nombre} ${entrenador.apellido ?? ""}`.trim();
}

export default function Paso01Deportistas({
  formData,
  aval,
  onComplete,
  onPreviewChange,
  onBack,
}: Paso01DeportistasProps) {
  const { user } = useAuth();
  const pronosticoProfile = getPronosticoProfile(aval.evento);
  const categoriaEventoDefault =
    aval.evento?.categoria?.nombre?.trim() || undefined;
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
      (formData.deportistas ?? []).map((d) => {
        const payload = toRecord(d.payload);
        const afiliado =
          d.afiliado ??
          toBooleanValue(payload?.afiliado) ??
          toBooleanValue(payload?.afiliacion) ??
          false;

        return {
          id: d.id,
          externoId: d.deportistaExternoId ?? String(d.id),
          nombres: d.nombres ?? d.nombre ?? "",
          apellidos: d.apellidos ?? d.apellido ?? "",
          cedula: d.cedula ?? "",
          fechaNacimiento: d.fechaNacimiento ?? "",
          genero: (d.genero as Deportista["genero"]) ?? undefined,
          categoriaId: d.categoriaId ?? toNumberValue(payload?.categoriaId),
          categoriaNombre:
            d.categoriaNombre ??
            toStringValue(payload?.categoriaNombre) ??
            categoriaEventoDefault ??
            "",
          afiliacion:
            d.afiliacion ??
            toStringValue(payload?.afiliacion) ??
            (afiliado ? "AFILIADO/A 2026" : "SIN AFILIACION"),
          canton: d.canton ?? toStringValue(payload?.canton) ?? "",
          club: d.club ?? toStringValue(payload?.club) ?? "",
          entrenadorNombre:
            d.entrenadorNombre ?? toStringValue(payload?.entrenadorNombre) ?? "",
          ordenProposito: d.ordenProposito ?? toNumberValue(payload?.ordenProposito),
          propositos: ensureAtLeastOneProposito(
            d.propositos ?? buildPropositosPayload(d.propositos, payload),
          ),
          afiliado,
          rol: d.rol ?? "ATLETA",
          modalidadParticipacion:
            d.modalidadParticipacion ??
            getDefaultModalidad(formData.tipoAval ?? aval.tipoAval ?? undefined),
        };
      }) as SelectedDeportista[],
    ),
  );

  // Qué chips de cantón/club/entrenador están activos por deportista. No se
  // deriva solo de los valores: un campo vacío puede ser "inactivo" (chip
  // apagado) o "activo pero sin llenar" (error de validación).
  const [procedenciaActivos, setProcedenciaActivos] = useState<
    Record<number, Set<DeportistaPronosticoFieldPath>>
  >(() => {
    const map: Record<number, Set<DeportistaPronosticoFieldPath>> = {};
    for (const d of selectedDeportistas) {
      map[d.id] = getDefaultProcedenciaActiva(d, pronosticoProfile);
    }
    return map;
  });
  const procedenciaActivosRef = useRef(procedenciaActivos);
  // getPronosticoProfile devuelve un objeto nuevo en cada render (no está
  // memoizado): si entrara al arreglo de deps del effect de sincronización,
  // lo dispararía en cada render y provocaría un loop de renders.
  const pronosticoProfileRef = useRef(pronosticoProfile);
  // Deportistas cuyo campo "Entrenador" fue escrito a mano: el effect de
  // sincronización con el entrenador principal ya no debe tocarlos.
  const [entrenadorManualOverrides, setEntrenadorManualOverrides] = useState<
    Set<number>
  >(new Set());
  const entrenadorManualOverridesRef = useRef(entrenadorManualOverrides);

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
          genero: e.genero,
        };
      }
      const [nombre = "", ...apellidoParts] = (e.nombre ?? "").split(" ");
      return {
        id: e.id,
        nombre,
        apellido: apellidoParts.join(" "),
        genero: e.genero,
      } as SelectedEntrenador;
    }),
  );
  const [freeTextEntrenadorNombre, setFreeTextEntrenadorNombre] = useState("");
  const [freeTextEntrenadorGenero, setFreeTextEntrenadorGenero] = useState<
    Genero | ""
  >("");

  const otroParticipanteIdCounterRef = useRef(-1);
  const [selectedOtrosParticipantes, setSelectedOtrosParticipantes] = useState<
    SelectedOtroParticipante[]
  >(() =>
    (formData.otrosParticipantes ?? []).map((o) => {
      const id = otroParticipanteIdCounterRef.current;
      otroParticipanteIdCounterRef.current -= 1;
      return {
        id,
        cargo: o.cargo,
        nombre: o.nombre ?? "",
        genero: o.genero,
      };
    }),
  );
  const [otroCargoInput, setOtroCargoInput] = useState("");
  const [otroNombreInput, setOtroNombreInput] = useState("");
  const [otroGeneroInput, setOtroGeneroInput] = useState<Genero | "">("");
  const [tipoPersonal, setTipoPersonal] = useState<
    "ENTRENADOR" | "JUEZ" | "DELEGADO" | "OTRO"
  >("ENTRENADOR");

  const [principalEntrenadorId, setPrincipalEntrenadorId] = useState<
    number | null
  >(() => formData.entrenadores?.[0]?.id ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pronosticoErrors, setPronosticoErrors] = useState<
    Record<number, PronosticoFieldErrors>
  >({});
  const autoSelectEntrenadorRef = useRef(false);

  const cupos = getAvalCupos(aval);
  const totalDeportistasRequeridos =
    cupos.numAtletasHombres + cupos.numAtletasMujeres;
  const totalEntrenadoresRequeridos =
    cupos.numEntrenadoresHombres + cupos.numEntrenadoresMujeres;
  // Cupo compartido: entrenadores + otros participantes (jueces, delegados, etc.)
  // no pueden superar juntos lo definido en la forma de participación.
  const cupoEntrenadoresOtrosOcupado =
    selectedEntrenadores.length + selectedOtrosParticipantes.length;
  const tipoAval = formData.tipoAval ?? aval.tipoAval ?? undefined;
  const trimmedSearchDeportistas = searchDeportistas.trim();
  const canSearchDeportistas =
    trimmedSearchDeportistas.length >= DEPORTISTA_SEARCH_MIN_LENGTH;
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
    const entrenadorPrincipalNombre = getEntrenadorDisplayName(principal);

    return {
      deportistas: sortDeportistasByApellido(selectedDeportistas).map((d, index) => {
        const payload = toRecord(d.payload);
        const afiliado = d.afiliado ?? false;

        return {
          id: d.id,
          deportistaExternoId: d.externoId ?? String(d.id),
          nombre: formatDeportistaNombre(d),
          apellido: d.apellidos ?? undefined,
          nombres: d.nombres ?? undefined,
          apellidos: d.apellidos ?? undefined,
          cedula: d.cedula,
          fechaNacimiento: d.fechaNacimiento,
          genero: d.genero,
          categoriaId: d.categoriaId,
          categoriaNombre: d.categoriaNombre?.trim() || undefined,
          afiliacion: d.afiliacion?.trim() || undefined,
          canton: d.canton?.trim() || undefined,
          club: d.club?.trim() || undefined,
          entrenadorNombre:
            d.entrenadorNombre?.trim() || entrenadorPrincipalNombre || undefined,
          ordenProposito: index + 1,
          propositos: (d.propositos ?? []).map((p, i) => ({
            ...p,
            orden: p.orden ?? i + 1,
          })),
          payload: {
            ...payload,
            genero: d.genero ?? null,
            fechaNacimiento: d.fechaNacimiento ?? null,
            afiliado,
            categoriaId: d.categoriaId ?? null,
            categoriaNombre: d.categoriaNombre?.trim() || null,
            afiliacion: d.afiliacion?.trim() || null,
            canton: d.canton?.trim() || null,
            club: d.club?.trim() || null,
            entrenadorNombre:
              d.entrenadorNombre?.trim() || entrenadorPrincipalNombre || null,
            ordenProposito: index + 1,
            propositos: d.propositos ?? null,
          },
          observacion: afiliado ? "AFILIADO/A 2026" : "SIN AFILIACION",
          rol: d.rol ?? "ATLETA",
          modalidadParticipacion:
            d.modalidadParticipacion ?? getDefaultModalidad(tipoAval),
          afiliado,
        };
      }),
      entrenadores:
        totalEntrenadoresRequeridos === 0
          ? []
          : orderedEntrenadores.map((e) => ({
              id: e.id,
              nombre:
                "esTextoLibre" in e && e.esTextoLibre
                  ? e.nombre
                  : `${e.nombre} ${e.apellido ?? ""}`.trim(),
              esTextoLibre:
                "esTextoLibre" in e && e.esTextoLibre ? true : undefined,
              genero: "genero" in e ? e.genero ?? undefined : undefined,
            })),
      otrosParticipantes: selectedOtrosParticipantes.map((o) => ({
        cargo: o.cargo,
        nombre: o.nombre,
        genero: o.genero,
      })),
      fechaEmision,
      tipoAval,
    };
  }, [
    fechaEmision,
    principalEntrenadorId,
    selectedDeportistas,
    selectedEntrenadores,
    selectedOtrosParticipantes,
    tipoAval,
    totalEntrenadoresRequeridos,
  ]);

  useEffect(() => {
    onPreviewChange?.(buildSelectedData());
  }, [buildSelectedData, onPreviewChange]);

  useEffect(() => {
    if (!formData.fechaEmision) return;
    setFechaEmision(formData.fechaEmision);
  }, [formData.fechaEmision]);

  useEffect(() => {
    if (autoSelectEntrenadorRef.current) return;
    if (!user?.id) return;
    const isEntrenador =
      getNormalizedRoles(user).includes("ENTRENADOR") && !isAdminUser(user);
    if (!isEntrenador) return;
    if (totalEntrenadoresRequeridos === 0) return;

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

  // Mantiene entrenadorNombre en sincronía con el entrenador principal: si
  // cambia el principal (o se borra), se refleja en todo deportista cuya
  // procedencia activa sea "entrenador". No toca a quien tenga cantón/club
  // activo en su lugar. procedenciaActivos se lee por ref (no como dep) para
  // no reprocesar todos los deportistas cada vez que se togglea un chip
  // ajeno, lo que pisaría ediciones manuales de otros deportistas.
  procedenciaActivosRef.current = procedenciaActivos;
  pronosticoProfileRef.current = pronosticoProfile;
  entrenadorManualOverridesRef.current = entrenadorManualOverrides;

  useEffect(() => {
    const principal = selectedEntrenadores.find((e) => e.id === principalEntrenadorId);
    const principalNombre = getEntrenadorDisplayName(principal);
    const activos = procedenciaActivosRef.current;
    const hasPronosticoProfile = Boolean(pronosticoProfileRef.current);
    const manualOverrides = entrenadorManualOverridesRef.current;

    setSelectedDeportistas((prev) => {
      let changed = false;
      const next = prev.map((deportista) => {
        if (manualOverrides.has(deportista.id)) return deportista;
        const syncEntrenador = hasPronosticoProfile
          ? activos[deportista.id]?.has("entrenadorNombre") ?? false
          : true;
        if (!syncEntrenador) return deportista;
        if ((deportista.entrenadorNombre ?? "") === principalNombre) return deportista;
        changed = true;
        return { ...deportista, entrenadorNombre: principalNombre };
      });
      return changed ? next : prev;
    });
  }, [principalEntrenadorId, selectedEntrenadores]);

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
      const items = sortDeportistasByApellido(res.data ?? []);
      setDeportistas(items);
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
      const filtered = trimmed
        ? items.filter((entrenador) =>
            matchesSearchTerm(trimmed, [
              entrenador.nombre,
              entrenador.apellido,
              entrenador.cedula,
            ]),
          )
        : items;
      setEntrenadores(filtered);
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

    const principal = selectedEntrenadores.find((e) => e.id === principalEntrenadorId);
    const entrenadorPrincipalNombre = getEntrenadorDisplayName(principal);
    const afiliado = Boolean(deportista.afiliacion);

    setSelectedDeportistas((prev) =>
      sortDeportistasByApellido([
        ...prev,
        {
          ...deportista,
          categoriaId: deportista.categoriaId ?? aval.evento?.categoria?.id ?? undefined,
          categoriaNombre:
            deportista.categoria?.nombre ?? categoriaEventoDefault ?? "",
          afiliacion: afiliado ? "AFILIADO/A 2026" : "SIN AFILIACION",
          canton: "",
          entrenadorNombre: entrenadorPrincipalNombre,
          propositos: ensureAtLeastOneProposito(),
          afiliado,
          rol: "ATLETA",
          modalidadParticipacion: getDefaultModalidad(tipoAval),
        },
      ])
    );
    setPronosticoErrors((prev) => {
      const next = { ...prev };
      delete next[deportista.id];
      return next;
    });
    if (pronosticoProfile) {
      setProcedenciaActivos((prev) => ({
        ...prev,
        [deportista.id]: getDefaultProcedenciaActiva(
          { canton: "", club: "", entrenadorNombre: entrenadorPrincipalNombre },
          pronosticoProfile,
        ),
      }));
    }
    setSearchDeportistas("");
  };

  const handleRemoveDeportista = (deportistaId: number) => {
    setSelectedDeportistas((prev) => prev.filter((d) => d.id !== deportistaId));
    setPronosticoErrors((prev) => {
      const next = { ...prev };
      delete next[deportistaId];
      return next;
    });
    setProcedenciaActivos((prev) => {
      const next = { ...prev };
      delete next[deportistaId];
      return next;
    });
    setEntrenadorManualOverrides((prev) => {
      if (!prev.has(deportistaId)) return prev;
      const next = new Set(prev);
      next.delete(deportistaId);
      return next;
    });
  };

  const handleToggleProcedencia = (
    deportistaId: number,
    path: DeportistaPronosticoFieldPath,
  ) => {
    const wasActive = procedenciaActivos[deportistaId]?.has(path) ?? false;
    setProcedenciaActivos((prev) => {
      const next = new Set(prev[deportistaId] ?? []);
      if (wasActive) next.delete(path);
      else next.add(path);
      return { ...prev, [deportistaId]: next };
    });
    if (wasActive) {
      handlePronosticoFieldChange(deportistaId, path, "");
      // Al apagar el chip, la próxima vez que se prenda vuelve a seguir el
      // valor por defecto (entrenador principal) en vez de quedar "manual".
      if (path === "entrenadorNombre") {
        setEntrenadorManualOverrides((prev) => {
          if (!prev.has(deportistaId)) return prev;
          const next = new Set(prev);
          next.delete(deportistaId);
          return next;
        });
      }
    }
  };

  // Solo los 5 campos deportista-level: los de propositos[] (plantillas 1/2
  // con índice fijo 0, plantilla 3 con N filas) van por handlePruebaFieldChange.
  const handlePronosticoFieldChange = (
    deportistaId: number,
    path: DeportistaPronosticoFieldPath,
    value: string,
  ) => {
    setSelectedDeportistas((prev) =>
      prev.map((deportista) => {
        if (deportista.id !== deportistaId) return deportista;
        switch (path) {
          case "categoriaNombre":
            return { ...deportista, categoriaNombre: value };
          case "afiliacion":
            return { ...deportista, afiliacion: value };
          case "canton":
            return { ...deportista, canton: value };
          case "club":
            return { ...deportista, club: value };
          case "entrenadorNombre":
            return { ...deportista, entrenadorNombre: value };
          default:
            return deportista;
        }
      }),
    );
    setPronosticoErrors((prev) => {
      const current = prev[deportistaId];
      if (!current?.[path]) return prev;
      const next = { ...prev };
      const nextErrors = { ...(next[deportistaId] ?? {}) };
      delete nextErrors[path];
      if (Object.keys(nextErrors).length === 0) {
        delete next[deportistaId];
      } else {
        next[deportistaId] = nextErrors;
      }
      return next;
    });
  };

  const handleAddPrueba = (deportistaId: number) => {
    setSelectedDeportistas((prev) =>
      prev.map((deportista) => {
        if (deportista.id !== deportistaId) return deportista;
        return {
          ...deportista,
          propositos: [...(deportista.propositos ?? []), createEmptyProposito()],
        };
      }),
    );
  };

  const handleRemovePrueba = (deportistaId: number, index: number) => {
    setSelectedDeportistas((prev) =>
      prev.map((deportista) => {
        if (deportista.id !== deportistaId) return deportista;
        return {
          ...deportista,
          propositos: (deportista.propositos ?? []).filter((_, i) => i !== index),
        };
      }),
    );
    setPronosticoErrors((prev) => {
      if (!prev[deportistaId]) return prev;
      const next = { ...prev };
      delete next[deportistaId];
      return next;
    });
  };

  const handlePruebaFieldChange = (
    deportistaId: number,
    index: number,
    path: DeportistaPronosticoFieldPath,
    value: string,
  ) => {
    setSelectedDeportistas((prev) =>
      prev.map((deportista) => {
        if (deportista.id !== deportistaId) return deportista;
        const propositos = [...(deportista.propositos ?? [])];
        const row = { ...propositos[index] };
        switch (path) {
          case "proposito.prueba":
            row.prueba = value;
            break;
          case "proposito.marcaActual":
            row.marcaActual = value;
            break;
          case "proposito.unidadMarcaActual":
            row.unidadMarcaActual = value;
            break;
          case "proposito.marcaProposito":
            row.marcaProposito = value;
            break;
          case "proposito.unidadMarcaProposito":
            row.unidadMarcaProposito = value;
            break;
          case "proposito.ubicacionActual":
            row.ubicacionActual = value;
            break;
          case "proposito.ubicacionProposito":
            row.ubicacionProposito = value;
            break;
          case "proposito.divisionPeso":
            row.divisionPeso = value;
            break;
          default:
            return deportista;
        }
        propositos[index] = row;
        return { ...deportista, propositos };
      }),
    );
    setPronosticoErrors((prev) => {
      const rowError = prev[deportistaId]?.pruebas?.[index]?.[path];
      if (!rowError) return prev;
      const next = { ...prev };
      const currentErrors = next[deportistaId] ?? {};
      const nextPruebas = [...(currentErrors.pruebas ?? [])];
      const nextRow = { ...nextPruebas[index] };
      delete nextRow[path];
      nextPruebas[index] = nextRow;
      next[deportistaId] = { ...currentErrors, pruebas: nextPruebas };
      return next;
    });
  };

  const handleAddEntrenador = (entrenador: User) => {
    const alreadySelected = selectedEntrenadores.some((e) => e.id === entrenador.id);
    const limitReached =
      totalEntrenadoresRequeridos > 0 &&
      cupoEntrenadoresOtrosOcupado >= totalEntrenadoresRequeridos;
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
    if (
      totalEntrenadoresRequeridos > 0 &&
      cupoEntrenadoresOtrosOcupado >= totalEntrenadoresRequeridos
    ) {
      return;
    }
    const freeTextId = freeTextIdCounterRef.current;
    freeTextIdCounterRef.current -= 1;
    const entry: SelectedEntrenador = {
      id: freeTextId,
      nombre,
      apellido: "",
      esTextoLibre: true,
      genero: freeTextEntrenadorGenero || undefined,
    };
    setSelectedEntrenadores((prev) => [...prev, entry]);
    if (principalEntrenadorId == null) {
      setPrincipalEntrenadorId(freeTextId);
    }
    setFreeTextEntrenadorNombre("");
    setFreeTextEntrenadorGenero("");
  };

  const handleRemoveEntrenador = (entrenadorId: number) => {
    const remaining = selectedEntrenadores.filter((e) => e.id !== entrenadorId);
    setSelectedEntrenadores(remaining);
    if (principalEntrenadorId === entrenadorId) {
      setPrincipalEntrenadorId(remaining[0]?.id ?? null);
    }
  };

  const cargosUsados = Array.from(
    new Set(selectedOtrosParticipantes.map((o) => o.cargo)),
  );

  const otrosParticipantesLimitReached =
    totalEntrenadoresRequeridos > 0 &&
    cupoEntrenadoresOtrosOcupado >= totalEntrenadoresRequeridos;

  const handleAddOtroParticipante = () => {
    const cargo = (
      tipoPersonal === "OTRO" ? otroCargoInput.trim() : tipoPersonal
    ).toUpperCase();
    const nombre = otroNombreInput.trim();
    if (!cargo || !nombre || !otroGeneroInput) return;
    if (otrosParticipantesLimitReached) return;
    const id = otroParticipanteIdCounterRef.current;
    otroParticipanteIdCounterRef.current -= 1;
    setSelectedOtrosParticipantes((prev) => [
      ...prev,
      { id, cargo, nombre, genero: otroGeneroInput },
    ]);
    setOtroNombreInput("");
    setOtroGeneroInput("");
  };

  const handleRemoveOtroParticipante = (id: number) => {
    setSelectedOtrosParticipantes((prev) => prev.filter((o) => o.id !== id));
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

    if (totalEntrenadoresRequeridos > 0 && selectedEntrenadores.length === 0) {
      setError("Debe asignar al menos un entrenador responsable.");
      return;
    }

    if (
      totalEntrenadoresRequeridos > 0 &&
      cupoEntrenadoresOtrosOcupado !== totalEntrenadoresRequeridos
    ) {
      setError(
        `Debes seleccionar exactamente ${totalEntrenadoresRequeridos} ${
          totalEntrenadoresRequeridos === 1 ? "persona" : "personas"
        } entre entrenadores y otros participantes, según los requisitos del evento.`
      );
      return;
    }

    if (totalEntrenadoresRequeridos > 0 && principalEntrenadorId == null) {
      setError("Debes seleccionar un entrenador principal.");
      return;
    }

    if (pronosticoProfile) {
      const nextErrors = selectedDeportistas.reduce<Record<number, PronosticoFieldErrors>>(
        (acc, deportista) => {
          const fieldErrors = validatePronosticoDeportista(
            deportista,
            pronosticoProfile,
            procedenciaActivos[deportista.id],
          );
          if (Object.keys(fieldErrors).length > 0) {
            acc[deportista.id] = fieldErrors;
          }
          return acc;
        },
        {},
      );

      setPronosticoErrors(nextErrors);

      if (Object.keys(nextErrors).length > 0) {
        setError(
          "Completa los datos de pronóstico requeridos para todos los deportistas.",
        );
        return;
      }
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
        {pronosticoProfile ? (
          <div className="mb-3 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-200">
            Pronóstico activo: <strong>{pronosticoProfile.template.replace("_", " ")}</strong> para{" "}
            <strong>{pronosticoProfile.disciplinaLabel}</strong>. Al agregar un deportista se habilitan
            los campos requeridos para generar el Excel automáticamente.
          </div>
        ) : null}

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
            {selectedDeportistas.map((deportista, index) => (
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
                  {pronosticoProfile ? (
                    <PronosticoDeportistaFields
                      deportista={deportista}
                      profile={pronosticoProfile}
                      defaultCategoriaNombre={categoriaEventoDefault}
                      errors={pronosticoErrors[deportista.id]}
                      activePaths={
                        procedenciaActivos[deportista.id] ??
                        new Set<DeportistaPronosticoFieldPath>()
                      }
                      onToggleActive={(path) =>
                        handleToggleProcedencia(deportista.id, path)
                      }
                      onChange={(path, value) => {
                        if (path === "entrenadorNombre") {
                          setEntrenadorManualOverrides((prev) => {
                            if (prev.has(deportista.id)) return prev;
                            const next = new Set(prev);
                            next.add(deportista.id);
                            return next;
                          });
                        }
                        handlePronosticoFieldChange(deportista.id, path, value);
                      }}
                      onAddPrueba={() => handleAddPrueba(deportista.id)}
                      onRemovePrueba={(index) =>
                        handleRemovePrueba(deportista.id, index)
                      }
                      onPruebaFieldChange={(index, path, value) =>
                        handlePruebaFieldChange(deportista.id, index, path, value)
                      }
                    />
                  ) : null}
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

  const renderPersonal = () => {
    const limitReached =
      totalEntrenadoresRequeridos > 0 &&
      cupoEntrenadoresOtrosOcupado >= totalEntrenadoresRequeridos;

    return (
      <div>
        {totalEntrenadoresRequeridos > 0 && (
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Personal
            </label>
            <span
              className={`text-sm font-medium ${
                cupoEntrenadoresOtrosOcupado === totalEntrenadoresRequeridos
                  ? "text-emerald-600 dark:text-emerald-400"
                  : cupoEntrenadoresOtrosOcupado > totalEntrenadoresRequeridos
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              {cupoEntrenadoresOtrosOcupado} / {totalEntrenadoresRequeridos}
            </span>
          </div>
        )}
        {totalEntrenadoresRequeridos > 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            El evento requiere {totalEntrenadoresRequeridos}{" "}
            {totalEntrenadoresRequeridos === 1 ? "persona" : "personas"} entre
            entrenadores y otros participantes (jueces, delegados, etc.).
          </p>
        ) : (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Esta forma de participación no requiere entrenadores ni personal adicional.
          </p>
        )}

        {totalEntrenadoresRequeridos > 0 && (
          <div className="flex gap-2 mb-3 flex-wrap">
            {(
              [
                { tipo: "ENTRENADOR" as const, label: "Entrenador" },
                { tipo: "JUEZ" as const, label: "Juez" },
                { tipo: "DELEGADO" as const, label: "Delegado" },
                { tipo: "OTRO" as const, label: "Otro" },
              ]
            ).map(({ tipo, label }) => (
              <button
                key={tipo}
                type="button"
                onClick={() => setTipoPersonal(tipo)}
                disabled={limitReached}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  tipoPersonal === tipo
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {totalEntrenadoresRequeridos > 0 ? (
          tipoPersonal === "ENTRENADOR" ? (
            <>
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
                disabled={limitReached}
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
                      const isDisabled = alreadySelected || limitReached;

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

              {!limitReached && (
                <div className="mt-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    ¿El entrenador no está en el sistema?
                  </p>
                  <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_180px_auto]">
                    <input
                      type="text"
                      className="form-input min-w-0"
                      placeholder="Nombre completo del entrenador"
                      value={freeTextEntrenadorNombre}
                      onChange={(e) =>
                        setFreeTextEntrenadorNombre(e.target.value)
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddEntrenadorTextoLibre();
                        }
                      }}
                    />
                    <select
                      className="form-select"
                      value={freeTextEntrenadorGenero}
                      onChange={(e) =>
                        setFreeTextEntrenadorGenero(e.target.value as Genero | "")
                      }
                    >
                      <option value="">Genero</option>
                      <option value="MASCULINO">Masculino</option>
                      <option value="FEMENINO">Femenino</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleAddEntrenadorTextoLibre}
                      disabled={
                        !freeTextEntrenadorNombre.trim() || !freeTextEntrenadorGenero
                      }
                      className="px-3 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-md shrink-0"
                    >
                      Agregar
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-2">
              {tipoPersonal === "OTRO" && (
                <>
                  <input
                    type="text"
                    list="cargos-usados"
                    className="form-input w-full"
                    placeholder="Cargo (ej. ASISTENTE, FISIOTERAPEUTA)"
                    value={otroCargoInput}
                    onChange={(e) => setOtroCargoInput(e.target.value)}
                    disabled={limitReached}
                  />
                  <datalist id="cargos-usados">
                    {cargosUsados.map((cargo) => (
                      <option key={cargo} value={cargo} />
                    ))}
                  </datalist>
                </>
              )}
              <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_180px_auto]">
                <input
                  type="text"
                  className="form-input min-w-0"
                  placeholder="Nombre completo"
                  value={otroNombreInput}
                  onChange={(e) => setOtroNombreInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddOtroParticipante();
                    }
                  }}
                  disabled={limitReached}
                />
                <select
                  className="form-select"
                  value={otroGeneroInput}
                  onChange={(e) => setOtroGeneroInput(e.target.value as Genero | "")}
                  disabled={limitReached}
                >
                  <option value="">Genero</option>
                  <option value="MASCULINO">Masculino</option>
                  <option value="FEMENINO">Femenino</option>
                </select>
                <button
                  type="button"
                  onClick={handleAddOtroParticipante}
                  disabled={
                    (tipoPersonal === "OTRO" && !otroCargoInput.trim()) ||
                    !otroNombreInput.trim() ||
                    !otroGeneroInput ||
                    limitReached
                  }
                  className="px-3 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-md shrink-0"
                >
                  Agregar
                </button>
              </div>
            </div>
          )
        ) : null}

        {(selectedEntrenadores.length > 0 || selectedOtrosParticipantes.length > 0) && (
          <div className="mt-3 space-y-2">
            {selectedEntrenadores.map((entrenador) => {
              const isFreeText = "esTextoLibre" in entrenador && entrenador.esTextoLibre;
              const displayName = isFreeText
                ? entrenador.nombre
                : `${entrenador.nombre} ${entrenador.apellido ?? ""}`.trim();
              return (
                <div
                  key={`entrenador-${entrenador.id}`}
                  className="flex items-start gap-2 bg-white dark:bg-gray-700 text-sm font-medium text-gray-800 dark:text-gray-100 p-2 rounded-md border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">
                      {displayName}
                    </p>
                    <span className="inline-flex mt-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                      ENTRENADOR
                    </span>
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
                    {entrenador.genero && (
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {formatGenero(entrenador.genero)}
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

            {selectedOtrosParticipantes.map((otro) => (
              <div
                key={`otro-${otro.id}`}
                className="flex items-start gap-2 bg-white dark:bg-gray-700 text-sm font-medium text-gray-800 dark:text-gray-100 p-2 rounded-md border border-gray-200 dark:border-gray-600"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{otro.nombre}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <span className="inline-flex rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                      {otro.cargo}
                    </span>
                    <span className="inline-flex rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      {formatGenero(otro.genero)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveOtroParticipante(otro.id)}
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
        {/*
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
        */}

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
              Personal
            </h2>
          </div>
          {renderPersonal()}
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
