"use client";

import {
  EVENTO_ALCANCE_OPTIONS,
  EVENTO_TAREA_OPTIONS,
  normalizeEventoAlcance,
  normalizeEventoTipoEvento,
} from "@/lib/constants";
import { formatCurrency, formatDateInput } from "@/lib/utils/formatters";
import type { CatalogItemPresupuestario } from "@/types/catalog";
import type { Evento } from "@/types/evento";
import {
  buildEditedEventoPreviewBlock,
  formatPreviewValue,
  getMonthLabel,
  type ReformaPreviewInfoRow,
} from "../_lib/reform-preview";
import { ReformaPreviewBudgetTable, ReformaPreviewInfoTable } from "./reforma-preview-tables";
import type { EventoCambiosResult } from "./evento-cambios-card";

type Props = {
  evento: Evento;
  result?: EventoCambiosResult;
  itemsCatalogo: CatalogItemPresupuestario[];
};

function getOptionLabel(options: { value: string; label: string }[], value?: string | null) {
  if (!value) return "-";
  return options.find((option) => option.value === value)?.label ?? value;
}

/**
 * Snapshot del evento tal como está hoy, con el mismo formato del documento
 * oficial (Excel/PDF de la reforma) para que sea reconocible de un vistazo.
 * Muestra TODOS los campos que "Después" permite editar (no solo los del
 * documento oficial impreso, que es más acotado — ver _lib/reform-preview.ts).
 */
export default function EventoAntesPanel({ evento, result, itemsCatalogo }: Props) {
  if (!result || result.formaParticipacionId == null) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-950/40 dark:text-gray-400">
        Selecciona un tipo de participación en el formulario de la derecha para ver acá sus datos
        actuales.
      </div>
    );
  }

  const previewBlock = buildEditedEventoPreviewBlock({ evento, result }, itemsCatalogo);
  const cambios = result.cambiosPropuestos;

  // previewBlock.currentInfoRows = [Nombre, Provincia (combinada), Mes,
  // Género, N° entrenadores, N° deportistas, Damas, Varones] — se reusan acá
  // Género en adelante (índices 3-7) para no recalcular esa parte; el resto
  // de "Datos informativos" se arma completo con los campos que sí edita
  // "Después" y que el documento oficial no imprime (tipo, alcance, lugar,
  // ciudad, país, fechas). El flag `changed` vive en proposedInfoRows, mismo
  // índice, por eso se combinan acá.
  const generoYParticipantesActual = previewBlock.currentInfoRows.slice(3, 8).map((row, i) => ({
    ...row,
    changed: previewBlock.proposedInfoRows[3 + i]?.changed,
  }));

  const currentInfoRows: ReformaPreviewInfoRow[] = [
    { label: "Nombre", value: formatPreviewValue(evento.nombre), changed: cambios.nombre !== undefined },
    {
      label: "Tipo de evento",
      value: getOptionLabel(
        EVENTO_TAREA_OPTIONS,
        normalizeEventoTipoEvento(evento.tipoEvento) ?? evento.tipoEvento,
      ),
      changed: cambios.tipoEvento !== undefined,
    },
    {
      label: "Alcance",
      value: getOptionLabel(
        EVENTO_ALCANCE_OPTIONS,
        normalizeEventoAlcance(evento.alcance) ?? evento.alcance,
      ),
      changed: cambios.alcance !== undefined,
    },
    { label: "Lugar", value: formatPreviewValue(evento.lugar), changed: cambios.lugar !== undefined },
    { label: "Ciudad", value: formatPreviewValue(evento.ciudad), changed: cambios.ciudad !== undefined },
    {
      label: "Provincia",
      value: formatPreviewValue(evento.provincia),
      changed: cambios.provincia !== undefined,
    },
    { label: "País", value: formatPreviewValue(evento.pais), changed: cambios.pais !== undefined },
    {
      label: "Mes programación",
      value: getMonthLabel(evento.mesProgramado),
      changed: cambios.mesProgramado !== undefined,
    },
    {
      label: "Fecha inicio",
      value: formatPreviewValue(formatDateInput(evento.fechaInicio)),
      changed: cambios.fechaInicio !== undefined,
    },
    {
      label: "Fecha fin",
      value: formatPreviewValue(formatDateInput(evento.fechaFin)),
      changed: cambios.fechaFin !== undefined,
    },
    ...generoYParticipantesActual,
  ];

  const currentBudgetRows = previewBlock.currentBudgetRows.map((row, index) => ({
    ...row,
    changed: previewBlock.proposedBudgetRows[index]?.changed,
  }));

  return (
    <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm dark:border-slate-600">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Antes</p>
      <ReformaPreviewInfoTable title="Datos informativos" rows={currentInfoRows} />
      <ReformaPreviewBudgetTable
        rows={currentBudgetRows}
        total={formatCurrency(previewBlock.currentTotal)}
      />
    </div>
  );
}
