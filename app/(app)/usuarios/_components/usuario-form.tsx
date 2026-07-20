"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronDown, X } from "lucide-react";

import { ApiError } from "@/lib/api/client";
import { createUser, updateUser } from "@/lib/api/user";
import { getCatalog } from "@/lib/api/catalog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserFormValues,
  type UpdateUserFormValues,
  type UserFormValues,
} from "@/lib/validation/user";
import { CatalogItem } from "@/types/catalog";
import type { Role as RoleCatalog } from "@/types/role";
import type { Role, User } from "@/types/user";
import { formatRole } from "@/lib/utils/formatters";
import { normalizeRoleCode } from "@/lib/auth/roles";
import { useRoles } from "@/lib/hooks/use-catalog";
import {
  getCatalogItemId,
  resolveCatalogItemIdFromList,
} from "@/lib/utils/catalog";
import {
  getCategoryByCatalogValue,
  getCategoryIdOptions,
} from "@/lib/utils/categories";

const defaultRoleSelection: Role[] = [];

/** Nombre configurado del rol desde el catálogo; cae al código formateado. */
function roleLabelFromCatalog(role: Role, roles: RoleCatalog[]) {
  const match = roles.find(
    (r) => normalizeRoleCode(r.codigo) === normalizeRoleCode(role),
  );
  return match?.nombre?.trim() || formatRole(role);
}

const MAX_SELECTED_DISCIPLINAS = 3;
const MAX_SELECTED_ROLES = 3;

function buildDisciplinasLabel(
  selectedIds: number[],
  options: CatalogItem[],
  maxSelectedLabels = MAX_SELECTED_DISCIPLINAS,
) {
  if (selectedIds.length === 0) return "Selecciona disciplinas";

  const selectedNames = selectedIds
    .map((id) => options.find((option) => getCatalogItemId(option) === id)?.nombre)
    .filter((name): name is string => Boolean(name));

  if (selectedNames.length === 0) {
    return `${selectedIds.length} seleccionada(s)`;
  }

  if (selectedNames.length <= maxSelectedLabels) {
    return selectedNames.join(", ");
  }

  return `${selectedNames.slice(0, maxSelectedLabels).join(", ")} +${
    selectedNames.length - maxSelectedLabels
  }`;
}

function buildRolesLabel(
  selected: Role[],
  roles: RoleCatalog[],
  maxSelectedLabels = MAX_SELECTED_ROLES,
) {
  if (!selected || selected.length === 0) return "Selecciona roles";
  const labels = selected.map((r) => roleLabelFromCatalog(r, roles));
  if (labels.length <= maxSelectedLabels) {
    return labels.join(", ");
  }
  return `${labels.slice(0, maxSelectedLabels).join(", ")} +${
    labels.length - maxSelectedLabels
  }`;
}

function resolveInitialCategoriaId(
  user: User | null | undefined,
  categorias: CatalogItem[],
  fallback?: number,
) {
  if (fallback !== undefined && fallback > 0) return fallback;
  if (!user) return undefined;

  return (
    user.categoriaId ??
    user.categoria?.id ??
    getCategoryByCatalogValue(
      categorias,
      user.categoriaCodigo ?? user.categoria?.codigo ?? user.categoria?.nombre,
    )?.id ??
    resolveCatalogItemIdFromList(
      categorias,
      user.categoriaCodigo ?? user.categoria?.codigo,
    )
  );
}

function resolveInitialDisciplinaIds(
  user: User | null | undefined,
  disciplinas: CatalogItem[],
  fallback?: number[],
) {
  if (fallback && fallback.length > 0) return fallback;
  if (!user) return [];

  const fromDetalle = (user.disciplinasDetalle ?? [])
    .map((disciplina) => getCatalogItemId(disciplina))
    .filter((id): id is number => typeof id === "number");
  if (fromDetalle.length > 0) return fromDetalle;

  const fromArray = (user.disciplinas ?? [])
    .map((disciplina) =>
      typeof disciplina === "number" ? disciplina : getCatalogItemId(disciplina)
    )
    .filter((id): id is number => typeof id === "number");
  if (fromArray.length > 0) return fromArray;

  const primaryId = resolveCatalogItemIdFromList(
    disciplinas,
    user.disciplinaId ?? user.disciplina?.id ?? user.disciplinaCodigo ?? user.disciplina?.codigo,
  );

  return primaryId !== undefined ? [primaryId] : [];
}

type Props = {
  mode?: "create" | "edit";
  userId?: number;
  initialValues?: UpdateUserFormValues;
  initialUser?: User | null;
  onCreated?: () => Promise<void>;
  onUpdated?: () => Promise<void>;
};

export default function UsuarioForm({
  mode = "create",
  userId,
  initialValues,
  initialUser,
  onCreated,
  onUpdated,
}: Props) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [categorias, setCategorias] = useState<CatalogItem[]>([]);
  const [disciplinas, setDisciplinas] = useState<CatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [disciplinasOpen, setDisciplinasOpen] = useState(false);
  const [rolesOpen, setRolesOpen] = useState(false);
  const { roles: rolesCatalog, isLoading: rolesLoading } = useRoles();

  const schema = useMemo(
    () => (mode === "edit" ? updateUserSchema : createUserSchema),
    [mode],
  );

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors, isSubmitting },
    setError,
    setValue,
  } = useForm<UserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: initialValues?.nombre ?? "",
      apellido: initialValues?.apellido ?? "",
      email: initialValues?.email ?? "",
      password: "",
      cedula: initialValues?.cedula ?? "",
      ruc: initialValues?.ruc ?? "",
      usarRuc: initialValues?.usarRuc ?? false,
      genero: initialValues?.genero ?? "",
      categoriaId: initialValues?.categoriaId,
      disciplinaIds: initialValues?.disciplinaIds ?? [],
      roles: initialValues?.roles ?? defaultRoleSelection,
      puedeSolicitarReformas: initialValues?.puedeSolicitarReformas ?? false,
    },
  });

  const selectedRoles = watch("roles");
  const isEntrenador = selectedRoles.some(
    (role) => normalizeRoleCode(role) === "ENTRENADOR",
  );
  const categoriaOptions = useMemo(() => {
    const normalized = getCategoryIdOptions(categorias);
    if (!initialUser?.categoria?.id) return normalized;
    const exists = normalized.some((c) => c.id === initialUser.categoria?.id);
    return exists ? normalized : getCategoryIdOptions([initialUser.categoria, ...categorias]);
  }, [categorias, initialUser]);

  // sincronizar valores iniciales cuando llegan (edicion)
  useEffect(() => {
    if (!initialValues) return;
    if (catalogLoading) return;
    const normalizedCategoria = resolveInitialCategoriaId(
      initialUser,
      categorias,
      initialValues.categoriaId,
    );
    const normalizedDisciplinaIds = resolveInitialDisciplinaIds(
      initialUser,
      disciplinas,
      initialValues.disciplinaIds,
    );
    reset({
      ...initialValues,
      password: "",
      roles:
        initialValues.roles && initialValues.roles.length > 0
          ? initialValues.roles
          : defaultRoleSelection,
      puedeSolicitarReformas: initialValues.puedeSolicitarReformas ?? false,
      categoriaId: normalizedCategoria,
      disciplinaIds: normalizedDisciplinaIds,
    });
  }, [initialValues, initialUser, catalogLoading, reset, disciplinas, categorias]);

  useEffect(() => {
    if (isEntrenador) return;
    setValue("puedeSolicitarReformas", false, {
      shouldDirty: false,
      shouldValidate: true,
    });
  }, [isEntrenador, setValue]);

  // cargar catalogos de categorias y disciplinas
  useEffect(() => {
    const loadCatalog = async () => {
      try {
        setCatalogLoading(true);
        setCatalogError(null);
        const res = await getCatalog();
        const cats = res.data?.categorias ?? [];
        const discs = res.data?.disciplinas ?? [];
        setCategorias(cats);
        setDisciplinas(discs);
      } catch (err: any) {
        setCatalogError(
          err?.message ?? "No se pudieron cargar categorias/disciplinas.",
        );
        setCategorias([]);
        setDisciplinas([]);
      } finally {
        setCatalogLoading(false);
      }
    };

    void loadCatalog();
  }, []);

  const onSubmit = async (values: UserFormValues) => {
    setSubmitError(null);

    try {
      if (mode === "edit") {
        if (!userId) {
          throw new Error("No se pudo identificar el usuario a editar.");
        }
        const cleaned: UpdateUserFormValues = {
          ...values,
          password: values.password?.trim() || undefined,
        };

        await updateUser(userId, cleaned);
        if (onUpdated) {
          await onUpdated();
        }
      } else {
        const cleanedForCreate: CreateUserFormValues = {
          ...values,
          password: values.password?.trim() ?? "",
        } as CreateUserFormValues;

        await createUser(cleanedForCreate);
        reset({
          nombre: "",
          apellido: "",
          email: "",
          password: "",
          cedula: "",
          ruc: "",
          usarRuc: false,
          genero: "",
          categoriaId: undefined,
          disciplinaIds: [],
          roles: defaultRoleSelection,
          puedeSolicitarReformas: false,
        });
        if (onCreated) {
          await onCreated();
        }
      }
    } catch (err: unknown) {
      const fallback = `No se pudo ${
        mode === "edit" ? "actualizar" : "crear"
      } el usuario.`;
      let message = fallback;

      if (err instanceof ApiError) {
        const problem = err.problem;
        const detail =
          problem?.detail ?? problem?.title ?? err.message ?? fallback;
        if (problem?.field) {
          const fieldName =
            problem.field === "categoriaId" ||
            problem.field === "categoriaCodigo"
              ? "categoriaId"
              : problem.field === "disciplinaId" ||
                  problem.field === "disciplinaIds" ||
                  problem.field === "disciplinaCodigo" ||
                  problem.field === "disciplinaCodigos"
                ? "disciplinaIds"
                : (problem.field as keyof UserFormValues);
          setError(fieldName, { type: "server", message: detail });
        }
        message = detail;
      } else if (err instanceof Error) {
        message = err.message;
      }

      setSubmitError(message);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6 space-y-4"
    >
      <div className="flex items-start justify-between">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
          {mode === "edit" ? "Editar usuario" : "Crear usuario"}
        </h2>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="nombre">
            Nombre
          </label>
          <input
            id="nombre"
            className="form-input w-full"
            type="text"
            {...register("nombre")}
          />
          {errors.nombre && (
            <p className="mt-1 text-xs text-red-600">{errors.nombre.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="apellido">
            Apellido
          </label>
          <input
            id="apellido"
            className="form-input w-full"
            type="text"
            {...register("apellido")}
          />
          {errors.apellido && (
            <p className="mt-1 text-xs text-red-600">
              {errors.apellido.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className="form-input w-full"
            type="email"
            {...register("email")}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="password">
            Password {mode === "edit" && "(opcional)"}
          </label>
          <input
            id="password"
            className="form-input w-full"
            type="password"
            placeholder={
              mode === "edit" ? "Deja en blanco para no cambiarla" : undefined
            }
            {...register("password")}
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-600">
              {errors.password.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="cedula">
            Cedula
          </label>
          <input
            id="cedula"
            className="form-input w-full"
            type="text"
            inputMode="numeric"
            {...register("cedula")}
          />
          {errors.cedula && (
            <p className="mt-1 text-xs text-red-600">{errors.cedula.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="ruc">
            RUC
          </label>
          <input
            id="ruc"
            className="form-input w-full"
            type="text"
            inputMode="numeric"
            placeholder="13 dígitos"
            {...register("ruc")}
          />
          {errors.ruc && (
            <p className="mt-1 text-xs text-red-600">{errors.ruc.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="usarRuc">
            Usar RUC en documentos
          </label>
          <label className="inline-flex items-center gap-2 mt-2">
            <input
              id="usarRuc"
              type="checkbox"
              className="form-checkbox"
              {...register("usarRuc")}
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Sí, usar RUC
            </span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="genero">
            Género
          </label>
          <select
            id="genero"
            className="form-select w-full"
            {...register("genero")}
          >
            <option value="">Selecciona una opción</option>
            <option value="MASCULINO">Masculino</option>
            <option value="FEMENINO">Femenino</option>
            <option value="MASCULINO_FEMENINO">Ambos</option>
          </select>
          {errors.genero && (
            <p className="mt-1 text-xs text-red-600">{errors.genero.message}</p>
          )}
        </div>

        <Controller
          control={control}
          name="roles"
          render={({ field }) => (
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="roles">
                Roles
              </label>
              <Popover open={rolesOpen} onOpenChange={setRolesOpen}>
                <PopoverTrigger asChild>
                  <button
                    id="roles"
                    type="button"
                    className="form-select flex w-full items-center justify-between px-3 py-2 text-left"
                  >
                    <span className="truncate text-sm">
                      {buildRolesLabel((field.value ?? []) as Role[], rolesCatalog)}
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-[var(--radix-popover-trigger-width)] p-0"
                >
                  <div className="border-b border-gray-100 px-3 py-2 dark:border-gray-700/60">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Selecciona roles
                      </p>
                      {(field.value?.length ?? 0) > 0 ? (
                        <button
                          type="button"
                          onClick={() => field.onChange([])}
                          className="inline-flex items-center gap-1 text-xs text-gray-500 transition hover:text-violet-600 dark:text-gray-400 dark:hover:text-violet-300"
                        >
                          <X className="h-3.5 w-3.5" />
                          Limpiar
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="max-h-64 overflow-y-auto py-1">
                    {rolesLoading && rolesCatalog.length === 0 ? (
                      <p className="px-3 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                        Cargando roles...
                      </p>
                    ) : null}
                    {rolesCatalog.map((roleItem) => {
                      const role = roleItem.codigo as Role;
                      const selected = (field.value ?? []) as Role[];
                      const isChecked = selected.some(
                        (r) => normalizeRoleCode(r) === normalizeRoleCode(role),
                      );
                      return (
                        <button
                          key={roleItem.id}
                          type="button"
                          onClick={() => {
                            const next = isChecked
                              ? selected.filter(
                                  (r) =>
                                    normalizeRoleCode(r) !==
                                    normalizeRoleCode(role),
                                )
                              : [...selected, role];
                            field.onChange(next);
                          }}
                          className={[
                            "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition",
                            isChecked
                              ? "bg-violet-50 text-violet-900 dark:bg-violet-500/10 dark:text-violet-100"
                              : "text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700/40",
                          ].join(" ")}
                        >
                          <span
                            className={[
                              "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                              isChecked
                                ? "border-violet-500 bg-violet-500 text-white dark:border-violet-400 dark:bg-violet-400"
                                : "border-gray-300 bg-white text-transparent dark:border-gray-600 dark:bg-gray-800",
                            ].join(" ")}
                            aria-hidden="true"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </span>
                          <span className="truncate">
                            {roleLabelFromCatalog(role, rolesCatalog)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Asigna uno o varios roles. No puede quedar sin rol.
              </p>
              {errors.roles && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.roles.message}
                </p>
              )}
            </div>
          )}
        />

        {isEntrenador ? (
          <div className="md:col-span-2 rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-800/60 dark:bg-amber-950/20">
            <label
              htmlFor="puedeSolicitarReformas"
              className="flex items-start gap-3"
            >
              <input
                id="puedeSolicitarReformas"
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                {...register("puedeSolicitarReformas")}
              />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Puede solicitar reformas
                </p>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                  Habilita este permiso adicional para usuarios con rol
                  entrenador.
                </p>
              </div>
            </label>
          </div>
        ) : null}

        <div>
          <label
            className="block text-sm font-medium mb-1"
            htmlFor="categoriaId"
          >
            Categoria
          </label>
          <select
            id="categoriaId"
            className="form-select w-full"
            disabled={catalogLoading || !categoriaOptions.length}
            {...register("categoriaId", {
              setValueAs: (v) => {
                if (v === "" || v === null || v === undefined) return undefined;
                const parsed = Number(v);
                return Number.isFinite(parsed) ? parsed : undefined;
              },
            })}
          >
            <option value="">Selecciona una opcion</option>
            {categoriaOptions.map((c) => (
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

        <Controller
          control={control}
          name="disciplinaIds"
          render={({ field }) => {
            const selectedIds = field.value ?? [];
            const selectedLabel = buildDisciplinasLabel(
              selectedIds,
              disciplinas,
            );
            const allDisciplinaIds = disciplinas.map((disciplina) => disciplina.id);
            const allSelected =
              allDisciplinaIds.length > 0 &&
              allDisciplinaIds.every((id) => selectedIds.includes(id));

            return (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Disciplinas
                </label>
                <Popover
                  open={disciplinasOpen}
                  onOpenChange={setDisciplinasOpen}
                >
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      disabled={catalogLoading || !disciplinas.length}
                      className="form-select flex w-full items-center justify-between px-3 py-2 text-left "
                    >
                      <span className="truncate text-sm">{selectedLabel}</span>
                      <span className="flex items-center gap-2 shrink-0">
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    className="w-[var(--radix-popover-trigger-width)] p-0"
                  >
                    <div className="border-b border-gray-100 px-3 py-2 dark:border-gray-700/60">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          Selecciona disciplinas
                        </p>
                        {selectedIds.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => field.onChange([])}
                            className="inline-flex items-center gap-1 text-xs text-gray-500 transition hover:text-violet-600 dark:text-gray-400 dark:hover:text-violet-300"
                          >
                            <X className="h-3.5 w-3.5" />
                            Limpiar
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div className="max-h-64 overflow-y-auto py-1">
                      {disciplinas.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            field.onChange(allSelected ? [] : allDisciplinaIds);
                          }}
                          className={[
                            "flex w-full items-center gap-3 border-b border-gray-100 px-3 py-2.5 text-left text-sm font-medium transition dark:border-gray-700/60",
                            allSelected
                              ? "bg-violet-50 text-violet-900 dark:bg-violet-500/10 dark:text-violet-100"
                              : "text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700/40",
                          ].join(" ")}
                        >
                          <span
                            className={[
                              "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                              allSelected
                                ? "border-violet-500 bg-violet-500 text-white dark:border-violet-400 dark:bg-violet-400"
                                : "border-gray-300 bg-white text-transparent dark:border-gray-600 dark:bg-gray-800",
                            ].join(" ")}
                            aria-hidden="true"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </span>
                          <span className="truncate">
                            Todas las disciplinas
                          </span>
                        </button>
                      ) : null}

                      {(disciplinas ?? []).map((disciplina) => {
                        const isChecked = selectedIds.includes(disciplina.id);

                        return (
                          <button
                            key={disciplina.id}
                            type="button"
                            onClick={() => {
                              const nextValue = isChecked
                                ? selectedIds.filter((value) => value !== disciplina.id)
                                : [...selectedIds, disciplina.id];

                              field.onChange(nextValue);
                            }}
                            className={[
                              "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition",
                              isChecked
                                ? "bg-violet-50 text-violet-900 dark:bg-violet-500/10 dark:text-violet-100"
                                : "text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700/40",
                            ].join(" ")}
                          >
                            <span
                              className={[
                                "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                                isChecked
                                  ? "border-violet-500 bg-violet-500 text-white dark:border-violet-400 dark:bg-violet-400"
                                  : "border-gray-300 bg-white text-transparent dark:border-gray-600 dark:bg-gray-800",
                              ].join(" ")}
                              aria-hidden="true"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </span>
                            <span className="truncate">
                              {disciplina.nombre}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Selecciona una o varias disciplinas para este usuario.
                </p>
                {errors.disciplinaIds && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.disciplinaIds.message}
                  </p>
                )}
              </div>
            );
          }}
        />
      </div>

      {catalogError && <p className="text-sm text-red-600">{catalogError}</p>}

      {submitError && <p className="text-sm text-red-600">{submitError}</p>}

      <div className="flex justify-end pt-2 border-t border-gray-200 dark:border-gray-700/60">
        <button
          type="submit"
          disabled={isSubmitting || catalogLoading}
          className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white"
        >
          {isSubmitting
            ? "Guardando..."
            : mode === "edit"
              ? "Guardar cambios"
              : "Guardar usuario"}
        </button>
      </div>
    </form>
  );
}
