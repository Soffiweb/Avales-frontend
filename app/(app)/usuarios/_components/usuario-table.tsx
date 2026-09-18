"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { Eye, Pencil, Trash2, Users } from "lucide-react";

import {
  ExpandToggle,
  ExpandedRow,
  Table,
  TableBody,
  TableContainer,
  TableHead,
  Td,
  Th,
  Tr,
} from "@/components/ui/table";
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

/**
 * Columnas visibles, contando la del toggle y la de acciones.
 *
 * Lo usan también las filas de esqueleto, error y vacío: si queda
 * desincronizado con el `<tr>` del encabezado, esas filas ocupan un ancho
 * distinto al de la tabla y el borde del contenedor se rompe.
 */
const COLUMN_COUNT = 6;

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

/**
 * Texto de la celda de disciplinas.
 *
 * Cuando el backend manda solo los ids (sin nombre) no se puede listar nada,
 * pero decir "3 disciplina(s)" sigue siendo más útil que un guion: avisa que
 * el usuario tiene disciplinas asignadas aunque no se puedan nombrar.
 */
function formatDisciplinas(user: User) {
  const nombres = getDisciplinaNames(user);
  if (nombres.length > 0) return nombres.join(", ");
  if (Array.isArray(user.disciplinas) && user.disciplinas.length > 0) {
    return `${user.disciplinas.length} disciplina(s)`;
  }
  return "-";
}

/**
 * El permiso de reformas solo existe para entrenadores: para el resto de los
 * roles no es "No", es una pregunta que no aplica.
 */
function formatPermisoReforma(user: User) {
  const esEntrenador = (user.roles ?? []).some(
    (role) => normalizeRoleCode(getRoleCode(role as RoleLike)) === "ENTRENADOR",
  );
  return esEntrenador ? formatBoolean(user.puedeSolicitarReformas) : "No aplica";
}

/**
 * Nombre y apellido son un solo dato para quien lee el listado: partidos en
 * dos columnas ocupaban el doble de ancho sin agregar información, y el
 * buscador de la página ya busca sobre los dos campos juntos.
 */
function nombreCompleto(user: User) {
  return [user.nombre, user.apellido].filter(Boolean).join(" ").trim();
}

/** Par rótulo/valor de la grilla del desplegable. */
function Dato({
  termino,
  children,
}: {
  termino: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
        {termino}
      </dt>
      <dd className="mt-1 text-sm text-slate-700 dark:text-slate-200">
        {children}
      </dd>
    </div>
  );
}

export default function UsuarioTable({
  users,
  loading,
  error,
  onDelete,
}: Props) {
  const showEmpty = !loading && !error && users.length === 0;

  // Varias filas pueden estar abiertas a la vez: sirve para comparar dos
  // usuarios sin tener que cerrar uno para ver el otro.
  const [abiertos, setAbiertos] = useState<Set<number>>(new Set());

  const toggle = (id: number) =>
    setAbiertos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <TableContainer>
      {/* `table-fixed` + anchos explícitos: con `auto`, un email largo o un
          usuario con varios roles estiraban la tabla más allá del contenedor y
          aparecía el scroll horizontal que este listado quiere evitar. Con
          anchos fijos el texto se recorta y el dato completo vive en el
          desplegable. */}
      <Table className="table-fixed">
        <TableHead>
          <tr>
            <Th className="w-10" aria-label="Detalle" />
            {/* Sin ancho: el nombre se queda con el espacio sobrante porque es
                la columna con la que el usuario identifica la fila. */}
            <Th>Usuario</Th>
            <Th className="w-64">Email</Th>
            <Th className="w-32">Cédula</Th>
            <Th className="w-56">Roles</Th>
            <Th className="w-44">Acciones</Th>
          </tr>
        </TableHead>

        <TableBody>
          {loading &&
            Array.from({ length: 6 }).map((_, i) => (
              // Sin `Tr`: el hover marca la fila que el usuario está leyendo,
              // y en un esqueleto no hay nada que leer todavía.
              <tr key={`skeleton-${i}`} className="animate-pulse">
                {Array.from({ length: COLUMN_COUNT }).map((__, j) => (
                  <Td key={j} className="py-3">
                    <div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-700" />
                  </Td>
                ))}
              </tr>
            ))}

          {error && !loading && (
            <tr>
              <Td className="text-center text-red-500" colSpan={COLUMN_COUNT}>
                {error}
              </Td>
            </tr>
          )}

          {showEmpty && (
            <tr>
              <Td className="py-12 text-center" colSpan={COLUMN_COUNT}>
                <Users className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
                <p className="text-base text-slate-500 dark:text-slate-400">
                  No hay usuarios para mostrar.
                </p>
              </Td>
            </tr>
          )}

          {!loading &&
            !error &&
            users.map((user) => {
              const nombre = nombreCompleto(user);
              const abierto = abiertos.has(user.id);
              const roles = formatRoles(user.roles);

              return (
                <Fragment key={user.id}>
                  <Tr
                    className={abierto ? "bg-slate-50 dark:bg-slate-900/50" : ""}
                  >
                    <Td className="w-10 pr-0">
                      <ExpandToggle
                        expanded={abierto}
                        onToggle={() => toggle(user.id)}
                        label={`el usuario ${nombre || user.email}`}
                      />
                    </Td>

                    <Td>
                      <div
                        className="truncate font-semibold text-slate-800 dark:text-slate-100"
                        title={nombre || undefined}
                      >
                        {nombre || "-"}
                      </div>
                    </Td>

                    <Td className="truncate" title={user.email}>
                      {user.email}
                    </Td>

                    <Td className="truncate">{user.cedula || "-"}</Td>

                    <Td className="truncate" title={roles}>
                      {roles}
                    </Td>

                    <Td>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/settings/profile?id=${user.id}`}
                          className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700/70 text-slate-600 dark:text-slate-200 hover:border-indigo-300 hover:text-indigo-600 dark:hover:border-indigo-500/60 dark:hover:text-indigo-300 transition-colors"
                          aria-label={`Ver perfil de ${
                            user.nombre ?? user.email
                          }`}
                          title="Ver perfil"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/usuarios/${user.id}/editar`}
                          className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700/70 text-slate-600 dark:text-slate-200 hover:border-indigo-300 hover:text-indigo-600 dark:hover:border-indigo-500/60 dark:hover:text-indigo-300 transition-colors"
                          aria-label={`Editar ${user.nombre ?? user.email}`}
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => onDelete?.(user)}
                          className="h-9 w-9 inline-flex cursor-pointer items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700/70 text-slate-600 dark:text-slate-200 hover:border-rose-300 hover:text-rose-600 dark:hover:border-rose-500/60 dark:hover:text-rose-300 transition-colors"
                          aria-label={`Eliminar ${user.nombre ?? user.email}`}
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </Td>
                  </Tr>

                  {abierto && (
                    // Sin pie: este módulo no tiene pantalla de detalle
                    // (`/usuarios/[id]` no existe, solo `[id]/editar`), y un
                    // "Ver detalle completo" que abriera el formulario de
                    // edición prometería una cosa y haría otra. El acceso al
                    // perfil ya está en la columna de acciones de la fila.
                    <ExpandedRow colSpan={COLUMN_COUNT}>
                      <dl className="grid grid-cols-1 gap-x-10 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                        <Dato termino="Categoría">
                          {formatCategoryLabel(
                            user.categoria?.nombre ?? user.categoriaCodigo,
                          )}
                        </Dato>
                        <Dato termino="Disciplina">
                          {formatDisciplinas(user)}
                        </Dato>
                        <Dato termino="Permiso reforma">
                          {formatPermisoReforma(user)}
                        </Dato>
                      </dl>
                    </ExpandedRow>
                  )}
                </Fragment>
              );
            })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
