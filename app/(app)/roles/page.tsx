"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Pencil } from "lucide-react";

import { useAuth } from "@/app/providers/auth-provider";
import AlertBanner from "@/components/ui/alert-banner";
import { isAdminUser } from "@/lib/auth/access";
import { listRoles, updateRole } from "@/lib/api/roles";
import type { Role } from "@/types/role";

export default function RolesAdminPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canAccess = isAdminUser(user);

  const { data, isLoading, error } = useQuery({
    queryKey: ["roles"],
    queryFn: () => listRoles(),
    enabled: canAccess,
  });

  const roles: Role[] = (data?.data as Role[] | undefined) ?? [];

  const [editing, setEditing] = useState<Role | null>(null);
  const [formNombre, setFormNombre] = useState("");
  const [formDescripcion, setFormDescripcion] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: { nombre?: string; descripcion?: string };
    }) => updateRole(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["roles"] });
      setEditing(null);
      setSaveError(null);
    },
    onError: (err) => {
      setSaveError(err instanceof Error ? err.message : "No se pudo guardar");
    },
  });

  function openEdit(role: Role) {
    setEditing(role);
    setFormNombre(role.nombre);
    setFormDescripcion(role.descripcion ?? "");
    setSaveError(null);
  }

  function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const payload: { nombre?: string; descripcion?: string } = {};
    if (formNombre !== editing.nombre) payload.nombre = formNombre.trim();
    if (formDescripcion !== (editing.descripcion ?? "")) {
      payload.descripcion = formDescripcion.trim();
    }
    if (Object.keys(payload).length === 0) {
      setEditing(null);
      return;
    }
    updateMutation.mutate({ id: editing.id, payload });
  }

  if (!canAccess) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-5xl mx-auto">
        <AlertBanner
          variant="error"
          message="No tienes permisos para gestionar roles."
        />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-5xl mx-auto space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-indigo-600" />
            Roles del sistema
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Edita el nombre legible y la descripción de cada rol. El código
            interno (TipoRol) está atado al flujo y no se puede modificar.
          </p>
        </div>
      </div>

      {error ? (
        <AlertBanner
          variant="error"
          message={error instanceof Error ? error.message : "Error al cargar"}
        />
      ) : null}

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 h-28"
            />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Código
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Nombre
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Descripción
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
              {roles.map((rol) => (
                <tr key={rol.id}>
                  <td className="px-4 py-3 text-sm font-mono text-gray-600 dark:text-gray-300">
                    {rol.codigo}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {rol.nombre}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-md truncate">
                    {rol.descripcion ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(rol)}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Editar rol — <span className="font-mono">{editing.codigo}</span>
            </h2>
            <form className="mt-4 space-y-4" onSubmit={submitEdit}>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nombre
                </label>
                <input
                  type="text"
                  required
                  maxLength={150}
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Descripción
                </label>
                <textarea
                  rows={3}
                  maxLength={600}
                  value={formDescripcion}
                  onChange={(e) => setFormDescripcion(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
              {saveError ? (
                <AlertBanner variant="error" message={saveError} />
              ) : null}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
                >
                  {updateMutation.isPending ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
