"use client";

import { EVENTO_CATEGORIA_OPTIONS, normalizeEventoTipoParticipacion } from "@/lib/constants";
import { getCanonicalCategory, normalizeCategoryValue } from "@/lib/utils/categories";
import { getCatalogItemCode } from "@/lib/utils/catalog";
import { formatDateInput } from "@/lib/utils/formatters/dates";
import type { CatalogItem } from "@/types/catalog";
import type { Evento } from "@/types/evento";
import type { CreateEventoPayload, EventoFormValues } from "@/lib/validation/evento";
import type { UpdateEventoPayload } from "@/lib/api/eventos";

export const EMPTY_FORM_VALUES: EventoFormValues = {
  codigo: "",
  tipoParticipacion: normalizeEventoTipoParticipacion(undefined) ?? "",
  tipoEvento: "",
  nombre: "",
  lugar: "",
  genero: undefined as unknown as EventoFormValues["genero"],
  disciplinaCodigo: "",
  categoriaCodigo: "",
  mesProgramado: new Date().getMonth() + 1,
  provincia: "",
  ciudad: "",
  pais: "Ecuador",
  alcance: "",
  fechaInicio: "",
  fechaFin: "",
  numEntrenadoresHombres: 0,
  numEntrenadoresMujeres: 0,
  numAtletasHombres: 0,
  numAtletasMujeres: 0,
  eventoItems: [],
};

export function getDefaultMesProgramado(evento?: Evento | null) {
  if (evento?.mesProgramado) return evento.mesProgramado;
  if (evento?.fechaInicio) {
    const start = new Date(evento.fechaInicio);
    if (!Number.isNaN(start.getTime())) {
      return start.getMonth() + 1;
    }
  }
  return new Date().getMonth() + 1;
}

export function normalizeCategoriaCodigo(value?: string | null) {
  const normalized = normalizeCategoryValue(value);
  const match = EVENTO_CATEGORIA_OPTIONS.find(
    (option) => normalizeCategoryValue(option.value) === normalized,
  );
  return match?.value ?? "";
}

export function resolveCategoriaCatalogItem(
  categorias: CatalogItem[],
  categoriaCodigo: string,
) {
  const normalizedValue = normalizeCategoryValue(categoriaCodigo);
  return categorias.find((item) => {
    const normalizedCode = normalizeCategoryValue(item.codigo);
    const normalizedName = normalizeCategoryValue(item.nombre);
    return (
      normalizedCode === normalizedValue ||
      normalizedName === normalizedValue ||
      String(item.id) === categoriaCodigo
    );
  });
}

export function mapEventoToFormValues(evento: Evento): EventoFormValues {
  return {
    codigo: evento.codigo ?? "",
    tipoParticipacion:
      normalizeEventoTipoParticipacion(evento.tipoParticipacion) ?? "",
    tipoEvento: evento.tipoEvento ?? "",
    nombre: evento.nombre ?? "",
    lugar: evento.lugar ?? "",
    genero: evento.genero ?? (undefined as unknown as EventoFormValues["genero"]),
    disciplinaCodigo:
      evento.disciplinaCodigo ??
      evento.disciplina?.codigo ??
      (evento.disciplinaId ? String(evento.disciplinaId) : ""),
    categoriaCodigo: normalizeCategoriaCodigo(
      evento.categoriaCodigo ??
        evento.categoria?.codigo ??
        evento.categoria?.nombre ??
        (evento.categoriaId ? String(evento.categoriaId) : ""),
    ),
    mesProgramado: getDefaultMesProgramado(evento),
    provincia: evento.provincia ?? "",
    ciudad: evento.ciudad ?? "",
    pais: evento.pais ?? "Ecuador",
    alcance: evento.alcance ?? "",
    fechaInicio: formatDateInput(evento.fechaInicio),
    fechaFin: formatDateInput(evento.fechaFin),
    numEntrenadoresHombres: evento.numEntrenadoresHombres ?? 0,
    numEntrenadoresMujeres: evento.numEntrenadoresMujeres ?? 0,
    numAtletasHombres: evento.numAtletasHombres ?? 0,
    numAtletasMujeres: evento.numAtletasMujeres ?? 0,
    eventoItems:
      evento.eventoItems?.map((item) => ({
        itemId: item.item.id,
        mes: item.mes,
        presupuesto: Number.parseFloat(item.presupuesto) || 0,
        fuente: item.fuente ?? "FONDOS_PUBLICOS",
        montoComprometido: Number.parseFloat(item.montoComprometido ?? "0") || 0,
        montoEjecutado: Number.parseFloat(item.montoEjecutado ?? "0") || 0,
      })) ?? [],
  };
}

export function buildCreateEventoPayload(
  values: EventoFormValues,
): CreateEventoPayload | null {
  const tipoParticipacion =
    normalizeEventoTipoParticipacion(values.tipoParticipacion) ?? undefined;
  const categoriaCodigo = getCanonicalCategory(values.categoriaCodigo);

  if (
    !tipoParticipacion ||
    !values.tipoEvento ||
    !values.genero ||
    !categoriaCodigo ||
    !values.alcance
  ) {
    return null;
  }

  return {
    codigo: values.codigo.trim(),
    tipoParticipacion,
    tipoEvento: values.tipoEvento.trim(),
    nombre: values.nombre.trim(),
    lugar: values.lugar.trim(),
    genero: values.genero,
    disciplinaCodigo: values.disciplinaCodigo,
    categoriaCodigo,
    mesProgramado: values.mesProgramado,
    provincia: values.provincia.trim(),
    ciudad: values.ciudad.trim(),
    pais: values.pais.trim(),
    alcance: values.alcance.trim(),
    fechaInicio: values.fechaInicio?.trim()
      ? formatDateInput(values.fechaInicio)
      : null,
    fechaFin: values.fechaFin?.trim() ? formatDateInput(values.fechaFin) : null,
    numEntrenadoresHombres: values.numEntrenadoresHombres,
    numEntrenadoresMujeres: values.numEntrenadoresMujeres,
    numAtletasHombres: values.numAtletasHombres,
    numAtletasMujeres: values.numAtletasMujeres,
    eventoItems: values.eventoItems?.length ? values.eventoItems : undefined,
  };
}

export function buildUpdateEventoPayload(
  payload: CreateEventoPayload,
  disciplinaId?: number,
  categoriaId?: number,
): UpdateEventoPayload {
  return {
    codigo: payload.codigo,
    tipoParticipacion: payload.tipoParticipacion,
    tipoEvento: payload.tipoEvento,
    nombre: payload.nombre,
    lugar: payload.lugar,
    genero: payload.genero,
    disciplinaId,
    categoriaId,
    mesProgramado: payload.mesProgramado,
    provincia: payload.provincia,
    ciudad: payload.ciudad,
    pais: payload.pais,
    alcance: payload.alcance,
    fechaInicio: payload.fechaInicio,
    fechaFin: payload.fechaFin,
    numEntrenadoresHombres: payload.numEntrenadoresHombres,
    numEntrenadoresMujeres: payload.numEntrenadoresMujeres,
    numAtletasHombres: payload.numAtletasHombres,
    numAtletasMujeres: payload.numAtletasMujeres,
    eventoItems: payload.eventoItems,
  };
}

export function buildUpdateEventoPayloadFromForm(
  values: EventoFormValues,
  disciplinaId?: number,
  categoriaId?: number,
): UpdateEventoPayload | null {
  const tipoParticipacion =
    normalizeEventoTipoParticipacion(values.tipoParticipacion) ?? undefined;

  if (!tipoParticipacion || !values.tipoEvento || !values.genero) {
    return null;
  }

  return {
    codigo: values.codigo.trim(),
    tipoParticipacion,
    tipoEvento: values.tipoEvento.trim(),
    nombre: values.nombre.trim(),
    lugar: values.lugar.trim(),
    genero: values.genero,
    disciplinaId,
    categoriaId: categoriaId ?? null,
    mesProgramado: values.mesProgramado,
    provincia: values.provincia.trim(),
    ciudad: values.ciudad.trim(),
    pais: values.pais.trim(),
    alcance: values.alcance.trim() ? values.alcance.trim() : null,
    fechaInicio: values.fechaInicio?.trim()
      ? formatDateInput(values.fechaInicio)
      : null,
    fechaFin: values.fechaFin?.trim() ? formatDateInput(values.fechaFin) : null,
    numEntrenadoresHombres: values.numEntrenadoresHombres,
    numEntrenadoresMujeres: values.numEntrenadoresMujeres,
    numAtletasHombres: values.numAtletasHombres,
    numAtletasMujeres: values.numAtletasMujeres,
    eventoItems: values.eventoItems?.length ? values.eventoItems : undefined,
  };
}

export function parseIntegerInput(value: unknown) {
  return Number(String(value).replace(/\D/g, "")) || 0;
}

export function parseDecimalInput(value: unknown) {
  const clean = String(value).replace(/[^\d.]/g, "");
  const noMultipleDots = clean.replace(/\.(?=.*\.)/g, "");
  return Number(noMultipleDots) || 0;
}
