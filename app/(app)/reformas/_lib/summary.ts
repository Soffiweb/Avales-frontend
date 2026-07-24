import type { ReformEventoResumen, ReformResponse } from "@/lib/api/reforms";

/**
 * Primer evento tocado por la reforma: prioriza ediciones de evento
 * (`eventos[]`) y cae a movimientos de presupuesto (`origenes[]`/`destinos[]`).
 */
export function getPrimaryEvento(
  reform: ReformResponse,
): ReformEventoResumen | null {
  return (
    reform.eventos[0]?.evento ??
    reform.origenes[0]?.evento ??
    reform.destinos[0]?.evento ??
    null
  );
}

/** IDs únicos de todos los eventos tocados por la reforma (ediciones + movimientos). */
export function getInvolvedEventoIds(reform: ReformResponse): Set<number> {
  const ids = new Set<number>();
  reform.eventos.forEach((entry) => ids.add(entry.eventoId));
  reform.origenes.forEach((entry) => ids.add(entry.eventoId));
  reform.destinos.forEach((entry) => ids.add(entry.eventoId));
  return ids;
}

/** Nombres y códigos de todos los eventos tocados por la reforma, para búsqueda. */
export function getInvolvedEventoLabels(reform: ReformResponse): string[] {
  const eventos = [
    ...reform.eventos.map((entry) => entry.evento),
    ...reform.origenes.map((entry) => entry.evento),
    ...reform.destinos.map((entry) => entry.evento),
  ];
  return eventos.flatMap((evento) =>
    [evento?.nombre, evento?.codigo].filter(
      (value): value is string => Boolean(value),
    ),
  );
}
