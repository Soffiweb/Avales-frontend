"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { getUser } from "@/lib/api/user";
import UsuarioForm from "../../_components/usuario-form";
import { type UpdateUserFormValues } from "@/lib/validation/user";
import type { Role, UserDisciplina } from "@/types/user";
import { getCatalogItemCode } from "@/lib/utils/catalog";

function extractDisciplinaCodigos(disciplinas?: UserDisciplina[]) {
  return (disciplinas ?? [])
    .map((disciplina) =>
      typeof disciplina === "number"
        ? String(disciplina)
        : getCatalogItemCode(disciplina)
    )
    .filter((codigo): codigo is string => Boolean(codigo));
}

export default function EditarUsuario() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const userId = useMemo(() => Number(params?.id), [params?.id]);

  const [initialValues, setInitialValues] =
    useState<UpdateUserFormValues | null>(null);
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

        const rolesFromUser: Role[] =
          (u.roles as Role[] | undefined) && u.roles?.length
            ? (u.roles as Role[])
            : [];
        const disciplinaCodigos = extractDisciplinaCodigos(u.disciplinas);
        const primaryDisciplinaCodigo =
          u.disciplinaCodigo ?? u.disciplina?.codigo ?? (u.disciplinaId ? String(u.disciplinaId) : "");
        const categoriaCodigo =
          u.categoriaCodigo ?? u.categoria?.codigo ?? (u.categoriaId ? String(u.categoriaId) : "");

        setInitialValues({
          nombre: u.nombre ?? "",
          apellido: u.apellido ?? "",
          email: u.email ?? "",
          password: "",
          cedula: u.cedula ?? "",
          categoriaCodigo,
          disciplinas: disciplinaCodigos.length
            ? disciplinaCodigos
            : primaryDisciplinaCodigo
              ? [primaryDisciplinaCodigo]
              : [],
          roles: rolesFromUser,
          puedeSolicitarReformas: u.puedeSolicitarReformas ?? false,
        });
      } catch (err: any) {
        setError(err?.message ?? "No se pudo cargar el usuario.");
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
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
}
