"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ChangeEvent, DragEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";

import { ApiError } from "@/lib/api/client";
import { getCatalog, getItemsPresupuestarios } from "@/lib/api/catalog";
import {
  createEvento,
  generateEventoCodigo,
  updateEvento,
} from "@/lib/api/eventos";
import { getCatalogItemCode, resolveCatalogItemCodeFromList } from "@/lib/utils/catalog";
import { eventoSchema, type EventoFormValues } from "@/lib/validation/evento";
import type { CatalogItem, CatalogItemPresupuestario } from "@/types/catalog";
import type { Evento } from "@/types/evento";
import {
  buildCreateEventoPayload,
  buildUpdateEventoPayloadFromForm,
  EMPTY_FORM_VALUES,
  getDefaultMesProgramado,
  mapEventoToFormValues,
  normalizeCategoriaCodigo,
  resolveCategoriaCatalogItem,
} from "./evento-form-helpers";

type UseEventoFormOptions = {
  mode?: "create" | "edit";
  evento?: Evento;
  onCreated?: () => Promise<void>;
  onUpdated?: () => Promise<void>;
};

export function useEventoForm({
  mode = "create",
  evento,
  onCreated,
  onUpdated,
}: UseEventoFormOptions) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [categorias, setCategorias] = useState<CatalogItem[]>([]);
  const [disciplinas, setDisciplinas] = useState<CatalogItem[]>([]);
  const [itemsCatalogo, setItemsCatalogo] = useState<CatalogItemPresupuestario[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [archivoPreview, setArchivoPreview] = useState<string | null>(null);
  const [draggingArchivo, setDraggingArchivo] = useState(false);

  const initialValues = useMemo<EventoFormValues>(() => {
    if (mode === "edit" && evento) {
      return mapEventoToFormValues(evento);
    }
    return EMPTY_FORM_VALUES;
  }, [evento, mode]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    reset,
    setError,
    setValue,
    getValues,
    watch,
  } = useForm<EventoFormValues>({
    resolver: zodResolver(eventoSchema),
    defaultValues: initialValues,
  });

  const [generatingCodigo, setGeneratingCodigo] = useState(false);
  const [generateCodigoError, setGenerateCodigoError] = useState<string | null>(
    null,
  );

  const handleGenerateCodigo = useCallback(async () => {
    setGenerateCodigoError(null);
    const values = getValues();
    const nombre = values.nombre?.toString().trim();
    const mesProgramado = values.mesProgramado;

    if (!nombre) {
      setGenerateCodigoError(
        "Primero ingresá el nombre del evento.",
      );
      return;
    }
    if (!mesProgramado || mesProgramado < 1 || mesProgramado > 12) {
      setGenerateCodigoError(
        "Primero seleccioná el mes programado.",
      );
      return;
    }

    try {
      setGeneratingCodigo(true);
      const { codigo } = await generateEventoCodigo({
        nombre,
        mesProgramado: Number(mesProgramado),
      });
      setValue("codigo", codigo, { shouldValidate: true, shouldDirty: true });
    } catch (err: unknown) {
      const message =
        err instanceof ApiError
          ? err.problem?.detail ?? err.problem?.title ?? err.message
          : err instanceof Error
            ? err.message
            : "No se pudo generar el código.";
      setGenerateCodigoError(message);
    } finally {
      setGeneratingCodigo(false);
    }
  }, [getValues, setValue]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "eventoItems",
  });

  const eventoItemsValues = watch("eventoItems") ?? [];

  const totalPresupuesto = useMemo(
    () =>
      eventoItemsValues.reduce(
        (sum, item) => sum + (item?.presupuesto || 0),
        0,
      ),
    [eventoItemsValues],
  );

  const totalPresupuestoFondosPublicos = useMemo(
    () =>
      eventoItemsValues.reduce(
        (sum, item) =>
          sum + (item?.fuente === "FONDOS_PUBLICOS" ? item?.presupuesto || 0 : 0),
        0,
      ),
    [eventoItemsValues],
  );

  const totalPresupuestoAutogestion = useMemo(
    () =>
      eventoItemsValues.reduce(
        (sum, item) =>
          sum + (item?.fuente === "AUTOGESTION" ? item?.presupuesto || 0 : 0),
        0,
      ),
    [eventoItemsValues],
  );

  useEffect(() => {
    if (mode !== "edit" || !evento || catalogLoading) {
      return;
    }
    reset({
      ...initialValues,
      categoriaCodigo: normalizeCategoriaCodigo(initialValues.categoriaCodigo),
      disciplinaCodigo: resolveCatalogItemCodeFromList(
        disciplinas,
        initialValues.disciplinaCodigo,
      ),
      mesProgramado: initialValues.mesProgramado ?? getDefaultMesProgramado(evento),
    });
  }, [catalogLoading, disciplinas, evento, initialValues, mode, reset]);

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        setCatalogLoading(true);
        setCatalogError(null);
        const [catalogRes, itemsRes] = await Promise.all([
          getCatalog(),
          getItemsPresupuestarios(),
        ]);
        setCategorias(catalogRes.data?.categorias ?? []);
        setDisciplinas(catalogRes.data?.disciplinas ?? []);
        setItemsCatalogo(itemsRes.data ?? []);
      } catch (err: unknown) {
        setCatalogError(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar categorias/disciplinas.",
        );
        setCategorias([]);
        setDisciplinas([]);
      } finally {
        setCatalogLoading(false);
      }
    };

    void loadCatalog();
  }, []);

  const removeFile = useCallback(() => {
    setArchivo(null);
    setArchivoPreview(null);
  }, []);

  const processArchivo = useCallback((file: File) => {
    const validTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      setSubmitError("Solo se permiten archivos JPG, PNG o PDF");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setSubmitError("El archivo no puede superar 5MB");
      return;
    }

    setArchivo(file);
    setSubmitError(null);

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setArchivoPreview(
          typeof reader.result === "string" ? reader.result : null,
        );
      };
      reader.readAsDataURL(file);
      return;
    }

    setArchivoPreview(null);
  }, []);

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) processArchivo(file);
    },
    [processArchivo],
  );

  const handleArchivoDragOver = useCallback(
    (event: DragEvent<HTMLLabelElement | HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setDraggingArchivo(true);
    },
    [],
  );

  const handleArchivoDragLeave = useCallback(
    (event: DragEvent<HTMLLabelElement | HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setDraggingArchivo(false);
    },
    [],
  );

  const handleArchivoDrop = useCallback(
    (event: DragEvent<HTMLLabelElement | HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setDraggingArchivo(false);
      const droppedFile = event.dataTransfer.files?.[0];
      if (droppedFile) processArchivo(droppedFile);
    },
    [processArchivo],
  );

  const onSubmit = useCallback(
    async (values: EventoFormValues) => {
      setSubmitError(null);

      const disciplina = disciplinas.find(
        (item) => getCatalogItemCode(item) === values.disciplinaCodigo,
      );
      const categoria = resolveCategoriaCatalogItem(
        categorias,
        values.categoriaCodigo,
      );

      try {
        if (mode === "edit") {
          if (!evento?.id) {
            throw new Error("No se pudo identificar el evento a editar.");
          }

          const updatePayload = buildUpdateEventoPayloadFromForm(
            values,
            disciplina?.id,
            categoria?.id,
          );
          if (!updatePayload) {
            setSubmitError("Completa los campos obligatorios del evento.");
            return;
          }

          await updateEvento(
            evento.id,
            updatePayload,
            archivo ?? undefined,
          );
          if (onUpdated) await onUpdated();
        } else {
          const payload = buildCreateEventoPayload(values);
          if (!payload) {
            setSubmitError("Completa los campos obligatorios del evento.");
            return;
          }

          await createEvento(payload, archivo ?? undefined);
          reset(EMPTY_FORM_VALUES);
          removeFile();
          if (onCreated) await onCreated();
        }
      } catch (err: unknown) {
        const fallback =
          mode === "edit"
            ? "No se pudo actualizar el evento. Intenta nuevamente."
            : "No se pudo crear el evento. Intenta nuevamente.";
        let message = fallback;

        if (err instanceof ApiError) {
          const problem = err.problem;
          const detail =
            problem?.detail ?? problem?.title ?? err.message ?? fallback;
          if (problem?.field) {
            const fieldName =
              problem.field === "categoriaId" ||
              problem.field === "categoriaCodigo"
                ? ("categoriaCodigo" as keyof EventoFormValues)
                : problem.field === "disciplinaId" ||
                    problem.field === "disciplinaCodigo"
                  ? ("disciplinaCodigo" as keyof EventoFormValues)
                  : problem.field === "mesProgramado"
                    ? ("mesProgramado" as keyof EventoFormValues)
                    : (problem.field as keyof EventoFormValues);
            setError(fieldName, { type: "server", message: detail });
          }
          message = detail;
        } else if (err instanceof Error) {
          message = err.message;
        }

        setSubmitError(message);
      }
    },
    [
      archivo,
      categorias,
      disciplinas,
      evento,
      mode,
      onCreated,
      onUpdated,
      removeFile,
      reset,
      setError,
    ],
  );

  const itemsByActividad = useMemo(() => {
    const groups: Record<string, CatalogItemPresupuestario[]> = {};
    for (const item of itemsCatalogo) {
      const key = item.actividad
        ? `${item.actividad.numero} - ${item.actividad.nombre}`
        : "Sin actividad";
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    return groups;
  }, [itemsCatalogo]);

  const buttonLabel = isSubmitting
    ? "Guardando..."
    : mode === "edit"
      ? "Guardar cambios"
      : "Guardar evento";

  const appendBudgetItem = useCallback(
    (fuente: "FONDOS_PUBLICOS" | "AUTOGESTION") => {
      append({
        itemId: 0,
        mes: 1,
        presupuesto: 0,
        fuente,
        montoComprometido: 0,
        montoEjecutado: 0,
      });
    },
    [append],
  );

  return {
    archivo,
    archivoPreview,
    append,
    appendBudgetItem,
    buttonLabel,
    catalogError,
    catalogLoading,
    categorias,
    control,
    disciplinas,
    draggingArchivo,
    errors,
    fields,
    generateCodigoError,
    generatingCodigo,
    handleArchivoDragLeave,
    handleArchivoDragOver,
    handleArchivoDrop,
    handleFileChange,
    handleGenerateCodigo,
    handleSubmit,
    isSubmitting,
    itemsByActividad,
    mode,
    onSubmit,
    eventoItemsValues,
    register,
    remove,
    removeFile,
    submitError,
    totalPresupuestoAutogestion,
    totalPresupuestoFondosPublicos,
    totalPresupuesto,
  };
}
