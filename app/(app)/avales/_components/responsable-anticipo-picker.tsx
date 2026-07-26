"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Search, X } from "lucide-react";

import { listUsers } from "@/lib/api/user";
import type { User } from "@/types/user";
import type { TipoDocumentoIdentidad } from "@/types/aval";
import { TIPO_DOCUMENTO_OPTIONS } from "@/lib/constants";

export type ResponsableAnticipoDraft = {
  mode: "usuario" | "manual";
  usuarioId?: number;
  usuarioNombre?: string;
  usuarioDocumento?: string;
  nombre: string;
  tipoDocumento: TipoDocumentoIdentidad | "";
  numeroDocumento: string;
};

export const EMPTY_RESPONSABLE_ANTICIPO: ResponsableAnticipoDraft = {
  mode: "usuario",
  nombre: "",
  tipoDocumento: "",
  numeroDocumento: "",
};

function getUserDocumento(user: User): string {
  const usaRuc = Boolean(user.usarRuc && user.ruc?.trim());
  return (usaRuc ? user.ruc : user.cedula)?.trim() || "-";
}

/** Construye el subset de campos a enviar en el body de crear/editar PDA.
 *  Si no hay selección (ni usuario ni datos manuales), devuelve `{}` y el
 *  backend no toca el responsable ya guardado. */
export function buildResponsableAnticipoPayload(draft: ResponsableAnticipoDraft) {
  if (draft.mode === "usuario") {
    return draft.usuarioId ? { responsableAnticipoId: draft.usuarioId } : {};
  }
  const nombre = draft.nombre.trim();
  const numeroDocumento = draft.numeroDocumento.trim();
  if (!nombre && !draft.tipoDocumento && !numeroDocumento) return {};
  return {
    responsableAnticipoNombre: nombre,
    responsableAnticipoTipoDocumento: draft.tipoDocumento || undefined,
    responsableAnticipoNumeroDocumento: numeroDocumento,
  };
}

export function validateResponsableAnticipoDraft(
  draft: ResponsableAnticipoDraft,
): string | null {
  if (draft.mode !== "manual") return null;
  const nombre = draft.nombre.trim();
  const numeroDocumento = draft.numeroDocumento.trim();
  if (!nombre && !draft.tipoDocumento && !numeroDocumento) return null;
  if (!nombre || !draft.tipoDocumento || !numeroDocumento) {
    return "El responsable del anticipo manual requiere nombre, tipo y número de documento.";
  }
  return null;
}

/** Nombre + documento a mostrar en la vista previa mientras se edita, antes de guardar. */
export function getResponsableAnticipoPreviewLabel(
  draft: ResponsableAnticipoDraft,
): { nombre?: string; documento?: string } {
  if (draft.mode === "usuario") {
    return draft.usuarioId
      ? { nombre: draft.usuarioNombre, documento: draft.usuarioDocumento }
      : {};
  }
  return draft.nombre.trim()
    ? { nombre: draft.nombre.trim(), documento: draft.numeroDocumento.trim() || "-" }
    : {};
}

type Props = {
  value: ResponsableAnticipoDraft;
  onChange: (value: ResponsableAnticipoDraft) => void;
  disabled?: boolean;
};

export default function ResponsableAnticipoPicker({
  value,
  onChange,
  disabled,
}: Props) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  const fetchUsers = useCallback(async (query: string, signal: AbortSignal) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    try {
      setLoading(true);
      const res = await listUsers({ query: query.trim(), limit: 8 }, signal);
      setResults(res.data ?? []);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      console.error("Error al buscar usuarios:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void fetchUsers(search, controller.signal);
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search, fetchUsers]);

  const handleSelectUser = (user: User) => {
    onChange({
      ...value,
      mode: "usuario",
      usuarioId: user.id,
      usuarioNombre: `${user.nombre} ${user.apellido}`.trim(),
      usuarioDocumento: getUserDocumento(user),
    });
    setSearch("");
  };

  const handleClearUser = () => {
    onChange({
      ...value,
      usuarioId: undefined,
      usuarioNombre: undefined,
      usuarioDocumento: undefined,
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(
          [
            { mode: "usuario" as const, label: "Usuario del sistema" },
            { mode: "manual" as const, label: "Persona sin cuenta" },
          ]
        ).map(({ mode, label }) => (
          <button
            key={mode}
            type="button"
            onClick={() => onChange({ ...value, mode })}
            disabled={disabled}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              value.mode === mode
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {value.mode === "usuario" ? (
        value.usuarioId ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-3 py-2">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {value.usuarioNombre}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {value.usuarioDocumento}
              </p>
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={handleClearUser}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              className="form-input w-full pl-9"
              placeholder="Buscar por nombre, apellido o cédula..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 150)}
              disabled={disabled}
            />
            {focused && (loading || results.length > 0) && (
              <div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {loading ? (
                  <div className="px-4 py-6 text-center text-gray-500 dark:text-gray-400 text-sm">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Buscando...
                  </div>
                ) : (
                  results.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelectUser(user)}
                      className="w-full px-4 py-2.5 text-left border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {user.nombre} {user.apellido}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {getUserDocumento(user)}
                      </p>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )
      ) : (
        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_140px_160px]">
          <input
            type="text"
            className="form-input"
            placeholder="Nombre completo"
            value={value.nombre}
            disabled={disabled}
            onChange={(e) => onChange({ ...value, nombre: e.target.value })}
          />
          <select
            className="form-select"
            value={value.tipoDocumento}
            disabled={disabled}
            onChange={(e) =>
              onChange({
                ...value,
                tipoDocumento: e.target.value as TipoDocumentoIdentidad | "",
              })
            }
          >
            <option value="">Tipo doc.</option>
            {TIPO_DOCUMENTO_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            className="form-input"
            placeholder="Número de documento"
            value={value.numeroDocumento}
            disabled={disabled}
            onChange={(e) =>
              onChange({ ...value, numeroDocumento: e.target.value })
            }
          />
        </div>
      )}
    </div>
  );
}
