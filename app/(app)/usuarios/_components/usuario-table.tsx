"use client";

import Link from "next/link";
import { Eye, Pencil, Trash2 } from "lucide-react";

import { User, type UserDisciplina } from "@/types/user";
import { formatBoolean, formatRoles } from "@/lib/utils/formatters";

type Props = {
  users: User[];
  loading?: boolean;
  error?: string | null;
  onDelete?: (user: User) => void;
};

function getDisciplinaNames(user: User) {
  const fromDetail = (user.disciplinasDetalle ?? []).map((disciplina) => disciplina.nombre);
  if (fromDetail.length > 0) return fromDetail;

  const fromArray = (user.disciplinas ?? [])
    .map((disciplina: UserDisciplina) =>
      typeof disciplina === "number" ? null : disciplina?.nombre ?? null
    )
    .filter((name): name is string => Boolean(name));
  if (fromArray.length > 0) return fromArray;

  return user.disciplina?.nombre ? [user.disciplina.nombre] : [];
}

export default function UsuarioTable({
  users,
  loading,
  error,
  onDelete,
}: Props) {
  const showEmpty = !loading && !error && users.length === 0;

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl relative overflow-hidden">
      <div className="overflow-x-auto">
        <table className="table-auto w-full dark:text-gray-300">
          <thead className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20 border-b border-gray-100 dark:border-gray-700/60">
              <tr>
                <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
                  <div className="font-semibold text-left">Nombre</div>
                </th>
                <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
                  <div className="font-semibold text-left">Apellido</div>
                </th>
                <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
                  <div className="font-semibold text-left">Email</div>
                </th>
                <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
                  <div className="font-semibold text-left">Cedula</div>
                </th>
                <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
                  <div className="font-semibold text-left">Categoria</div>
                </th>
                <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
                  <div className="font-semibold text-left">Disciplina</div>
                </th>
                <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
                  <div className="font-semibold text-left">Roles</div>
                </th>
                <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
                  <div className="font-semibold text-left">Permiso reforma</div>
                </th>
                <th className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
                  <div className="font-semibold text-left">Acciones</div>
                </th>
              </tr>
            </thead>
            {/* Table body */}
            <tbody className="text-sm divide-y divide-gray-100 dark:divide-gray-700/60">
              {loading && (
                <tr>
                  <td
                    className="px-2 first:pl-5 last:pr-5 py-4 whitespace-nowrap text-center text-gray-500 dark:text-gray-400"
                    colSpan={9}
                  >
                    Cargando usuarios...
                  </td>
                </tr>
              )}

              {error && !loading && (
                <tr>
                  <td
                    className="px-2 first:pl-5 last:pr-5 py-4 whitespace-nowrap text-center text-red-500"
                    colSpan={9}
                  >
                    {error}
                  </td>
                </tr>
              )}

              {showEmpty && (
                <tr>
                  <td
                    className="px-2 first:pl-5 last:pr-5 py-4 whitespace-nowrap text-center text-gray-500 dark:text-gray-400"
                    colSpan={9}
                  >
                    No hay usuarios para mostrar.
                  </td>
                </tr>
              )}

              {!loading &&
                !error &&
                users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-2 first:pl-5 last:pr-5 py-2 whitespace-nowrap">
                      <div className="font-semibold text-gray-800 dark:text-gray-100">
                        {user.nombre || "-"}
                      </div>
                    </td>
                    <td className="px-2 first:pl-5 last:pr-5 py-2 whitespace-nowrap">
                      <div className="text-gray-700 dark:text-gray-300">
                        {user.apellido || "-"}
                      </div>
                    </td>
                    <td className="px-2 first:pl-5 last:pr-5 py-2 whitespace-nowrap">
                      <div className="text-gray-700 dark:text-gray-300">
                        {user.email}
                      </div>
                    </td>
                    <td className="px-2 first:pl-5 last:pr-5 py-2 whitespace-nowrap">
                      <div className="text-gray-700 dark:text-gray-300">
                        {user.cedula || "-"}
                      </div>
                    </td>
                    <td className="px-2 first:pl-5 last:pr-5 py-2 whitespace-nowrap">
                      <div className="text-gray-700 dark:text-gray-300">
                        {user.categoria?.nombre ?? "-"}
                      </div>
                    </td>
                    <td className="px-2 first:pl-5 last:pr-5 py-2 whitespace-nowrap">
                      <div className="text-gray-700 dark:text-gray-300">
                        {getDisciplinaNames(user).length > 0
                          ? getDisciplinaNames(user).join(", ")
                          : Array.isArray(user.disciplinas) &&
                            user.disciplinas.length > 0
                          ? `${user.disciplinas.length} disciplina(s)`
                          : "-"}
                      </div>
                    </td>
                    <td className="px-2 first:pl-5 last:pr-5 py-2 whitespace-nowrap">
                      <div className="text-gray-700 dark:text-gray-300">
                        {formatRoles(user.roles)}
                      </div>
                    </td>
                    <td className="px-2 first:pl-5 last:pr-5 py-2 whitespace-nowrap">
                      <div className="text-gray-700 dark:text-gray-300">
                        {user.roles?.includes("ENTRENADOR")
                          ? formatBoolean(user.puedeSolicitarReformas)
                          : "No aplica"}
                      </div>
                    </td>
                    <td className="px-2 first:pl-5 last:pr-5 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/settings/profile?id=${user.id}`}
                          className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-200 hover:border-indigo-300 hover:text-indigo-600 dark:hover:border-indigo-500/60 dark:hover:text-indigo-300 transition-colors"
                          aria-label={`Ver perfil de ${
                            user.nombre ?? user.email
                          }`}
                          title="Ver perfil"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/usuarios/${user.id}/editar`}
                          className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-200 hover:border-indigo-300 hover:text-indigo-600 dark:hover:border-indigo-500/60 dark:hover:text-indigo-300 transition-colors"
                          aria-label={`Editar ${user.nombre ?? user.email}`}
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => onDelete?.(user)}
                          className="h-9 w-9 inline-flex cursor-pointer items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-200 hover:border-rose-300 hover:text-rose-600 dark:hover:border-rose-500/60 dark:hover:text-rose-300 transition-colors"
                          aria-label={`Eliminar ${user.nombre ?? user.email}`}
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
}
