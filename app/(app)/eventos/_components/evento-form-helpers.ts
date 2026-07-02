"use client";

import {
  EVENTO_CATEGORIA_OPTIONS,
  normalizeEventoAlcance,
  normalizeEventoTipoEvento,
  normalizeEventoTipoParticipacion,
} from "@/lib/constants";
import {
  getCanonicalCategory,
  getCategoryByCatalogValue,
  normalizeCategoryValue,
} from "@/lib/utils/categories";
import { getCatalogItemCode } from "@/lib/utils/catalog";
import { formatDateInput, getCalendarMonth } from "@/lib/utils/formatters/dates";
import type { CatalogItem } from "@/types/catalog";
import type { Evento, FormaParticipacionInputDto } from "@/types/evento";
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
  formasParticipacion: [],
};

export function getDefaultMesProgramado(evento?: Evento | null) {
  if (evento?.mesProgramado) return evento.mesProgramado;
  if (evento?.fechaInicio) {
    const month = getCalendarMonth(evento.fechaInicio);
    if (month) return month;
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
  return getCategoryByCatalogValue(categorias, categoriaCodigo);
}

export function mapEventoToFormValues(evento: Evento): EventoFormValues {
  const eventoItemsFromFormas =
    evento.formasParticipacion?.flatMap((forma) => {
      const fuente = tipoAvalToFuente(forma.tipoAval);
      if (!fuente) return [];

      return (forma.items ?? []).map((item) => ({
        itemId: item.item.id,
        mes: item.mes,
        presupuesto: Number.parseFloat(item.presupuesto) || 0,
        fuente,
        montoComprometido:
          Number.parseFloat(item.montoComprometido ?? "0") || 0,
        montoEjecutado: Number.parseFloat(item.montoEjecutado ?? "0") || 0,
      }));
    }) ?? [];

  const fallbackEventoItems =
    evento.eventoItems?.map((item) => ({
      itemId: item.item.id,
      mes: item.mes,
      presupuesto: Number.parseFloat(item.presupuesto) || 0,
      fuente: item.fuente ?? "FONDOS_PUBLICOS",
      montoComprometido: Number.parseFloat(item.montoComprometido ?? "0") || 0,
      montoEjecutado: Number.parseFloat(item.montoEjecutado ?? "0") || 0,
    })) ?? [];

  return {
    codigo: evento.codigo ?? "",
    tipoParticipacion:
      normalizeEventoTipoParticipacion(evento.tipoParticipacion) ?? "",
    tipoEvento: normalizeEventoTipoEvento(evento.tipoEvento) ?? "",
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
    alcance: normalizeEventoAlcance(evento.alcance) ?? "",
    fechaInicio: formatDateInput(evento.fechaInicio),
    fechaFin: formatDateInput(evento.fechaFin),
    numEntrenadoresHombres: evento.numEntrenadoresHombres ?? 0,
    numEntrenadoresMujeres: evento.numEntrenadoresMujeres ?? 0,
    numAtletasHombres: evento.numAtletasHombres ?? 0,
    numAtletasMujeres: evento.numAtletasMujeres ?? 0,
    eventoItems:
      eventoItemsFromFormas.length > 0
        ? eventoItemsFromFormas
        : fallbackEventoItems,
    formasParticipacion:
      evento.formasParticipacion?.map((forma) => ({
        id: forma.id,
        tipoAval: forma.tipoAval,
        referencia: forma.referencia ?? "",
        observacion: forma.observacion ?? "",
        numEntrenadoresHombres: forma.numEntrenadoresHombres,
        numEntrenadoresMujeres: forma.numEntrenadoresMujeres,
        numAtletasHombres: forma.numAtletasHombres,
        numAtletasMujeres: forma.numAtletasMujeres,
      })) ?? [],
  };
}

function tipoAvalToFuente(
  tipoAval: "FONDOS_PUBLICOS" | "AUTOGESTION" | "SOLO_RESULTADO",
): "FONDOS_PUBLICOS" | "AUTOGESTION" | undefined {
  return tipoAval === "FONDOS_PUBLICOS" || tipoAval === "AUTOGESTION"
    ? tipoAval
    : undefined;
}

function buildFormasParticipacionInput(
  values: EventoFormValues,
  existingFormas?: Evento["formasParticipacion"],
): FormaParticipacionInputDto[] {
  const eventoItems = values.eventoItems ?? [];
  const existingFormaByTipoAval = new Map(
    (existingFormas ?? []).map((forma) => [forma.tipoAval, forma]),
  );

  return (values.formasParticipacion ?? []).map((forma) => {
    const fuente = tipoAvalToFuente(forma.tipoAval);
    const items = fuente
      ? eventoItems
          .filter((item) => item.fuente === fuente)
          .map((item) => ({
            itemId: item.itemId,
            mes: item.mes,
            presupuesto: item.presupuesto,
          }))
      : [];
    const existingForma = existingFormaByTipoAval.get(forma.tipoAval);
    const resolvedId = forma.id ?? existingForma?.id;

    return {
      ...(resolvedId ? { id: resolvedId } : {}),
      tipoAval: forma.tipoAval,
      referencia: forma.referencia?.trim() || undefined,
      observacion: forma.observacion?.trim() || undefined,
      numEntrenadoresHombres: forma.numEntrenadoresHombres,
      numEntrenadoresMujeres: forma.numEntrenadoresMujeres,
      numAtletasHombres: forma.numAtletasHombres,
      numAtletasMujeres: forma.numAtletasMujeres,
      ...(items.length > 0 ? { items } : {}),
    };
  });
}

export function buildCreateEventoPayload(
  values: EventoFormValues,
): CreateEventoPayload | null {
  const tipoParticipacion =
    normalizeEventoTipoParticipacion(values.tipoParticipacion) ?? undefined;
  const categoriaCodigo = getCanonicalCategory(values.categoriaCodigo);
  const genero = values.genero || undefined;
  const tipoEvento =
    normalizeEventoTipoEvento(values.tipoEvento) ?? values.tipoEvento.trim();
  const alcance =
    values.alcance.trim()
      ? (normalizeEventoAlcance(values.alcance) ?? values.alcance.trim())
      : undefined;
  const lugar = values.lugar?.trim() || undefined;
  const provincia = values.provincia?.trim() || undefined;
  const ciudad = values.ciudad?.trim() || undefined;

  if (!tipoParticipacion || !values.tipoEvento) {
    return null;
  }

  return {
    codigo: values.codigo.trim(),
    tipoParticipacion,
    tipoEvento,
    nombre: values.nombre.trim(),
    ...(lugar ? { lugar } : {}),
    ...(genero ? { genero } : {}),
    disciplinaCodigo: values.disciplinaCodigo,
    ...(categoriaCodigo ? { categoriaCodigo } : {}),
    mesProgramado: values.mesProgramado,
    ...(provincia ? { provincia } : {}),
    ...(ciudad ? { ciudad } : {}),
    pais: values.pais.trim(),
    ...(alcance ? { alcance } : {}),
    fechaInicio: values.fechaInicio?.trim()
      ? formatDateInput(values.fechaInicio)
      : null,
    fechaFin: values.fechaFin?.trim() ? formatDateInput(values.fechaFin) : null,
    formasParticipacion: buildFormasParticipacionInput(values),
  };
}

export function buildUpdateEventoPayloadFromForm(
  values: EventoFormValues,
  disciplinaId?: number,
  categoriaId?: number,
  evento?: Evento,
): UpdateEventoPayload | null {
  const tipoParticipacion =
    normalizeEventoTipoParticipacion(values.tipoParticipacion) ?? undefined;
  const tipoEvento =
    normalizeEventoTipoEvento(values.tipoEvento) ?? values.tipoEvento.trim();
  const genero = values.genero || undefined;
  const lugar = values.lugar?.trim() || undefined;
  const provincia = values.provincia?.trim() || undefined;
  const ciudad = values.ciudad?.trim() || undefined;
  const alcance = values.alcance?.trim()
    ? (normalizeEventoAlcance(values.alcance) ?? values.alcance.trim())
    : null;

  if (!tipoParticipacion || !values.tipoEvento) {
    return null;
  }

  const canonicalCategoriaCodigo = getCanonicalCategory(values.categoriaCodigo);

  return {
    codigo: values.codigo.trim(),
    tipoParticipacion,
    tipoEvento,
    nombre: values.nombre.trim(),
    ...(lugar ? { lugar } : {}),
    ...(genero ? { genero } : {}),
    disciplinaId,
    categoriaId: categoriaId ?? null,
    ...(canonicalCategoriaCodigo ? { categoriaCodigo: canonicalCategoriaCodigo } : {}),
    mesProgramado: values.mesProgramado,
    ...(provincia ? { provincia } : {}),
    ...(ciudad ? { ciudad } : {}),
    pais: values.pais.trim(),
    alcance,
    fechaInicio: values.fechaInicio?.trim()
      ? formatDateInput(values.fechaInicio)
      : null,
    fechaFin: values.fechaFin?.trim() ? formatDateInput(values.fechaFin) : null,
    formasParticipacion: buildFormasParticipacionInput(
      values,
      evento?.formasParticipacion,
    ),
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
