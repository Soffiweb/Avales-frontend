"use client";

import {
  TableContainer,
  Table,
  TableHead,
  TableBody,
  Th,
  Tr,
  Td,
} from "@/components/ui/table";
import Link from "next/link";
import { Eye, Pencil, Trash2, Users } from "lucide-react";

import { User, type RoleLike, type UserDisciplina } from "@/types/user";
import { formatBoolean, formatRoles } from "@/lib/utils/formatters";
import { getRoleCode, normalizeRoleCode } from "@/lib/auth/roles";
import { formatCategoryLabel } from "@/lib/utils/categories";

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
    <TableContainer>
        <Table>
          <TableHead>
              <tr>
                <Th>Nombre</Th>
                <Th>Apellido</Th>
                <Th>Email</Th>
                <Th>Cédula</Th>
                <Th>Categoría</Th>
                <Th>Disciplina</Th>
                <Th>Roles</Th>
                <Th>Permiso reforma</Th>
                <Th>Acciones</Th>
              </tr>
            </TableHead>
            {/* Table body */}
            <TableBody>
              {loading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="animate-pulse">
                    <Td className="py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" /></Td>
                    <Td className="py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" /></Td>
                    <Td className="py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32" /></Td>
                    <Td className="py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" /></Td>
                    <Td className="py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16" /></Td>
                    <Td className="py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" /></Td>
                    <Td className="py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16" /></Td>
                    <Td className="py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-10" /></Td>
                    <Td className="py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16" /></Td>
                  </tr>
                ))}

              {error && !loading && (
                <tr>
                  <Td
                    className="text-center text-red-500"
                    colSpan={9}
                  >
                    {error}
                  </Td>
                </tr>
              )}

              {showEmpty && (
                <tr>
                  <Td
                    className="py-12 text-center"
                    colSpan={9}
                  >
                    <Users className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-base text-gray-500 dark:text-gray-400">No hay usuarios para mostrar.</p>
                  </Td>
                </tr>
              )}

              {!loading &&
                !error &&
                users.map((user) => (
                  <Tr key={user.id}>
                    <Td>
                      <div className="font-semibold text-gray-800 dark:text-gray-100">
                        {user.nombre || "-"}
                      </div>
                    </Td>
                    <Td>
                      <div className="text-gray-700 dark:text-gray-300">
                        {user.apellido || "-"}
                      </div>
                    </Td>
                    <Td>
                      <div className="text-gray-700 dark:text-gray-300">
                        {user.email}
                      </div>
                    </Td>
                    <Td>
                      <div className="text-gray-700 dark:text-gray-300">
                        {user.cedula || "-"}
                      </div>
                    </Td>
                    <Td>
                      <div className="text-gray-700 dark:text-gray-300">
                        {formatCategoryLabel(
                          user.categoria?.nombre ?? user.categoriaCodigo
                        )}
                      </div>
                    </Td>
                    <Td className="w-[260px] max-w-[260px] whitespace-normal">
                      <div
                        className="block w-full truncate text-gray-700 dark:text-gray-300"
                        title={
                          getDisciplinaNames(user).length > 0
                            ? getDisciplinaNames(user).join(", ")
                            : undefined
                        }
                      >
                        {getDisciplinaNames(user).length > 0
                          ? getDisciplinaNames(user).join(", ")
                          : Array.isArray(user.disciplinas) &&
                            user.disciplinas.length > 0
                          ? `${user.disciplinas.length} disciplina(s)`
                          : "-"}
                      </div>
                    </Td>
                    <Td>
                      <div className="text-gray-700 dark:text-gray-300">
                        {formatRoles(user.roles)}
                      </div>
                    </Td>
                    <Td>
                      <div className="text-gray-700 dark:text-gray-300">
                        {(user.roles ?? []).some(
                          (role) =>
                            normalizeRoleCode(getRoleCode(role as RoleLike)) ===
                            "ENTRENADOR",
                        )
                          ? formatBoolean(user.puedeSolicitarReformas)
                          : "No aplica"}
                      </div>
                    </Td>
                    <Td>
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
                    </Td>
                  </Tr>
                ))}
            </TableBody>
        </Table>
    </TableContainer>
  );
}
