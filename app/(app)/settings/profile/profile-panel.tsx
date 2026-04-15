"use client";

import { useEffect, useState } from "react";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useAuth } from "@/app/providers/auth-provider";
import { profileSchema, type ProfileFormValues } from "@/lib/validation/user";
import { getUser, updateProfile } from "@/lib/api/user";
import { getCatalog } from "@/lib/api/catalog";
import { CatalogItem } from "@/types/catalog";
import type { User } from "@/types/user";
import { formatBoolean, formatRoles } from "@/lib/utils/formatters";
import {
  getCatalogItemId,
  resolveCatalogItemIdFromList,
} from "@/lib/utils/catalog";

type Props = {
  viewUserId?: number;
};

function getPrimaryCategoriaId(user: User | null, categorias: CatalogItem[]) {
  if (!user) return undefined;

  return (
    user.categoriaId ??
    user.categoria?.id ??
    resolveCatalogItemIdFromList(
      categorias,
      user.categoriaCodigo ?? user.categoria?.codigo,
    )
  );
}

function getPrimaryDisciplinaId(user: User | null, disciplinas: CatalogItem[]) {
  if (!user) return undefined;

  const fromArray = (user.disciplinasDetalle ?? [])
    .map((disciplina) => getCatalogItemId(disciplina))
    .find((id): id is number => typeof id === "number");

  if (fromArray !== undefined) return fromArray;

  const fromLegacyArray = (user.disciplinas ?? [])
    .map((disciplina) =>
      typeof disciplina === "number" ? disciplina : getCatalogItemId(disciplina),
    )
    .find((id): id is number => typeof id === "number");

  if (fromLegacyArray !== undefined) return fromLegacyArray;

  return resolveCatalogItemIdFromList(
    disciplinas,
    user.disciplinaId ?? user.disciplina?.id ?? user.disciplinaCodigo ?? user.disciplina?.codigo,
  );
}

export default function ProfilePanel({ viewUserId }: Props) {
  const { user, loading, error, refreshUser } = useAuth();

  const [saveMsg, setSaveMsg] = useState("");
  const [categorias, setCategorias] = useState<CatalogItem[]>([]);
  const [disciplinas, setDisciplinas] = useState<CatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [initialValues, setInitialValues] = useState<ProfileFormValues | null>(
    null
  );
  const [subjectUser, setSubjectUser] = useState<User | null>(null);
  const [subjectLoading, setSubjectLoading] = useState(false);
  const [subjectError, setSubjectError] = useState<string | null>(null);

  const isReadOnly =
    viewUserId !== undefined &&
    user?.id !== undefined &&
    user.id !== viewUserId;

  /* =========================
     Cargar catálogo
     ========================= */
  useEffect(() => {
    const load = async () => {
      try {
        const res = await getCatalog();
        setCategorias(res.data?.categorias ?? []);
        setDisciplinas(res.data?.disciplinas ?? []);
      } catch (err) {
        console.error("Error cargando catálogo", err);
        setCategorias([]);
        setDisciplinas([]);
      } finally {
        setCatalogLoading(false);
      }
    };

    void load();
  }, []);

  /* =========================
     React Hook Form
     ========================= */
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    mode: "onBlur",
  });

  /* =========================
     Resolver usuario a mostrar
     ========================= */
  useEffect(() => {
    const targetId = viewUserId ?? user?.id;
    if (!targetId) return;

    if (user && user.id === targetId) {
      setSubjectUser(user);
      setSubjectError(null);
      setSubjectLoading(false);
      return;
    }

    const load = async () => {
      try {
        setSubjectLoading(true);
        setSubjectError(null);
        const res = await getUser(targetId);
        setSubjectUser(res.data ?? null);
        if (!res.data) {
          setSubjectError("Usuario no encontrado.");
        }
      } catch (err: any) {
        setSubjectError(
          err?.message ?? "No se pudo cargar el perfil solicitado."
        );
        setSubjectUser(null);
      } finally {
        setSubjectLoading(false);
      }
    };

    void load();
  }, [viewUserId, user]);

  /* =========================
     Sincronizar user + catálogo
     ========================= */
  useEffect(() => {
    if (!subjectUser) return;
    if (catalogLoading) return;
    if (!categorias.length || !disciplinas.length) return;

    const nextValues: ProfileFormValues = {
      nombre: subjectUser.nombre ?? "",
      apellido: subjectUser.apellido ?? "",
      email: subjectUser.email ?? "",
      cedula: subjectUser.cedula ?? "",
      categoriaId: getPrimaryCategoriaId(subjectUser, categorias),
      disciplinaId: getPrimaryDisciplinaId(subjectUser, disciplinas),
    };

    reset(nextValues);

    // fija los valores "por defecto" para Cancelar (solo la primera vez)
    setInitialValues((prev) => prev ?? nextValues);
  }, [subjectUser, categorias, disciplinas, catalogLoading, reset]);

  /* =========================
     Submit
     ========================= */
  const onSubmit = async (values: ProfileFormValues) => {
    if (!user) return;
    if (isReadOnly) return;

    setSaveMsg("");

    try {
      await updateProfile(values);
      await refreshUser();
      reset(values);
      setInitialValues(values);
      setSaveMsg("Cambios guardados correctamente.");
    } catch (e: any) {
      setSaveMsg(e?.message ?? "No se pudo actualizar el perfil.");
    }
  };

  /* =========================
     Estados base
     ========================= */
  if (loading || subjectLoading) return <div className="grow p-6">Cargando.</div>;
  if (error || subjectError)
    return (
      <div className="grow p-6 text-red-600">
        {error ?? subjectError ?? "No se pudo cargar el perfil."}
      </div>
    );
  if (!user && !subjectUser)
    return <div className="grow p-6">No hay sesión activa.</div>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grow">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl text-gray-800 dark:text-gray-100 font-bold">
            {isReadOnly ? "Perfil" : "Mi cuenta"}
          </h2>
          {isReadOnly && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
              Solo lectura
            </span>
          )}
        </div>

        {/* Datos básicos */}
        <section>
          <h2 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-1">
            Perfil
          </h2>

          <div className="sm:flex sm:items-start space-y-4 sm:space-y-0 sm:space-x-4 mt-5">
            <div className="sm:w-1/3">
              <label
                className="block text-sm font-medium mb-1"
                htmlFor="nombre"
              >
                Nombre
              </label>
              <input
                id="nombre"
                className="form-input w-full"
                type="text"
                disabled={isReadOnly}
                {...register("nombre")}
              />
              {errors.nombre && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.nombre.message}
                </p>
              )}
            </div>

            <div className="sm:w-1/3">
              <label
                className="block text-sm font-medium mb-1"
                htmlFor="apellido"
              >
                Apellido
              </label>
              <input
                id="apellido"
                className="form-input w-full"
                type="text"
                disabled={isReadOnly}
                {...register("apellido")}
              />
              {errors.apellido && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.apellido.message}
                </p>
              )}
            </div>

            <div className="sm:w-1/3">
              <label
                className="block text-sm font-medium mb-1"
                htmlFor="cedula"
              >
                Cédula
              </label>
              <input
                id="cedula"
                className="form-input w-full"
                type="text"
                inputMode="numeric"
                disabled={isReadOnly}
                {...register("cedula")}
              />
              {errors.cedula && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.cedula.message}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Email */}
        <section>
          <h2 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-1">
            Email
          </h2>

          <div className="flex flex-wrap mt-5">
            <div className="mr-2 grow sm:grow-0">
              <label className="sr-only" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                className="form-input w-full sm:w-auto"
                type="email"
                disabled={isReadOnly}
                {...register("email")}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.email.message}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Asignación */}
        <section>
          <h2 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-1">
            Asignación
          </h2>

          <div className="sm:flex sm:items-start space-y-4 sm:space-y-0 sm:space-x-4 mt-5">
            {/* Categoría */}
            <div className="sm:w-1/3">
              <label
                className="block text-sm font-medium mb-1"
                htmlFor="categoriaId"
              >
                Categoría
              </label>

              <select
                id="categoriaId"
                className="form-select w-full"
                disabled={catalogLoading || isReadOnly}
                {...register("categoriaId", {
                  setValueAs: (v) => {
                    if (v === "" || v === null || v === undefined) return undefined;
                    const parsed = Number(v);
                    return Number.isFinite(parsed) ? parsed : undefined;
                  },
                })}
              >
                <option value="">Seleccione una categoría</option>
                {(categorias ?? []).map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.nombre}
                  </option>
                ))}
              </select>

              {errors.categoriaId && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.categoriaId.message}
                </p>
              )}
            </div>

            {/* Disciplina */}
            <div className="sm:w-1/3">
              <label
                className="block text-sm font-medium mb-1"
                htmlFor="disciplinaId"
              >
                Disciplina
              </label>

              <select
                id="disciplinaId"
                className="form-select w-full"
                disabled={catalogLoading || isReadOnly}
                {...register("disciplinaId", {
                  setValueAs: (v) => {
                    if (v === "" || v === null || v === undefined) return undefined;
                    const parsed = Number(v);
                    return Number.isFinite(parsed) ? parsed : undefined;
                  },
                })}
              >
                <option value="">Seleccione una disciplina</option>
                {disciplinas.map((d) => (
                  <option key={d.id} value={String(d.id)}>
                    {d.nombre}
                  </option>
                ))}
              </select>

              {errors.disciplinaId && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.disciplinaId.message}
                </p>
              )}
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-1">
            Permisos
          </h2>

          <div className="grid gap-4 mt-5 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/70">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Roles
              </p>
              <p className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                {formatRoles(subjectUser?.roles)}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/70">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Puede solicitar reformas
              </p>
              <p className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                {subjectUser?.roles?.includes("ENTRENADOR")
                  ? formatBoolean(subjectUser.puedeSolicitarReformas)
                  : "No aplica"}
              </p>
            </div>
          </div>
        </section>
      </div>

      {!isReadOnly && (
        <footer>
          <div className="flex flex-col px-6 py-5 border-t border-gray-200 dark:border-gray-700/60">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {saveMsg}
              </div>

              <div className="flex self-end">
                <button
                  type="button"
                  onClick={() => initialValues && reset(initialValues)}
                  disabled={isSubmitting || !initialValues}
                  className="btn dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={!isDirty || isSubmitting}
                  className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white ml-3"
                >
                  {isSubmitting ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </div>
          </div>
        </footer>
      )}
    </form>
  );
}
