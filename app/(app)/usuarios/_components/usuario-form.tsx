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
import type { Role } from "@/types/user";
import { formatRole } from "@/lib/utils/formatters";
import {
  getCatalogItemCode,
  resolveCatalogItemCodeFromList,
} from "@/lib/utils/catalog";

const ROLE_OPTIONS: Role[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "SECRETARIA",
  "DTM",
  "METODOLOGO",
  "ENTRENADOR",
  "USUARIO",
  "DEPORTISTA",
  "PDA",
  "COMPRAS_PUBLICAS",
  "FINANCIERO",
];

const defaultRoleSelection: Role[] = [];

const formatRoleLabel = (role: Role) => formatRole(role);

const MAX_SELECTED_DISCIPLINAS = 3;

function buildDisciplinasLabel(
  selectedCodes: string[],
  options: CatalogItem[],
  maxSelectedLabels = MAX_SELECTED_DISCIPLINAS,
) {
  if (selectedCodes.length === 0) return "Selecciona disciplinas";

  const selectedNames = selectedCodes
    .map(
      (code) =>
        options.find((option) => getCatalogItemCode(option) === code)?.nombre,
    )
    .filter((name): name is string => Boolean(name));

  if (selectedNames.length === 0) {
    return `${selectedCodes.length} seleccionada(s)`;
  }

  if (selectedNames.length <= maxSelectedLabels) {
    return selectedNames.join(", ");
  }

  return `${selectedNames.slice(0, maxSelectedLabels).join(", ")} +${
    selectedNames.length - maxSelectedLabels
  }`;
}

type Props = {
  mode?: "create" | "edit";
  userId?: number;
  initialValues?: UpdateUserFormValues;
  onCreated?: () => Promise<void>;
  onUpdated?: () => Promise<void>;
};

export default function UsuarioForm({
  mode = "create",
  userId,
  initialValues,
  onCreated,
  onUpdated,
}: Props) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [categorias, setCategorias] = useState<CatalogItem[]>([]);
  const [disciplinas, setDisciplinas] = useState<CatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [disciplinasOpen, setDisciplinasOpen] = useState(false);

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
      genero: initialValues?.genero ?? "",
      categoriaCodigo: initialValues?.categoriaCodigo ?? "",
      disciplinas: initialValues?.disciplinas ?? [],
      roles: initialValues?.roles ?? defaultRoleSelection,
      puedeSolicitarReformas: initialValues?.puedeSolicitarReformas ?? false,
    },
  });

  const selectedRoles = watch("roles");
  const isEntrenador = selectedRoles.includes("ENTRENADOR");

  // sincronizar valores iniciales cuando llegan (edicion)
  useEffect(() => {
    if (!initialValues) return;
    if (catalogLoading) return;
    const normalizedDisciplinas = (initialValues.disciplinas ?? []).map((value) =>
      resolveCatalogItemCodeFromList(disciplinas, value),
    );
    const normalizedCategoria = resolveCatalogItemCodeFromList(
      categorias,
      initialValues.categoriaCodigo,
    );
    reset({
      ...initialValues,
      password: "",
      roles:
        initialValues.roles && initialValues.roles.length > 0
          ? initialValues.roles
          : defaultRoleSelection,
      puedeSolicitarReformas: initialValues.puedeSolicitarReformas ?? false,
      categoriaCodigo: normalizedCategoria,
      disciplinas: normalizedDisciplinas,
    });
  }, [initialValues, catalogLoading, reset, disciplinas, categorias]);

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
          password: values.password?.trim()
            ? values.password.trim()
            : undefined,
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
        genero: "",
        categoriaCodigo: "",
        disciplinas: [],
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
              ? "categoriaCodigo"
              : problem.field === "disciplinaId" ||
                  problem.field === "disciplinaCodigo" ||
                  problem.field === "disciplinaCodigos"
                ? "disciplinas"
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
            <option value="MASCULINO_FEMENINO">Masculino/Femenino</option>
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
              <select
                id="roles"
                className="form-select w-full"
                value={field.value[0] ?? ""}
                onChange={(e) =>
                  field.onChange(
                    e.target.value ? ([e.target.value] as Role[]) : [],
                  )
                }
              >
                <option value="">Selecciona una opcion</option>
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {formatRoleLabel(role)}
                  </option>
                ))}
              </select>
              <div className="mt-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Selecciona una opcion para asignar rol. No puede quedar sin
                  rol.
                </p>
              </div>
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
            htmlFor="categoriaCodigo"
          >
            Categoria
          </label>
          <select
            id="categoriaCodigo"
            className="form-select w-full"
            disabled={catalogLoading || !categorias.length}
            {...register("categoriaCodigo", {
              setValueAs: (v) => String(v),
            })}
          >
            <option value="">Selecciona una opcion</option>
            {(categorias ?? []).map((c) => (
              <option key={c.id} value={getCatalogItemCode(c)}>
                {c.nombre}
              </option>
            ))}
          </select>
          {errors.categoriaCodigo && (
            <p className="mt-1 text-xs text-red-600">
              {errors.categoriaCodigo.message}
            </p>
          )}
        </div>

        <Controller
          control={control}
          name="disciplinas"
          render={({ field }) => {
            const selectedCodes = field.value ?? [];
            const selectedLabel = buildDisciplinasLabel(
              selectedCodes,
              disciplinas,
            );
            const allDisciplinaCodes = disciplinas.map(
              (disciplina) => getCatalogItemCode(disciplina),
            );
            const allSelected =
              allDisciplinaCodes.length > 0 &&
              allDisciplinaCodes.every((code) => selectedCodes.includes(code));

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
                        {selectedCodes.length > 0 ? (
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
                            field.onChange(allSelected ? [] : allDisciplinaCodes);
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
                        const code = getCatalogItemCode(disciplina);
                        const isChecked = selectedCodes.includes(code);

                        return (
                          <button
                            key={disciplina.id}
                            type="button"
                            onClick={() => {
                              const nextValue = isChecked
                                ? selectedCodes.filter((value) => value !== code)
                                : [...selectedCodes, code];

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
                {errors.disciplinas && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.disciplinas.message}
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
