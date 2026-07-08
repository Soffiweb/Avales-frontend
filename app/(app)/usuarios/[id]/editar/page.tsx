"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { getUser } from "@/lib/api/user";
import UsuarioForm from "../../_components/usuario-form";
import { type UpdateUserFormValues } from "@/lib/validation/user";
import type { Role, RoleLike, User, UserDisciplina } from "@/types/user";
import { getCatalogItemId } from "@/lib/utils/catalog";
import { canonicalizeRoleCode, getRoleCode } from "@/lib/auth/roles";

function extractDisciplinaIds(disciplinas?: UserDisciplina[]) {
  return (disciplinas ?? [])
    .map((disciplina) =>
      typeof disciplina === "number"
        ? disciplina
        : getCatalogItemId(disciplina),
    )
    .filter((id): id is number => typeof id === "number");
}

export default function EditarUsuario() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const userId = useMemo(() => Number(params?.id), [params?.id]);

  const [initialValues, setInitialValues] =
    useState<UpdateUserFormValues | null>(null);
  const [initialUser, setInitialUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params?.id || Number.isNaN(userId)) {
      setError("ID de usuario invalido.");
      setLoading(false);
      return;
    }

    const loadUser = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getUser(userId);
        const u = res.data;
        if (!u) {
          throw new Error("Usuario no encontrado.");
        }

        const rolesFromUser: Role[] = (u.roles ?? []).map((role) =>
          canonicalizeRoleCode(getRoleCode(role as RoleLike)),
        );
        const disciplinaIds = extractDisciplinaIds(u.disciplinas);
        const primaryDisciplinaId =
          u.disciplinaId ?? u.disciplina?.id ?? undefined;
        const categoriaId = u.categoriaId ?? u.categoria?.id ?? 0;

        setInitialUser(u);
        setInitialValues({
          nombre: u.nombre ?? "",
          apellido: u.apellido ?? "",
          email: u.email ?? "",
          password: "",
          cedula: u.cedula ?? "",
          ruc: u.ruc ?? "",
          usarRuc: u.usarRuc ?? false,
          genero: u.genero ?? "",
          categoriaId,
          disciplinaIds: disciplinaIds.length
            ? disciplinaIds
            : primaryDisciplinaId
              ? [primaryDisciplinaId]
              : [],
          roles: rolesFromUser,
          puedeSolicitarReformas: u.puedeSolicitarReformas ?? false,
        });
      } catch (err: any) {
        setError(err?.message ?? "No se pudo cargar el usuario.");
        setInitialUser(null);
      } finally {
        setLoading(false);
      }
    };

    void loadUser();
  }, [params?.id, userId]);

  const handleUpdated = async () => {
    router.push("/usuarios?status=updated");
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-[96rem] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">
          Editar usuario
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Actualiza la informacion del usuario. El usuario no puede quedarse sin
          al menos un rol.
        </p>
      </div>

      {loading && (
        <div className="text-sm text-gray-600 dark:text-gray-300">
          Cargando usuario...
        </div>
      )}

      {error && !loading && <div className="text-sm text-red-600">{error}</div>}

      {!loading && !error && initialValues && (
        <UsuarioForm
          mode="edit"
          userId={userId}
          initialValues={initialValues}
          initialUser={initialUser}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
}
